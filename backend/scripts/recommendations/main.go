package main

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/domain"
	mongorepo "bookstore/backend/internal/repository/mongo"
	"bookstore/backend/utils/database"
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	neo4jdriver "github.com/neo4j/neo4j-go-driver/v5/neo4j"
)

func main() {
	clearGraph := flag.Bool("clear", false, "Delete the existing Neo4j graph before rebuilding recommendation relationships.")
	limit := flag.Int("limit", 0, "Maximum number of books to sync. Zero means all books.")
	flag.Parse()

	loadEnv()
	cfg := config.Load()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	mongoClient, err := database.ConnectMongo(ctx, cfg.Mongo)
	if err != nil {
		log.Fatalf("connect mongo: %v", err)
	}
	defer func() {
		_ = mongoClient.Disconnect(context.Background())
	}()

	neo4jDriver, err := database.ConnectNeo4j(cfg.Neo4j)
	if err != nil {
		log.Fatalf("connect neo4j: %v", err)
	}
	defer func() {
		_ = neo4jDriver.Close(context.Background())
	}()

	if *clearGraph {
		if err := writeNeo4j(ctx, neo4jDriver, "MATCH (n) DETACH DELETE n", nil); err != nil {
			log.Fatalf("clear neo4j graph: %v", err)
		}
	}

	categoryRepo := mongorepo.NewCategoryRepository(mongoClient, cfg.Mongo.DB)
	categories, _, err := categoryRepo.ListCategories(ctx, 1, 100000)
	if err != nil {
		log.Fatalf("load categories: %v", err)
	}
	for _, category := range categories {
		if err := upsertCategory(ctx, neo4jDriver, category); err != nil {
			log.Fatalf("sync category %s: %v", category.ID, err)
		}
	}

	bookRepo := mongorepo.NewBookRepository(mongoClient, cfg.Mongo.DB)
	pageSize := 500
	if *limit > 0 && *limit < pageSize {
		pageSize = *limit
	}

	synced := 0
	for page := 1; ; page++ {
		books, _, err := bookRepo.SearchBooks(ctx, domain.BookFilter{Page: page, PageSize: pageSize})
		if err != nil {
			log.Fatalf("load books page %d: %v", page, err)
		}
		if len(books) == 0 {
			break
		}

		for _, book := range books {
			if *limit > 0 && synced >= *limit {
				fmt.Printf("Synced %d book(s), %d categor(ies) into Neo4j recommendations graph.\n", synced, len(categories))
				return
			}

			node := bookNodeFromBook(book)
			if node.MongoID == "" || strings.TrimSpace(node.Title) == "" {
				continue
			}
			if err := upsertBookRelationships(ctx, neo4jDriver, node); err != nil {
				log.Fatalf("sync book %s: %v", node.MongoID, err)
			}
			synced++
		}
	}

	fmt.Printf("Synced %d book(s), %d categor(ies) into Neo4j recommendations graph.\n", synced, len(categories))
}

func loadEnv() {
	for _, path := range []string{"backend/.env", ".env", "../.env", "../../.env"} {
		if _, err := os.Stat(path); err == nil {
			_ = godotenv.Load(path)
			return
		}
	}
}

func bookNodeFromBook(book *domain.Book) domain.BookNode {
	authors := make([]string, 0, len(book.Authors))
	for _, author := range book.Authors {
		if strings.TrimSpace(author.AuthorName) != "" {
			authors = append(authors, author.AuthorName)
		}
	}

	tags := make([]string, 0, len(book.Tags))
	for _, tag := range book.Tags {
		if strings.TrimSpace(tag.TagName) != "" {
			tags = append(tags, tag.TagName)
		}
	}

	categories := []string{}
	if strings.TrimSpace(book.Category.CategoryID) != "" {
		categories = append(categories, book.Category.CategoryID)
	}

	return domain.BookNode{
		MongoID:    book.ID,
		Title:      book.Name,
		Authors:    authors,
		Categories: categories,
		Publisher:  book.Publisher,
		Tags:       tags,
		SeriesName: book.Series.SeriesName,
		SequenceNo: book.Series.SequenceNo,
		IsActive:   book.ProductStatus != "inactive",
	}
}

func upsertCategory(ctx context.Context, driver neo4jdriver.DriverWithContext, category *domain.Category) error {
	cypher := `
MERGE (c:Category {categoryId: $categoryID})
SET c.name = $name,
    c.slug = $slug
WITH c
FOREACH (_ IN CASE WHEN $parentID <> '' THEN [1] ELSE [] END |
  MERGE (p:Category {categoryId: $parentID})
  MERGE (p)-[:PARENT_OF]->(c)
)`
	return writeNeo4j(ctx, driver, cypher, map[string]any{
		"categoryID": category.ID,
		"name":       category.CategoryName,
		"slug":       category.Slug,
		"parentID":   category.ParentCategory,
	})
}

func upsertBookRelationships(ctx context.Context, driver neo4jdriver.DriverWithContext, node domain.BookNode) error {
	cypher := `
MERGE (b:Book {mongo_id: $mongoID})
SET b.title = $title,
    b.is_active = $isActive,
    b.status = CASE WHEN $isActive THEN 'active' ELSE 'inactive' END

WITH b
OPTIONAL MATCH (b)-[oldRel:WRITTEN_BY|BELONGS_TO|PUBLISHED_BY|HAS_TAG|IN_SERIES|SIMILARITY_TO]->()
DELETE oldRel

WITH b
FOREACH (categoryID IN [x IN $categories WHERE x IS NOT NULL AND trim(toString(x)) <> ''] |
  MERGE (c:Category {categoryId: toString(categoryID)})
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

	return writeNeo4j(ctx, driver, cypher, map[string]any{
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

func writeNeo4j(ctx context.Context, driver neo4jdriver.DriverWithContext, cypher string, params map[string]any) error {
	session := driver.NewSession(ctx, neo4jdriver.SessionConfig{AccessMode: neo4jdriver.AccessModeWrite})
	defer func() {
		_ = session.Close(ctx)
	}()

	result, err := session.Run(ctx, cypher, params)
	if err != nil {
		return err
	}
	_, err = result.Consume(ctx)
	return err
}
