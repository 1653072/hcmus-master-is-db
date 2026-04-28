package neo4j

import (
	"bookstore/backend/internal/domain"
	"context"
	"strings"
	"time"

	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

// RecommendationRepository implements domain.RecommendationRepository against Neo4j.
type RecommendationRepository struct {
	driver neo4j.DriverWithContext
}

// NewRecommendationRepository creates a RecommendationRepository.
func NewRecommendationRepository(driver neo4j.DriverWithContext) *RecommendationRepository {
	return &RecommendationRepository{driver: driver}
}

// GetSimilarBooks traverses the book graph and returns the top similar books
// ranked by weighted score: Category (×0.5) > Author (×0.33) > Publisher (×0.17).
func (r *RecommendationRepository) GetSimilarBooks(ctx context.Context, mongoID string, limit int) ([]domain.SimilarBook, error) {
	cypher := `
MATCH (source:Book {mongo_id: $mongoID, is_active: true})

OPTIONAL MATCH (source)-[:BELONGS_TO]->(cat:Category)<-[:BELONGS_TO]-(sim:Book {is_active: true})
  WHERE sim.mongo_id <> $mongoID
WITH source, sim, COUNT(cat) * $weightCategory AS categoryScore

OPTIONAL MATCH (source)-[:WRITTEN_BY]->(a:Author)<-[:WRITTEN_BY]-(sim)
WITH source, sim, categoryScore, COUNT(a) * $weightAuthor AS authorScore

OPTIONAL MATCH (source)-[:PUBLISHED_BY]->(p:Publisher)<-[:PUBLISHED_BY]-(sim)
WITH sim, categoryScore + authorScore + COUNT(p) * $weightPublisher AS totalScore

WHERE sim IS NOT NULL AND totalScore > 0
RETURN sim.mongo_id AS mongo_id,
       sim.title    AS title,
       totalScore   AS score
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

// GetSeriesBooks returns all active books in a named series, ordered by sequence.
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

// UpsertBookNode creates or updates a Book node with V2 relationship types.
func (r *RecommendationRepository) UpsertBookNode(ctx context.Context, node domain.BookNode) error {
	cypher := `
MERGE (b:Book {mongo_id: $mongoID})
SET b.title     = $title,
    b.is_active = $isActive

WITH b
UNWIND $categories AS catName
  MERGE (c:Category {name: catName})
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

// DeleteBookNode marks a book node as inactive (soft-delete in the graph).
func (r *RecommendationRepository) DeleteBookNode(ctx context.Context, mongoID string) error {
	cypher := `
MATCH (b:Book {mongo_id: $mongoID})
SET b.is_active = false`

	return writeQuery(ctx, r.driver, cypher, map[string]any{"mongoID": mongoID})
}

// RecordViewed creates a VIEWED relationship from User to Book (MERGE prevents duplicates).
func (r *RecommendationRepository) RecordViewed(ctx context.Context, userID, bookID string) error {
	cypher := `
MERGE (u:User {userId: $userID})
MERGE (b:Book {mongo_id: $bookID})
MERGE (u)-[v:VIEWED]->(b)
SET v.viewedAt = $viewedAt`

	return writeQuery(ctx, r.driver, cypher, map[string]any{
		"userID":   userID,
		"bookID":   bookID,
		"viewedAt": time.Now().UTC().Format(time.RFC3339),
	})
}

// RecordPurchased creates a PURCHASED relationship from User to Book after checkout.
func (r *RecommendationRepository) RecordPurchased(ctx context.Context, userID, bookID, orderID string, qty int) error {
	cypher := `
MERGE (u:User {userId: $userID})
MERGE (b:Book {mongo_id: $bookID})
CREATE (u)-[:PURCHASED {
  purchasedAt: $purchasedAt,
  orderId:     $orderID,
  quantity:    $qty
}]->(b)`

	return writeQuery(ctx, r.driver, cypher, map[string]any{
		"userID":      userID,
		"bookID":      bookID,
		"orderID":     orderID,
		"qty":         qty,
		"purchasedAt": time.Now().UTC().Format(time.RFC3339),
	})
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
