package server

import (
	"bookstore/backend/internal/domain"
	"context"
	"sort"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GetSimilarBooks handles GET /api/v1/books/:id/similar (NV-E1).
// Traverses the Neo4j graph using pre-computed SIMILARITY_TO edges or falls back to
// a live weighted traversal: Category(×0.50), Author(×0.33), Publisher(×0.17).
//
// @Summary      Get similar books
// @Description  Return book recommendations based on shared attributes via Neo4j
// @Tags         recommendations
// @Produce      json
// @Param        id     path      string  true   "Book MongoDB ID"
// @Param        limit  query     int     false  "Number of recommendations (default 10)"
// @Success      200    {array}   domain.SimilarBook
// @Router       /books/{id}/similar [get]
func (s *Service) GetSimilarBooks(c *gin.Context) {
	bookID := c.Param("id")
	limit := queryInt(c, "limit", 10)

	books, err := s.recRepo.GetSimilarBooks(c.Request.Context(), bookID, limit)
	if err != nil {
		s.logger.Error("get similar books", zap.Error(err))
		respondInternalError(c, "could not fetch recommendations")
		return
	}

	respondOK(c, s.enrichSimilarBooks(c.Request.Context(), books))
}

// GetSeriesBooks handles GET /api/v1/books/:id/series (NV-E1).
//
// @Summary      Get series books
// @Description  Return all books in the same series, ordered by volume sequence
// @Tags         recommendations
// @Produce      json
// @Param        id   path      string  true  "Book MongoDB ID"
// @Success      200  {array}   domain.SeriesBook
// @Router       /books/{id}/series [get]
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

// GetBestSellers handles GET /api/v1/best-sellers (NV-E2).
// Returns the top-10 bestselling books by units sold in the past 30 days.
// Data is pre-computed daily at 00:00 UTC by BestSellerWorker and cached in Redis
// under the key "books:best_sellers" as a JSON string with a 1-day TTL.
//
// @Summary      Get best sellers
// @Description  Return top-selling books in the last 30 days (Redis cached)
// @Tags         recommendations
// @Produce      json
// @Param        limit  query     int  false  "Number of books (default 10)"
// @Success      200    {array}   domain.BestSellerBook
// @Router       /best-sellers [get]
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

	respondOK(c, s.enrichBestSellerBooks(c.Request.Context(), books))
}

// GetTopDailyViewed handles GET /api/v1/most-viewed/daily (NV-E3).
//
// Algorithm:
//  1. Read current top-N view counters from the daily count sorted set
//     (Redis key "books:most_viewed:daily:count").
//  2. Read the enriched daily data cache
//     (Redis key "books:most_viewed:daily:data").
//  3. If the cached data exists AND its book ID ranking matches the live count set,
//     return the cached data directly (fast path).
//  4. Otherwise fetch book titles from MongoDB for the top-N book IDs, build an
//     enriched response, refresh the data cache, and return the result.
//
// @Summary      Get daily most viewed
// @Description  Return top books viewed today (Real-time Redis ZSET)
// @Tags         recommendations
// @Produce      json
// @Param        limit  query     int  false  "Number of books (default 10)"
// @Success      200    {array}   domain.MostViewedBook
// @Router       /most-viewed/daily [get]
func (s *Service) GetTopDailyViewed(c *gin.Context) {
	if !s.features.RedisMostViewedDaily {
		respondOK(c, []any{})
		return
	}

	ctx := c.Request.Context()
	topN := queryInt(c, "limit", 10)

	// Step 1: Read live count sorted set.
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

	// Step 2: Read data cache.
	cachedData, cacheHit, _ := s.mostViewedRepo.GetDailyTopViewedData(ctx)

	// Step 3: Compare live ranking with cached ranking.
	if cacheHit && dailyRankingMatchesCountSet(cachedData, liveCountEntries) {
		respondOK(c, s.enrichMostViewedWithBookDetails(ctx, cachedData))
		return
	}

	// Step 4: Rankings diverged (or cache is empty) — enrich with book metadata from MongoDB.
	enrichedBooks := s.enrichMostViewedWithBookDetails(ctx, liveCountEntries)

	// Refresh the data cache (best-effort; a failure here is non-fatal).
	if refreshErr := s.mostViewedRepo.SetDailyTopViewedData(ctx, enrichedBooks); refreshErr != nil {
		s.logger.Warn("refresh daily most viewed data cache", zap.Error(refreshErr))
	}

	respondOK(c, enrichedBooks)
}

