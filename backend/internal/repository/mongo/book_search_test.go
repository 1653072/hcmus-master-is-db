package mongo

import (
	"bookstore/backend/internal/domain"
	"reflect"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
)

func TestBuildBookFindOptionsSortsTextSearchByScore(t *testing.T) {
	opts := buildBookFindOptions(domain.BookFilter{
		Search:   "gatsby",
		Page:     2,
		PageSize: 12,
	})

	textScore := bson.D{{Key: "$meta", Value: "textScore"}}
	expectedSort := bson.D{{Key: "score", Value: textScore}, {Key: "createdAt", Value: -1}}
	if !reflect.DeepEqual(opts.Sort, expectedSort) {
		t.Fatalf("expected text score sort %v, got %v", expectedSort, opts.Sort)
	}

	expectedProjection := bson.D{{Key: "score", Value: textScore}}
	if !reflect.DeepEqual(opts.Projection, expectedProjection) {
		t.Fatalf("expected text score projection %v, got %v", expectedProjection, opts.Projection)
	}

	if opts.Skip == nil || *opts.Skip != 12 {
		t.Fatalf("expected skip 12, got %v", opts.Skip)
	}
	if opts.Limit == nil || *opts.Limit != 12 {
		t.Fatalf("expected limit 12, got %v", opts.Limit)
	}
}

func TestBuildBookFindOptionsSortsBrowseByNewest(t *testing.T) {
	opts := buildBookFindOptions(domain.BookFilter{Page: 1, PageSize: 20})

	expectedSort := bson.D{{Key: "createdAt", Value: -1}}
	if !reflect.DeepEqual(opts.Sort, expectedSort) {
		t.Fatalf("expected newest sort %v, got %v", expectedSort, opts.Sort)
	}
	if opts.Projection != nil {
		t.Fatalf("expected no projection for browse query, got %v", opts.Projection)
	}
}

func TestBuildBookSearchQueryUsesMongoTextSearch(t *testing.T) {
	query := buildBookSearchQuery(domain.BookFilter{
		Search:   "comic adventure",
		Category: "cat-1",
		MinPrice: 100,
		MaxPrice: 250,
	})

	expected := bson.D{
		{Key: "$text", Value: bson.D{{Key: "$search", Value: "comic adventure"}}},
		{Key: "category.categoryId", Value: "cat-1"},
		{Key: "pricing.price", Value: bson.D{{Key: "$gte", Value: float64(100)}, {Key: "$lte", Value: float64(250)}}},
	}
	if !reflect.DeepEqual(query, expected) {
		t.Fatalf("expected query %v, got %v", expected, query)
	}
}
