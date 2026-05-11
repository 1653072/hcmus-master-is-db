package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"sync"

	"github.com/gin-gonic/gin"
	neo4jdriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.uber.org/zap"
)

const (
	defaultSimilarBookLimit = 10
	maxSimilarBookLimit     = 10
	defaultSeriesBookLimit  = 3
)

var (
	similarBookNSeriesQuery     string
	similarBookNSeriesQueryErr  error
	similarBookNSeriesQueryOnce sync.Once
)

// GetSimilarBooks handles GET /api/v1/books/:id/similar (NV-E1).
// This server-level version reads db/neo4j/queries/similarbook_n_series.cypher
// and executes the Neo4j query directly from the Service.
//
// IMPORTANT: Service must contain a Neo4j driver field:
//
//     neo4jDriver neo4jdriver.DriverWithContext
//
// and cmd/server.go must inject the connected Neo4j driver into Service.
//
// @Summary      Get similar books
// @Description  Return book recommendations based on same series first, then weighted similarity via Neo4j
// @Tags         recommendations
// @Produce      json
// @Param        id     path      string  true   "Book MongoDB ID"
// @Param        limit  query     int     false  "Number of recommendations (default 10, max 10)"
// @Success      200    {array}   domain.SimilarBook
// @Router       /books/{id}/similar [get]
func (s *Service) GetSimilarBooks(c *gin.Context) {
	bookID := c.Param("id")
	if bookID == "" {
		respondBadRequest(c, "book id is required")
		return
	}

	limit := normalizeSimilarBookLimit(queryInt(c, "limit", defaultSimilarBookLimit))
	books, err := s.getSimilarBooksFromNeo4j(c.Request.Context(), bookID, limit)
	if err != nil {
		s.logger.Error("get similar books from neo4j", zap.Error(err))
		respondInternalError(c, "could not fetch recommendations")
		return
	}

	respondOK(c, books)
}

func (s *Service) getSimilarBooksFromNeo4j(ctx context.Context, mongoID string, limit int) ([]domain.SimilarBook, error) {
	query, err := loadSimilarBookNSeriesQuery()
	if err != nil {
		return nil, err
	}

	params := map[string]any{
		"mongoID":     mongoID,
		"limit":       limit,
		"seriesLimit": minSimilarBookInt(defaultSeriesBookLimit, limit),
	}

	session := s.neo4jDriver.NewSession(ctx, neo4jdriver.SessionConfig{
		AccessMode: neo4jdriver.AccessModeRead,
	})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(ctx, func(tx neo4jdriver.ManagedTransaction) (any, error) {
		records, err := tx.Run(ctx, query, params)
		if err != nil {
			return nil, err
		}

		books := make([]domain.SimilarBook, 0, limit)
		for records.Next(ctx) {
			record := records.Record()

			mongoIDValue, _ := record.Get("mongo_id")
			titleValue, _ := record.Get("title")
			scoreValue, _ := record.Get("score")

			bookMongoID := neo4jStringValue(mongoIDValue)
			if bookMongoID == "" {
				continue
			}

			books = append(books, domain.SimilarBook{
				MongoID: bookMongoID,
				Title:   neo4jStringValue(titleValue),
				Score:   neo4jFloatValue(scoreValue),
			})
		}

		if err := records.Err(); err != nil {
			return nil, err
		}
		return books, nil
	})
	if err != nil {
		return nil, err
	}

	books, ok := result.([]domain.SimilarBook)
	if !ok {
		return nil, fmt.Errorf("unexpected GetSimilarBooks result type %T", result)
	}
	return books, nil
}

// GetSeriesBooks handles GET /api/v1/books/:id/series (NV-E1).
// This keeps the original behavior: it asks MongoDB for the source book's series,
// then uses the existing recommendation repository for series traversal.
func (s *Service) GetSeriesBooks(c *gin.Context) {
	bookID := c.Param("id")
	ctx := c.Request.Context()

	book, err := s.bookRepo.GetBookByID(ctx, bookID)
	if err != nil || book == nil {
		respondNotFound(c, "book not found")
		return
	}
	if book.Series.SeriesName == "" {
		respondOK(c, []any{})
		return
	}

	seriesBooks, err := s.recRepo.GetSeriesBooks(ctx, book.Series.SeriesName)
	if err != nil {
		s.logger.Error("get series books", zap.Error(err))
		respondInternalError(c, "could not fetch series")
		return
	}

	respondOK(c, seriesBooks)
}

func (s *Service) GetBestSellers(c *gin.Context) {
	if !s.features.RedisBestSellers {
		respondOK(c, []any{})
		return
	}

	topN := queryInt(c, "limit", 10)
	books, err := s.bestSellerRepo.GetTopBestSellers(c.Request.Context(), topN)
	if err != nil {
		s.logger.Error("get best sellers", zap.Error(err))
		respondInternalError(c, "could not fetch best sellers")
		return
	}

	respondOK(c, books)
}

