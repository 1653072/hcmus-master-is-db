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
	similarBookNSeriesQuery      string
	similarBookNSeriesQueryMutex sync.RWMutex
)

// RecommendationRepository stores and reads recommendation graph data from Neo4j.
type RecommendationRepository struct {
	driver neo4jdriver.DriverWithContext
}

func NewRecommendationRepository(driver neo4jdriver.DriverWithContext) *RecommendationRepository {
	return &RecommendationRepository{driver: driver}
}

// UpsertBookNode creates or updates a Book node and refreshes all structural
// relationships owned by that book. Old relationships are removed first so the
// Neo4j graph stays consistent when book metadata changes in MongoDB.
func (r *RecommendationRepository) UpsertBookNode(ctx context.Context, node domain.BookNode) error {
	cypher := `
MERGE (b:Book {mongo_id: $mongoID})
SET b.title = $title,
    b.is_active = $isActive,
    b.status = CASE WHEN $isActive THEN 'active' ELSE 'inactive' END

WITH b
OPTIONAL MATCH (b)-[oldRel:WRITTEN_BY|BELONGS_TO|PUBLISHED_BY|HAS_TAG|IN_SERIES]->()
DELETE oldRel

WITH b
FOREACH (categoryID IN [x IN $categories WHERE x IS NOT NULL AND trim(toString(x)) <> ''] |
  MERGE (c:Category {categoryId: toString(categoryID)})
  SET c.name = coalesce(c.name, toString(categoryID))
  MERGE (b)-[:BELONGS_TO]->(c)
)

WITH b
FOREACH (authorName IN [x IN $authors WHERE x IS NOT NULL AND trim(toString(x)) <> ''] |
  MERGE (a:Author {name: toString(authorName)})
  MERGE (b)-[:WRITTEN_BY]->(a)
)

WITH b
FOREACH (_ IN CASE WHEN $publisher <> '' THEN [1] ELSE [] END |
  MERGE (p:Publisher {name: $publisher})
  MERGE (b)-[:PUBLISHED_BY]->(p)
)

WITH b
FOREACH (tagName IN [x IN $tags WHERE x IS NOT NULL AND trim(toString(x)) <> ''] |
  MERGE (t:Tag {name: toString(tagName)})
  MERGE (b)-[:HAS_TAG]->(t)
)

WITH b
FOREACH (_ IN CASE WHEN $seriesName <> '' THEN [1] ELSE [] END |
  MERGE (s:Series {name: $seriesName})
  MERGE (b)-[rel:IN_SERIES]->(s)
  SET rel.sequence_no = $sequenceNo
)`

	params := map[string]any{
		"mongoID":    node.MongoID,
		"title":      node.Title,
		"isActive":   node.IsActive,
		"categories": node.Categories,
		"authors":    node.Authors,
		"publisher":  node.Publisher,
		"tags":       node.Tags,
		"seriesName": node.SeriesName,
		"sequenceNo": node.SequenceNo,
	}

	if err := writeQuery(ctx, r.driver, cypher, params); err != nil {
		return err
	}

	return r.computeSimilarityEdgesForBook(ctx, node.MongoID)
}

// DeleteBookNode marks a Book node as inactive and removes outgoing similarity
// edges so the book is no longer recommended as an active candidate.
func (r *RecommendationRepository) DeleteBookNode(ctx context.Context, mongoID string) error {
	cypher := `
MATCH (b:Book {mongo_id: $mongoID})
SET b.is_active = false,
    b.status = 'inactive'
WITH b
OPTIONAL MATCH (b)-[rel:SIMILARITY_TO]->()
DELETE rel`

	return writeQuery(ctx, r.driver, cypher, map[string]any{"mongoID": mongoID})
}

