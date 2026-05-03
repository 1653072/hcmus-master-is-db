package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	"strings"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// RecommendationRepository implements domain.RecommendationRepository against Neo4j.
// Only Book nodes and their structural relationships are stored in the graph.
// No User nodes exist; user behaviour events are recorded in MongoDB only.
type RecommendationRepository struct {
	driver neo4j.DriverWithContext
}

// NewRecommendationRepository creates a RecommendationRepository.
func NewRecommendationRepository(driver neo4j.DriverWithContext) *RecommendationRepository {
	return &RecommendationRepository{driver: driver}
}

// GetSimilarBooks returns the top-N books most similar to mongoID.
// It first checks for pre-computed SIMILARITY_TO edges; if none exist it falls back
// to a live weighted traversal over shared Category, Author, and Publisher nodes.
func (r *RecommendationRepository) GetSimilarBooks(ctx context.Context, mongoID string, limit int) ([]domain.SimilarBook, error) {
	cypher := `
MATCH (source:Book {mongo_id: $mongoID, is_active: true})

// Use pre-computed SIMILARITY_TO edges first (fast path)
OPTIONAL MATCH (source)-[sim_rel:SIMILARITY_TO]->(precomputed:Book {is_active: true})
WITH source, collect({book: precomputed, score: sim_rel.score}) AS precomputedSimilar

// Fall back to live weighted traversal when no pre-computed edges exist
CALL {
  WITH source, precomputedSimilar
  WITH source, precomputedSimilar
  WHERE size(precomputedSimilar) = 0

  OPTIONAL MATCH (source)-[:BELONGS_TO]->(cat:Category)<-[:BELONGS_TO]-(sim:Book {is_active: true})
    WHERE sim.mongo_id <> $mongoID
  WITH source, sim, COUNT(cat) * $weightCategory AS categoryScore

  OPTIONAL MATCH (source)-[:WRITTEN_BY]->(a:Author)<-[:WRITTEN_BY]-(sim)
  WITH source, sim, categoryScore, COUNT(a) * $weightAuthor AS authorScore

  OPTIONAL MATCH (source)-[:PUBLISHED_BY]->(p:Publisher)<-[:PUBLISHED_BY]-(sim)
  WITH sim, categoryScore + authorScore + COUNT(p) * $weightPublisher AS totalScore

  WHERE sim IS NOT NULL AND totalScore > 0
  RETURN sim AS book, totalScore AS score

  UNION

  WITH source, precomputedSimilar
  WHERE size(precomputedSimilar) > 0
  UNWIND precomputedSimilar AS entry
  RETURN entry.book AS book, entry.score AS score
}

RETURN book.mongo_id AS mongo_id,
       book.title    AS title,
       score
ORDER BY score DESC
LIMIT $limit`

	records, err := runQuery(ctx, r.driver, cypher, map[string]any{
		"mongoID":         mongoID,
		"limit":           limit,
		"weightCategory":  domain.WeightCategory,
		"weightAuthor":    domain.WeightAuthor,
		"weightPublisher": domain.WeightPublisher,
	})
	if err != nil {
		return nil, err
	}

	result := make([]domain.SimilarBook, 0, len(records))
	for _, rec := range records {
		bookID, _ := rec.Get("mongo_id")
		title, _ := rec.Get("title")
		score, _ := rec.Get("score")

		result = append(result, domain.SimilarBook{
			BookID: asString(bookID),
			Title:  asString(title),
			Score:  asFloat64(score),
		})
	}
	return result, nil
}

