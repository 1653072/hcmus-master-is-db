package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	"fmt"
	"os"
	"path/filepath"

	neo4jdriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	defaultSimilarBookLimit = 10
	maxSimilarBookLimit     = 10
	defaultSeriesBookLimit  = 3
)

// GetSimilarBooks returns up to 10 recommendations for a book.
//
// Recommendation priority:
//  1. Up to 3 nearest active books in the same series.
//  2. Fill remaining slots with weighted similarity:
//     0.50 * category overlap + 0.33 * author overlap + 0.17 * publisher overlap.
func (r *Repository) GetSimilarBooks(ctx context.Context, mongoID string, limit int) ([]domain.SimilarBook, error) {
	query, err := loadSimilarBookNSeriesQuery()
	if err != nil {
		return nil, err
	}

	limit = normalizeSimilarBookLimit(limit)
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

			bookMongoID := similarBookStringValue(mongoIDValue)
			if bookMongoID == "" {
				continue
			}

			books = append(books, domain.SimilarBook{
				MongoID: bookMongoID,
				Title:   similarBookStringValue(titleValue),
				Score:   similarBookFloatValue(scoreValue),
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

func loadSimilarBookNSeriesQuery() (string, error) {
	paths := []string{
		filepath.Join("db", "neo4j", "queries", "similarbook_n_series.cypher"),
		filepath.Join("backend", "db", "neo4j", "queries", "similarbook_n_series.cypher"),
	}

	var lastErr error
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err == nil {
			return string(data), nil
		}
		lastErr = err
	}

	return "", fmt.Errorf("could not read Neo4j query file similarbook_n_series.cypher from db/neo4j/queries or backend/db/neo4j/queries: %w", lastErr)
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

func similarBookStringValue(value any) string {
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

func similarBookFloatValue(value any) float64 {
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