// GetTopMostViewed30Days handles GET /api/v1/most-viewed/30days (NV-E3).
// Returns the top-10 most-viewed books in the past 30 days, aggregated from MongoDB
// view_event_logs and cached in Redis with a 1-day TTL (refreshed nightly by MostViewedWorker).
//
// @Summary      Get 30-day most viewed
// @Description  Return top books viewed in the last 30 days (Aggregated from MongoDB)
// @Tags         recommendations
// @Produce      json
// @Success      200  {array}  domain.MostViewedBook
// @Router       /most-viewed/30days [get]
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
	respondOK(c, s.enrichMostViewedWithBookDetails(ctx, books))
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// dailyRankingMatchesCountSet returns true when the book IDs in the cached data
// exactly match (same set, same order) the top-N entries from the live count sorted set.
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

func (s *Service) enrichBestSellerBooks(ctx context.Context, entries []domain.BestSellerBook) []domain.BestSellerBook {
	if len(entries) == 0 {
		return entries
	}

	bookIDs := make([]string, 0, len(entries))
	for _, entry := range entries {
		bookIDs = append(bookIDs, entry.BookID)
	}

	books, err := s.bookRepo.GetBooksByIDs(ctx, bookIDs)
	if err != nil {
		s.logger.Warn("fetch book details for best seller enrichment", zap.Error(err))
		return entries
	}

	bookByID := make(map[string]*domain.Book, len(books))
	for _, book := range books {
		bookByID[book.ID] = book
	}

	enriched := make([]domain.BestSellerBook, 0, len(entries))
	for _, entry := range entries {
		book := bookByID[entry.BookID]
		if book == nil {
			enriched = append(enriched, entry)
			continue
		}

		entry.Title = firstNonEmptyString(book.Name, entry.Title)
		entry.Price = book.Pricing.Price
		entry.Publisher = book.Publisher
		entry.Category = book.Category
		entry.Authors = book.Authors
		entry.Images = book.Images
		entry.CoverURL = primaryBookImageURL(book.Images)
		enriched = append(enriched, entry)
	}

	return enriched
}

func (s *Service) enrichMostViewedWithBookDetails(ctx context.Context, entries []domain.MostViewedBook) []domain.MostViewedBook {
	if len(entries) == 0 {
		return entries
	}

	bookIDs := make([]string, 0, len(entries))
	for _, entry := range entries {
		bookIDs = append(bookIDs, entry.BookID)
	}

	books, err := s.bookRepo.GetBooksByIDs(ctx, bookIDs)
	if err != nil {
		s.logger.Warn("fetch book details for most viewed enrichment", zap.Error(err))
		return entries
	}

	bookByID := make(map[string]*domain.Book, len(books))
	for _, book := range books {
		bookByID[book.ID] = book
	}

	enriched := make([]domain.MostViewedBook, 0, len(entries))
	for _, entry := range entries {
		book := bookByID[entry.BookID]
		if book == nil {
			enriched = append(enriched, entry)
			continue
		}

		entry.Title = firstNonEmptyString(book.Name, entry.Title)
		entry.Price = book.Pricing.Price
		entry.Publisher = book.Publisher
		entry.Category = book.Category
		entry.Authors = book.Authors
		entry.Images = book.Images
		entry.CoverURL = primaryBookImageURL(book.Images)
		enriched = append(enriched, entry)
	}

	// Sort by view count descending to maintain ranking order.
	sort.Slice(enriched, func(i, j int) bool {
		return enriched[i].ViewCount > enriched[j].ViewCount
	})
	return enriched
}

func (s *Service) enrichSimilarBooks(ctx context.Context, entries []domain.SimilarBook) []domain.SimilarBook {
	if len(entries) == 0 {
		return entries
	}

	bookIDs := make([]string, 0, len(entries))
	for _, entry := range entries {
		bookIDs = append(bookIDs, entry.BookID)
	}

	books, err := s.bookRepo.GetBooksByIDs(ctx, bookIDs)
	if err != nil {
		s.logger.Warn("fetch book details for similar recommendations", zap.Error(err))
		return entries
	}

	bookByID := make(map[string]*domain.Book, len(books))
	for _, book := range books {
		bookByID[book.ID] = book
	}

	enriched := make([]domain.SimilarBook, 0, len(entries))
	for _, entry := range entries {
		book := bookByID[entry.BookID]
		if book == nil {
			enriched = append(enriched, entry)
			continue
		}

		entry.Title = firstNonEmptyString(book.Name, entry.Title)
		entry.Price = book.Pricing.Price
		entry.Publisher = book.Publisher
		entry.Category = book.Category
		entry.Authors = book.Authors
		entry.Images = book.Images
		entry.CoverURL = primaryBookImageURL(book.Images)
		enriched = append(enriched, entry)
	}

	return enriched
}

func primaryBookImageURL(images []domain.BookImage) string {
	for _, image := range images {
		if image.IsPrimary && image.URL != "" {
			return image.URL
		}
	}
	if len(images) > 0 {
		return images[0].URL
	}
	return ""
}

func firstNonEmptyString(primary, fallback string) string {
	if primary != "" {
		return primary
	}
	return fallback
}
