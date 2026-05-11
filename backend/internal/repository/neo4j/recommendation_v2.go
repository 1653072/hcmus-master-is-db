package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	_ "embed"
	"fmt"
	"sync"

	neo4jdriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

const (
	// FIX 7: tách default và max thành 2 giá trị có nghĩa
	defaultSimilarBookLimitV2 = 5
	maxSimilarBookLimitV2     = 10
	defaultSeriesBookLimitV2  = 3
)

var (
	similarBookNSeriesQuery     string
	similarBookNSeriesQueryErr  error
	similarBookNSeriesQueryOnce sync.Once
)

// FIX 1: dùng embed.FS để bundle file vào binary, tránh sync.Once bị poisoned
//
//go:embed similarbook_n_series.cypher

var similarBookNSeriesQueryBytes []byte

// GetSimilarBooksV2 returns recommendations from Neo4j.
//
// Query source:
//
//	db/neo4j/queries/similarbook_n_series.cypher
//
// Priority:
//  1. Same-series books
//  2. Similarity-based books
type RecommendationRepository struct {
	driver neo4jdriver.DriverWithContext
}

func NewRecommendationRepository(driver neo4jdriver.DriverWithContext) *RecommendationRepository {
	return &RecommendationRepository{driver: driver}
}

// FIX 3: xóa stale relationships trước khi MERGE lại
func (r *RecommendationRepository) UpsertBookNode(ctx context.Context, node domain.BookNode) error {
	cypher := `
MERGE (b:Book {mongo_id: $mongoID})
SET b.title = $title,
    b.is_active = $isActive

WITH b
OPTIONAL MATCH (b)-[rel:BELONGS_TO|WRITTEN_BY|PUBLISHED_BY|HAS_TAG]->()
DELETE rel

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

// FIX 5: guard trước khi DETACH DELETE — trả lỗi nếu còn active books liên kết
func (r *RecommendationRepository) DeleteCategoryNode(ctx context.Context, catID string) error {
	checkCypher := `
MATCH (b:Book)-[:BELONGS_TO]->(c:Category {categoryId: $categoryID})
WHERE b.is_active = true
RETURN count(b) AS bookCount`

	records, err := runQuery(ctx, r.driver, checkCypher, map[string]any{"categoryID": catID})
	if err != nil {
		return err
	}
	if len(records) > 0 {
		countVal, _ := records[0].Get("bookCount")
		if count, ok := countVal.(int64); ok && count > 0 {
			return fmt.Errorf("cannot delete category %s: %d active books still linked", catID, count)
		}
	}

	cypher := `
MATCH (c:Category {categoryId: $categoryID})
DETACH DELETE c`

	return writeQuery(ctx, r.driver, cypher, map[string]any{"categoryID": catID})
}

func (r *RecommendationRepository) GetSeriesBooks(
	ctx context.Context,
	seriesName string,
) ([]domain.SeriesBook, error) {
	cypher := `
MATCH (b:Book {is_active: true})-[rel:IN_SERIES]->(s:Series {name: $seriesName})
RETURN b.mongo_id AS mongo_id,
       b.title AS title,
       rel.sequence_no AS volume_order
ORDER BY rel.sequence_no ASC`

	records, err := runQuery(ctx, r.driver, cypher, map[string]any{
		"seriesName": seriesName,
	})
	if err != nil {
		return nil, err
	}

	result := make([]domain.SeriesBook, 0, len(records))
	for _, rec := range records {
		bookID, _ := rec.Get("mongo_id")
		title, _ := rec.Get("title")
		volumeOrder, _ := rec.Get("volume_order")

		result = append(result, domain.SeriesBook{
			BookID: neo4jStringValueV2(bookID),
			Title:  neo4jStringValueV2(title),
			// FIX 2: dùng neo4jIntValueV2 thay vì ép qua float64
			VolumeOrder: neo4jIntValueV2(volumeOrder),
		})
	}

	return result, nil
}

func (r *RecommendationRepository) GetSimilarBooks(
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

	// FIX 4: seriesLimit tối đa 50% của limit để không lấn hết quota
	params := map[string]any{
		"mongoID":     mongoID,
		"limit":       limit,
		"seriesLimit": calcSeriesLimit(limit),
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

// FIX 1: load từ embedded bytes — không bao giờ bị poisoned do file missing lúc runtime
func loadSimilarBookNSeriesQuery() (string, error) {
	similarBookNSeriesQueryOnce.Do(func() {
		if len(similarBookNSeriesQueryBytes) == 0 {
			similarBookNSeriesQueryErr = fmt.Errorf("embedded similarbook_n_series.cypher is empty")
			return
		}
		similarBookNSeriesQuery = string(similarBookNSeriesQueryBytes)
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

// FIX 4: giới hạn seriesLimit tối đa 50% của limit
func calcSeriesLimit(limit int) int {
	half := limit / 2
	if half == 0 {
		half = 1
	}
	if half < defaultSeriesBookLimitV2 {
		return half
	}
	return defaultSeriesBookLimitV2
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

// FIX 2: hàm riêng cho integer thay vì ép qua float64
func neo4jIntValueV2(value any) int {
	switch v := value.(type) {
	case int64:
		return int(v)
	case int32:
		return int(v)
	case int:
		return v
	case float64:
		return int(v)
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
