package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sync"


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

type RecommendationRepository struct {
	driver neo4j.DriverWithContext
}
func (r *RecommendationRepository) UpsertBookNode(ctx context.Context, node domain.BookNode) error {
	cypher := `
MERGE (b:Book {mongo_id: $mongoID})
SET b.title = $title,
    b.is_active = $isActive

WITH b
UNWIND $categories AS categoryName
  MERGE (c:Category {name: categoryName})
  MERGE (b)-[:BELONGS_TO]->(c)

WITH b
UNWIND $authors AS authorName
  MERGE (a:Author {name: authorName})
  MERGE (b)-[:WRITTEN_BY]->(a)

WITH b
MERGE (p:Publisher {name: $publisher})
MERGE (b)-[:PUBLISHED_BY]->(p)

WITH b
UNWIND $tags AS tagName
  MERGE (t:Tag {name: tagName})
  MERGE (b)-[:HAS_TAG]->(t)

WITH b
FOREACH (_ IN CASE WHEN $seriesName <> '' THEN [1] ELSE [] END |
  MERGE (s:Series {name: $seriesName})
  MERGE (b)-[:IN_SERIES {sequence_no: $sequenceNo}]->(s)
)`

	return writeQuery(ctx, r.driver, cypher, map[string]any{
		"mongoID":    node.MongoID,
		"title":      node.Title,
		"isActive":   node.IsActive,
		"categories": node.Categories,
		"authors":    node.Authors,
		"publisher":  node.Publisher,
		"tags":       node.Tags,
		"seriesName": node.SeriesName,
		"sequenceNo": node.SequenceNo,
	})
}

// DeleteBookNode marks a Book node as inactive (soft-delete in the graph).
func (r *RecommendationRepository) DeleteBookNode(ctx context.Context, mongoID string) error {
	cypher := `
MATCH (b:Book {mongo_id: $mongoID})
SET b.is_active = false`

	return writeQuery(ctx, r.driver, cypher, map[string]any{"mongoID": mongoID})
}

// UpsertCategoryNode creates or updates a Category node and its PARENT_OF relationship in Neo4j.
// Keeps the graph in sync with MongoDB category mutations.
func (r *RecommendationRepository) UpsertCategoryNode(ctx context.Context, cat *domain.Category) error {
	cypher := `
MERGE (c:Category {categoryId: $categoryID})
SET c.name = $name,
    c.slug  = $slug
WITH c
FOREACH (_ IN CASE WHEN $parentID <> '' THEN [1] ELSE [] END |
  MERGE (p:Category {categoryId: $parentID})
  MERGE (p)-[:PARENT_OF]->(c)
)`

	return writeQuery(ctx, r.driver, cypher, map[string]any{
		"categoryID": cat.ID,
		"name":       cat.CategoryName,
		"slug":       cat.Slug,
		"parentID":   cat.ParentCategory,
	})
}

// DeleteCategoryNode detaches and removes a Category node from the graph.
func (r *RecommendationRepository) DeleteCategoryNode(ctx context.Context, catID string) error {
	cypher := `
MATCH (c:Category {categoryId: $categoryID})
DETACH DELETE c`

	return writeQuery(ctx, r.driver, cypher, map[string]any{"categoryID": catID})
}


func NewRecommendationRepository(driver neo4j.DriverWithContext) *RecommendationRepository {
	return &RecommendationRepository{driver: driver}
}

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
