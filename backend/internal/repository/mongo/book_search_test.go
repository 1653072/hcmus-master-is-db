package mongo

import (
	"bookstore/backend/internal/domain"
	"reflect"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

func TestBuildBookFindOptionsSortsSearchByNewest(t *testing.T) {
	opts := buildBookFindOptions(domain.BookFilter{
		Search:   "gatsby",
		Page:     2,
		PageSize: 12,
	})

	expectedSort := bson.D{{Key: "createdAt", Value: -1}}
	if !reflect.DeepEqual(opts.Sort, expectedSort) {
		t.Fatalf("expected newest sort %v, got %v", expectedSort, opts.Sort)
	}

	if opts.Projection != nil {
		t.Fatalf("expected no projection for partial search query, got %v", opts.Projection)
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

func TestBuildBookSearchQueryUsesPartialSearchAcrossBookMetadata(t *testing.T) {
	query := buildBookSearchQuery(domain.BookFilter{
		Search:   "comic adventure",
		Category: "cat-1",
		MinPrice: 100,
		MaxPrice: 250,
	})

	expected := bson.D{
		{Key: "$and", Value: bson.A{
			anyFieldContainsAllTerms("comic adventure",
				"name",
				"shortDescription",
				"short_description",
				"detailDescription",
				"detail_description",
				"publisher",
				"authors.authorName",
				"authors.author_name",
				"category.categoryName",
				"category.category_name",
				"series.seriesName",
				"series.series_name",
				"tags.tagName",
				"tags.tag_name",
			),
			bson.D{{Key: "$or", Value: bson.A{
				bson.D{{Key: "category.categoryId", Value: "cat-1"}},
				bson.D{{Key: "category.category_id", Value: "cat-1"}},
			}}},
			bson.D{{Key: "pricing.price", Value: bson.D{{Key: "$gte", Value: float64(100)}, {Key: "$lte", Value: float64(250)}}}},
		}},
	}
	if !reflect.DeepEqual(query, expected) {
		t.Fatalf("expected query %v, got %v", expected, query)
	}
}

func TestBuildBookSearchQueryUsesPartialAuthorAndPublisherFilters(t *testing.T) {
	query := buildBookSearchQuery(domain.BookFilter{
		Author:    "arthur",
		Publisher: "penguin",
	})

	expected := bson.D{
		{Key: "$and", Value: bson.A{
			anyFieldContains("arthur", "authors.authorName", "authors.author_name"),
			anyFieldContains("penguin", "publisher"),
		}},
	}
	if !reflect.DeepEqual(query, expected) {
		t.Fatalf("expected query %v, got %v", expected, query)
	}
}

func TestBookDocumentUnmarshalSupportsSnakeCaseSeedFields(t *testing.T) {
	createdAt := time.Date(2026, 5, 11, 0, 29, 25, 0, time.UTC)
	data, err := bson.Marshal(bson.M{
		"_id":                "book-1",
		"name":               "Sherlock Holmes",
		"short_description":  "Short copy",
		"detail_description": "Long copy",
		"product_status":     "active",
		"category": bson.M{
			"category_id": "cat-1",
		},
		"authors": bson.A{
			bson.M{
				"author_id":   "author-1",
				"slug":        "arthur-conan-doyle",
				"author_name": "Arthur Conan Doyle",
			},
		},
		"tags": bson.A{
			bson.M{
				"tag_id":   "tag-1",
				"tag_name": "detective",
			},
		},
		"created_at": createdAt,
	})
	if err != nil {
		t.Fatal(err)
	}

	var doc bookDocument
	if err := bson.Unmarshal(data, &doc); err != nil {
		t.Fatal(err)
	}

	book := doc.toDomain()
	if book.ShortDescription != "Short copy" {
		t.Fatalf("expected short description from snake_case field, got %q", book.ShortDescription)
	}
	if book.DetailDescription != "Long copy" {
		t.Fatalf("expected detail description from snake_case field, got %q", book.DetailDescription)
	}
	if book.ProductStatus != "active" {
		t.Fatalf("expected product status from snake_case field, got %q", book.ProductStatus)
	}
	if book.Category.CategoryID != "cat-1" {
		t.Fatalf("expected category id from snake_case field, got %q", book.Category.CategoryID)
	}
	if len(book.Authors) != 1 || book.Authors[0].AuthorName != "Arthur Conan Doyle" {
		t.Fatalf("expected author from snake_case fields, got %#v", book.Authors)
	}
	if len(book.Tags) != 1 || book.Tags[0].TagName != "detective" {
		t.Fatalf("expected tag from snake_case fields, got %#v", book.Tags)
	}
	if !book.CreatedAt.Equal(createdAt) {
		t.Fatalf("expected created_at %s, got %s", createdAt, book.CreatedAt)
	}
}
