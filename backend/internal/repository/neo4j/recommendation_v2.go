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
	defaultSimilarBookLimit = 10
	maxSimilarBookLimit     = 10
	defaultSeriesBookLimit  = 3
)

var (
	similarBookNSeriesQuery     string
	similarBookNSeriesQueryErr  error
	similarBookNSeriesQueryOnce sync.Once
)

// GetSimilarBooksV2 returns recommendations from Neo4j.
// Priority: same series first, then weighted similarity.
func (r *Repository) GetSimilarBooksV2(ctx context.Context, mongoID string, limit int) ([]domain.SimilarBook, error) {
	if mongoID == "" {
		return nil, fmt.Errorf("mongoID is required")
	}

	limit = normalizeSimilarBookLimit(limit)

	query, err := loadSimilarBookNSeriesQuery()
	if err != nil {
		return nil, err
	}

	params := map[string]any{
		"mongoID":     mongoID,
		"limit":       limit,
		"seriesLimit": minSimilarBookInt(defaultSeriesBookLimit, limit),
	}

	session := r.driver.NewSession(ctx, neo4jdriver.SessionConfig{
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
		return nil, fmt.Errorf("unexpected GetSimilarBooksV2 result type %T", result)
	}

	return books, nil
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
			"could not read Neo4j query file similarbook_n_series.cypher: %w",
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
