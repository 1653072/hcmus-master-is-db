package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	neo4jdriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	defaultSimilarBookLimitV2 = 10
	maxSimilarBookLimitV2     = 10
	defaultSeriesBookLimitV2  = 3
)

var (
	similarBookNSeriesQuery     string
	similarBookNSeriesQueryErr  error
	similarBookNSeriesQueryOnce sync.Once
)

// GetSimilarBooksV2 returns recommendations from Neo4j.
//
// Query source:
//   db/neo4j/queries/similarbook_n_series.cypher
//
// Priority:
//   1. Same-series books
//   2. Similarity-based books
func (r *RecommendationRepository) GetSimilarBooksV2(
	ctx context.Context,
	mongoID string,
	limit int,
) ([]domain.SimilarBook, error) {

	if mongoID == "" {
		return nil, fmt.Errorf("mongoID is required")
	}

	limit = normalizeSimilarBookLimitV2(limit)

	query, err := loadSimilarBookNSeriesQuery()
	if err != nil {
		return nil, err
	}

	params := map[string]any{
		"mongoID":     mongoID,
		"limit":       limit,
		"seriesLimit": minSimilarBookIntV2(defaultSeriesBookLimitV2, limit),
	}

	session := r.driver.NewSession(ctx, neo4jdriver.SessionConfig{
		AccessMode: neo4jdriver.AccessModeRead,
	})
	defer session.Close(ctx)

	result, err := session.ExecuteRead(
		ctx,
		func(tx neo4jdriver.ManagedTransaction) (any, error) {

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

				bookMongoID := neo4jStringValueV2(mongoIDValue)
				if bookMongoID == "" {
					continue
				}

				books = append(books, domain.SimilarBook{
					BookID: bookMongoID,
					Title:  neo4jStringValueV2(titleValue),
					Score:  neo4jFloatValueV2(scoreValue),
				})
			}

			if err := records.Err(); err != nil {
				return nil, err
			}

			return books, nil
		},
	)

	if err != nil {
		return nil, err
	}

	books, ok := result.([]domain.SimilarBook)
	if !ok {
		return nil, fmt.Errorf(
			"unexpected GetSimilarBooksV2 result type %T",
			result,
		)
	}

	return books, nil
}

func loadSimilarBookNSeriesQuery() (string, error) {
	similarBookNSeriesQueryOnce.Do(func() {

		paths := []string{
			filepath.Join(
				"db",
				"neo4j",
				"queries",
				"similarbook_n_series.cypher",
			),
			filepath.Join(
				"backend",
				"db",
				"neo4j",
				"queries",
				"similarbook_n_series.cypher",
			),
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
			"could not read similarbook_n_series.cypher: %w",
			lastErr,
		)
	})

	if similarBookNSeriesQueryErr != nil {
		return "", similarBookNSeriesQueryErr
	}

	return similarBookNSeriesQuery, nil
}

func normalizeSimilarBookLimitV2(limit int) int {
	if limit <= 0 {
		return defaultSimilarBookLimitV2
	}

	if limit > maxSimilarBookLimitV2 {
		return maxSimilarBookLimitV2
	}

	return limit
}

func neo4jStringValueV2(value any) string {
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

func neo4jFloatValueV2(value any) float64 {
	switch v := value.(type) {
	case float64:
		return v

	case float32:
		return float64(v)

	case int:
		return float64(v)

	case int32:
		return float64(v)

	case int64:
		return float64(v)

	default:
		return 0
	}
}

func minSimilarBookIntV2(a int, b int) int {
	if a < b {
		return a
	}

	return b
}