func (s *Service) GetTopDailyViewed(c *gin.Context) {
	if !s.features.RedisMostViewedDaily {
		respondOK(c, []any{})
		return
	}

	ctx := c.Request.Context()
	topN := queryInt(c, "limit", 10)

	liveCountEntries, err := s.mostViewedRepo.GetTopDailyViewedFromCountSet(ctx, topN)
	if err != nil {
		s.logger.Error("get top daily viewed from count set", zap.Error(err))
		respondInternalError(c, "could not fetch daily most viewed")
		return
	}
	if len(liveCountEntries) == 0 {
		respondOK(c, []any{})
		return
	}

	cachedData, cacheHit, _ := s.mostViewedRepo.GetDailyTopViewedData(ctx)
	if cacheHit && dailyRankingMatchesCountSet(cachedData, liveCountEntries) {
		respondOK(c, cachedData)
		return
	}

	enrichedBooks := s.enrichMostViewedWithTitles(ctx, liveCountEntries)
	if refreshErr := s.mostViewedRepo.SetDailyTopViewedData(ctx, enrichedBooks); refreshErr != nil {
		s.logger.Warn("refresh daily most viewed data cache", zap.Error(refreshErr))
	}

	respondOK(c, enrichedBooks)
}

func (s *Service) GetTopMostViewed30Days(c *gin.Context) {
	if !s.features.RedisMostViewed30D {
		respondOK(c, []any{})
		return
	}

	ctx := c.Request.Context()
	books, hit, _ := s.mostViewedRepo.Get30DaysTopViewedData(ctx)
	if !hit {
		respondOK(c, []any{})
		return
	}
	respondOK(c, books)
}

func dailyRankingMatchesCountSet(cached, liveEntries []domain.MostViewedBook) bool {
	if len(cached) != len(liveEntries) {
		return false
	}
	for index := range liveEntries {
		if cached[index].BookID != liveEntries[index].BookID {
			return false
		}
	}
	return true
}

func (s *Service) enrichMostViewedWithTitles(ctx context.Context, entries []domain.MostViewedBook) []domain.MostViewedBook {
	bookIDs := make([]string, 0, len(entries))
	for _, entry := range entries {
		bookIDs = append(bookIDs, entry.BookID)
	}

	books, err := s.bookRepo.GetBooksByIDs(ctx, bookIDs)
	if err != nil {
		s.logger.Warn("fetch book titles for most viewed enrichment", zap.Error(err))
		return entries
	}

	titleByID := make(map[string]string, len(books))
	for _, book := range books {
		titleByID[book.ID] = book.Name
	}

	enriched := make([]domain.MostViewedBook, 0, len(entries))
	for _, entry := range entries {
		enriched = append(enriched, domain.MostViewedBook{
			BookID:    entry.BookID,
			Title:     titleByID[entry.BookID],
			ViewCount: entry.ViewCount,
		})
	}

	sort.Slice(enriched, func(i, j int) bool {
		return enriched[i].ViewCount > enriched[j].ViewCount
	})
	return enriched
}

func loadSimilarBookNSeriesQuery() (string, error) {
	similarBookNSeriesQueryOnce.Do(func() {
		paths := []string{
			filepath.Join("db", "neo4j", "queries", "similarbook_n_series.cypher"),
			filepath.Join("backend", "db", "neo4j", "queries", "similarbook_n_series.cypher"),
		}

		var lastErr error
		for _, path := range paths {
			data, err := os.ReadFile(path)
			if err == nil {
				similarBookNSeriesQuery = string(data)
				return
			}
			lastErr = err
		}

		similarBookNSeriesQueryErr = fmt.Errorf(
			"could not read Neo4j query file similarbook_n_series.cypher from db/neo4j/queries or backend/db/neo4j/queries: %w",
			lastErr,
		)
	})

	if similarBookNSeriesQueryErr != nil {
		return "", similarBookNSeriesQueryErr
	}
	return similarBookNSeriesQuery, nil
}

func normalizeSimilarBookLimit(limit int) int {
	if limit <= 0 {
		return defaultSimilarBookLimit
	}
	if limit > maxSimilarBookLimit {
		return maxSimilarBookLimit
	}
	return limit
}

func neo4jStringValue(value any) string {
	if value == nil {
		return ""
	}
	switch v := value.(type) {
	case string:
		return v
	case fmt.Stringer:
		return v.String()
	default:
		return fmt.Sprintf("%v", v)
	}
}

func neo4jFloatValue(value any) float64 {
	switch v := value.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int64:
		return float64(v)
	case int32:
		return float64(v)
	default:
		return 0
	}
}

func minSimilarBookInt(a int, b int) int {
	if a < b {
		return a
	}
	return b
}