// GetSeriesBooks returns all active books in a named series, ordered by volume sequence.
func (r *RecommendationRepository) GetSeriesBooks(ctx context.Context, seriesName string) ([]domain.SeriesBook, error) {
	cypher := `
MATCH (b:Book {is_active: true})-[r:IN_SERIES]->(s:Series {name: $seriesName})
RETURN b.mongo_id    AS mongo_id,
       b.title       AS title,
       r.sequence_no AS volume_order
ORDER BY r.sequence_no ASC`

	records, err := runQuery(ctx, r.driver, cypher, map[string]any{"seriesName": seriesName})
	if err != nil {
		return nil, err
	}

	result := make([]domain.SeriesBook, 0, len(records))
	for _, rec := range records {
		bookID, _ := rec.Get("mongo_id")
		title, _ := rec.Get("title")
		vol, _ := rec.Get("volume_order")

		result = append(result, domain.SeriesBook{
			BookID:      asString(bookID),
			Title:       asString(title),
			VolumeOrder: asInt(vol),
		})
	}
	return result, nil
}

// UpsertBookNode creates or updates a Book node with all structural relationships,
// then recomputes SIMILARITY_TO edges so other books can find this book via GetSimilarBooks.
func (r *RecommendationRepository) UpsertBookNode(ctx context.Context, node domain.BookNode) error {
	// Step 1: Upsert the Book node and its outgoing structural relationships.
	upsertCypher := `
MERGE (b:Book {mongo_id: $mongoID})
SET b.title     = $title,
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

	if err := writeQuery(ctx, r.driver, upsertCypher, map[string]any{
		"mongoID":    node.MongoID,
		"title":      node.Title,
		"isActive":   node.IsActive,
		"categories": node.Categories,
		"authors":    node.Authors,
		"publisher":  node.Publisher,
		"tags":       node.Tags,
		"seriesName": node.SeriesName,
		"sequenceNo": node.SequenceNo,
	}); err != nil {
		return err
	}

	// Step 2: Recompute SIMILARITY_TO edges for this book against all other active books.
	return r.computeSimilarityEdgesForBook(ctx, node.MongoID)
}

// computeSimilarityEdgesForBook creates or updates SIMILARITY_TO relationships
// from mongoID to every other active book that shares at least one Category, Author,
// or Publisher node.  The score mirrors the weighted traversal used by GetSimilarBooks:
//   Category ×0.50 + Author ×0.33 + Publisher ×0.17
func (r *RecommendationRepository) computeSimilarityEdgesForBook(ctx context.Context, mongoID string) error {
	cypher := `
MATCH (source:Book {mongo_id: $mongoID, is_active: true})
MATCH (other:Book {is_active: true}) WHERE other.mongo_id <> $mongoID

OPTIONAL MATCH (source)-[:BELONGS_TO]->(cat:Category)<-[:BELONGS_TO]-(other)
WITH source, other, COUNT(cat) * $weightCategory AS categoryScore

OPTIONAL MATCH (source)-[:WRITTEN_BY]->(a:Author)<-[:WRITTEN_BY]-(other)
WITH source, other, categoryScore, COUNT(a) * $weightAuthor AS authorScore

OPTIONAL MATCH (source)-[:PUBLISHED_BY]->(p:Publisher)<-[:PUBLISHED_BY]-(other)
WITH source, other, categoryScore + authorScore + COUNT(p) * $weightPublisher AS totalScore

WHERE totalScore > 0
MERGE (source)-[rel:SIMILARITY_TO]->(other)
SET rel.score       = totalScore,
    rel.computedAt  = $computedAt`

	return writeQuery(ctx, r.driver, cypher, map[string]any{
		"mongoID":         mongoID,
		"weightCategory":  domain.WeightCategory,
		"weightAuthor":    domain.WeightAuthor,
		"weightPublisher": domain.WeightPublisher,
		"computedAt":      time.Now().UTC().Format(time.RFC3339),
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

// ─── helpers ──────────────────────────────────────────────────────────────────

func asString(v any) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return strings.TrimSpace(s)
	}
	return ""
}

func asFloat64(v any) float64 {
	switch val := v.(type) {
	case float64:
		return val
	case int64:
		return float64(val)
	}
	return 0
}

func asInt(v any) int {
	switch val := v.(type) {
	case int64:
		return int(val)
	case float64:
		return int(val)
	}
	return 0
}