// UpsertCategoryNode creates or updates a Category node and refreshes its parent
// relationship. Old parent relationships are removed first to prevent stale
// category hierarchy edges.
func (r *RecommendationRepository) UpsertCategoryNode(ctx context.Context, cat *domain.Category) error {
	if cat == nil {
		return fmt.Errorf("category is required")
	}

	cypher := `
MERGE (c:Category {categoryId: $categoryID})
SET c.name = $name,
    c.slug = $slug
WITH c
OPTIONAL MATCH (:Category)-[oldParent:PARENT_OF]->(c)
DELETE oldParent
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

// DeleteCategoryNode removes a Category only when no active Book still belongs
// to it. This avoids accidentally deleting BELONGS_TO links from books.
func (r *RecommendationRepository) DeleteCategoryNode(ctx context.Context, catID string) error {
	checkCypher := `
MATCH (c:Category {categoryId: $categoryID})
OPTIONAL MATCH (c)<-[:BELONGS_TO]-(b:Book {is_active: true})
RETURN count(b) AS linked_books`

	records, err := runQuery(ctx, r.driver, checkCypher, map[string]any{"categoryID": catID})
	if err != nil {
		return err
	}
	if len(records) == 0 {
		return nil
	}

	linkedBooksValue, _ := records[0].Get("linked_books")
	linkedBooks, err := neo4jIntValueV2(linkedBooksValue)
	if err != nil {
		return err
	}
	if linkedBooks > 0 {
		return fmt.Errorf("cannot delete category %q: %d active book(s) still belong to it", catID, linkedBooks)
	}

	deleteCypher := `
MATCH (c:Category {categoryId: $categoryID})
OPTIONAL MATCH (c)-[childRel:PARENT_OF]->(:Category)
DELETE childRel
WITH c
OPTIONAL MATCH (:Category)-[parentRel:PARENT_OF]->(c)
DELETE parentRel
WITH c
DELETE c`

	return writeQuery(ctx, r.driver, deleteCypher, map[string]any{"categoryID": catID})
}

func (r *RecommendationRepository) GetSeriesBooks(ctx context.Context, seriesName string) ([]domain.SeriesBook, error) {
	cypher := `
MATCH (b:Book {is_active: true})-[rel:IN_SERIES]->(s:Series {name: $seriesName})
RETURN b.mongo_id AS mongo_id,
       b.title AS title,
       rel.sequence_no AS volume_order
ORDER BY rel.sequence_no ASC`

	records, err := runQuery(ctx, r.driver, cypher, map[string]any{"seriesName": seriesName})
	if err != nil {
		return nil, err
	}

	result := make([]domain.SeriesBook, 0, len(records))
	for _, rec := range records {
		bookID, _ := rec.Get("mongo_id")
		title, _ := rec.Get("title")
		volumeOrderValue, _ := rec.Get("volume_order")

		volumeOrder, err := neo4jIntValueV2(volumeOrderValue)
		if err != nil {
			return nil, fmt.Errorf("invalid volume_order for book %q: %w", neo4jStringValueV2(bookID), err)
		}

		result = append(result, domain.SeriesBook{
			BookID:      neo4jStringValueV2(bookID),
			Title:       neo4jStringValueV2(title),
			VolumeOrder: volumeOrder,
		})
	}

	return result, nil
}

func (r *RecommendationRepository) GetSimilarBooks(ctx context.Context, mongoID string, limit int) ([]domain.SimilarBook, error) {
	if mongoID == "" {
		return nil, fmt.Errorf("mongoID is required")
	}

	limit = normalizeSimilarBookLimitV2(limit)

	query, err := loadSimilarBookNSeriesQuery()
	if err != nil {
		return nil, err
	}

	params := map[string]any{
		"mongoID":      mongoID,
		"limit":        limit,
		"seriesLimit":  seriesBookQuotaV2(limit),
		"similarLimit": limit,
	}

	session := r.driver.NewSession(ctx, neo4jdriver.SessionConfig{AccessMode: neo4jdriver.AccessModeRead})
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

			bookMongoID := neo4jStringValueV2(mongoIDValue)
			if bookMongoID == "" {
				continue
			}

			score, err := neo4jFloatValueV2(scoreValue)
			if err != nil {
				return nil, fmt.Errorf("invalid similarity score for book %q: %w", bookMongoID, err)
			}

			books = append(books, domain.SimilarBook{
				BookID: bookMongoID,
				Title:  neo4jStringValueV2(titleValue),
				Score:  score,
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

// computeSimilarityEdgesForBook recomputes outgoing SIMILARITY_TO edges for one
// book after its structural relationships have changed.
func (r *RecommendationRepository) computeSimilarityEdgesForBook(ctx context.Context, mongoID string) error {
	if mongoID == "" {
		return fmt.Errorf("mongoID is required")
	}

	cypher := `
MATCH (source:Book {mongo_id: $mongoID})
OPTIONAL MATCH (source)-[oldRel:SIMILARITY_TO]->()
DELETE oldRel
WITH source
MATCH (target:Book {is_active: true})
WHERE target.mongo_id <> source.mongo_id
OPTIONAL MATCH (source)-[:BELONGS_TO]->(category:Category)<-[:BELONGS_TO]-(target)
WITH source, target, count(DISTINCT category) AS categoryOverlap
OPTIONAL MATCH (source)-[:WRITTEN_BY]->(author:Author)<-[:WRITTEN_BY]-(target)
WITH source, target, categoryOverlap, count(DISTINCT author) AS authorOverlap
OPTIONAL MATCH (source)-[:PUBLISHED_BY]->(publisher:Publisher)<-[:PUBLISHED_BY]-(target)
WITH source, target, categoryOverlap, authorOverlap, count(DISTINCT publisher) AS publisherOverlap
OPTIONAL MATCH (source)-[:HAS_TAG]->(tag:Tag)<-[:HAS_TAG]-(target)
WITH source, target, categoryOverlap, authorOverlap, publisherOverlap, count(DISTINCT tag) AS tagOverlap
OPTIONAL MATCH (source)-[:IN_SERIES]->(series:Series)<-[:IN_SERIES]-(target)
WITH source,
     target,
     (0.50 * categoryOverlap) +
     (0.33 * authorOverlap) +
     (0.17 * publisherOverlap) +
     (0.05 * tagOverlap) +
     CASE WHEN count(DISTINCT series) > 0 THEN 0.25 ELSE 0 END AS score
WHERE score > 0
MERGE (source)-[rel:SIMILARITY_TO]->(target)
SET rel.score = score,
    rel.computedAt = datetime()`

	return writeQuery(ctx, r.driver, cypher, map[string]any{"mongoID": mongoID})
}

func loadSimilarBookNSeriesQuery() (string, error) {
	similarBookNSeriesQueryMutex.RLock()
	cachedQuery := similarBookNSeriesQuery
	similarBookNSeriesQueryMutex.RUnlock()
	if cachedQuery != "" {
		return cachedQuery, nil
	}

	paths := []string{
		filepath.Join("db", "neo4j", "queries", "similarbook_n_series.cypher"),
		filepath.Join("backend", "db", "neo4j", "queries", "similarbook_n_series.cypher"),
		filepath.Join("internal", "repository", "neo4j", "similarbook_n_series.cypher"),
	}

	var lastErr error
	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err == nil {
			query := string(data)
			similarBookNSeriesQueryMutex.Lock()
			similarBookNSeriesQuery = query
			similarBookNSeriesQueryMutex.Unlock()
			return query, nil
		}
		lastErr = err
	}

	return "", fmt.Errorf("could not read similarbook_n_series.cypher: %w", lastErr)
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

// seriesBookQuotaV2 reserves at least one slot for similarity-based results when
// the caller asks for more than one recommendation.
func seriesBookQuotaV2(limit int) int {
	if limit <= 1 {
		return 0
	}
	quota := defaultSeriesBookLimitV2
	if quota >= limit {
		return limit - 1
	}
	return quota
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

func neo4jFloatValueV2(value any) (float64, error) {
	switch v := value.(type) {
	case float64:
		return v, nil
	case float32:
		return float64(v), nil
	case int:
		return float64(v), nil
	case int8:
		return float64(v), nil
	case int16:
		return float64(v), nil
	case int32:
		return float64(v), nil
	case int64:
		return float64(v), nil
	case uint:
		return float64(v), nil
	case uint8:
		return float64(v), nil
	case uint16:
		return float64(v), nil
	case uint32:
		return float64(v), nil
	case uint64:
		return float64(v), nil
	default:
		return 0, fmt.Errorf("unsupported numeric type %T", value)
	}
}

func neo4jIntValueV2(value any) (int, error) {
	switch v := value.(type) {
	case int:
		return v, nil
	case int8:
		return int(v), nil
	case int16:
		return int(v), nil
	case int32:
		return int(v), nil
	case int64:
		return int(v), nil
	case uint:
		return int(v), nil
	case uint8:
		return int(v), nil
	case uint16:
		return int(v), nil
	case uint32:
		return int(v), nil
	case uint64:
		return int(v), nil
	case float32:
		return int(v), nil
	case float64:
		return int(v), nil
	default:
		return 0, fmt.Errorf("unsupported integer type %T", value)
	}
}
