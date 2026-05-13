package main

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/domain"
	neo4jrepo "bookstore/backend/internal/repository/neo4j"
	"bookstore/backend/utils/database"
	"bookstore/backend/utils/password"
	"bufio"
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/brianvoe/gofakeit/v6"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/neo4j/neo4j-go-driver/v5/neo4j"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"gorm.io/gorm"
)

const (
	TargetUsers          = 10000
	TargetBooks          = 2000
	TargetCategories     = 500
	TargetCarts          = 2000
	TargetCartItems      = 5000
	TargetOrders         = 5000
	TargetOrderItems     = 10000
	TargetOrderHistories = 10000
	TargetViewLogs       = 10000
	TargetAddresses      = 10000
)

var categoryGenres = []string{
	"Adventure",
	"Comic",
	"Crime",
	"Erotic",
	"Fantasy",
	"Fiction",
	"Historical",
	"Horror",
	"Magic",
	"Mystery",
	"Philosophical",
	"Political",
	"Romance",
	"Saga",
	"Satire",
	"Science",
	"Speculative",
	"Thriller",
	"Urban",
}

var categoryQualifiers = []string{
	"Interesting",
	"Essential",
	"Classic",
	"Modern",
	"Hidden",
	"Popular",
	"Curious",
	"Bright",
	"Deep",
	"Fresh",
	"Epic",
	"Compact",
	"Selected",
	"Premium",
	"Young",
	"Global",
	"Local",
	"New",
	"Vintage",
	"Featured",
	"Creative",
	"Accessible",
	"Advanced",
	"Beginner",
	"Collector",
	"Trending",
	"Timeless",
}

type ExportFiles struct {
	Postgres *os.File
	Mongo    *os.File
	Neo4j    *os.File
}

func escapeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func objectIDOrString(id string) any {
	if oid, err := primitive.ObjectIDFromHex(id); err == nil {
		return oid
	}
	return id
}

func generatedCategoryNames(target int) []string {
	names := make([]string, 0, target)
	for cycle := 0; len(names) < target; cycle++ {
		for _, qualifier := range categoryQualifiers {
			for _, genre := range categoryGenres {
				name := fmt.Sprintf("%s %s", genre, qualifier)
				if cycle > 0 {
					name = fmt.Sprintf("%s %s %d", genre, qualifier, cycle+1)
				}
				names = append(names, name)
				if len(names) == target {
					return names
				}
			}
		}
	}
	return names
}

func writeMongoInsert(file *os.File, collection string, doc any) {
	jsonData, err := bson.MarshalExtJSON(doc, false, false)
	if err != nil {
		log.Printf("failed to marshal Mongo seed for %s: %v", collection, err)
		return
	}
	file.WriteString(fmt.Sprintf("db.%s.insertOne(%s);\n", collection, string(jsonData)))
}

func categorySeedDocument(cat *domain.Category) bson.M {
	doc := bson.M{
		"_id":           objectIDOrString(cat.ID),
		"category_name": cat.CategoryName,
		"slug":          cat.Slug,
		"created_at":    cat.CreatedAt,
		"updated_at":    cat.UpdatedAt,
	}
	if cat.ParentCategory != "" {
		doc["parent_category"] = cat.ParentCategory
	}
	return doc
}

func bookSeedDocument(book domain.Book) bson.M {
	authors := bson.A{}
	for _, author := range book.Authors {
		authors = append(authors, bson.M{
			"authorId":   author.AuthorID,
			"slug":       author.Slug,
			"authorName": author.AuthorName,
		})
	}

	tags := bson.A{}
	for _, tag := range book.Tags {
		tags = append(tags, bson.M{
			"tagId":   tag.TagID,
			"tagName": tag.TagName,
		})
	}

	images := bson.A{}
	for _, image := range book.Images {
		images = append(images, bson.M{
			"isPrimary": image.IsPrimary,
			"alt":       image.Alt,
			"url":       image.URL,
		})
	}

	return bson.M{
		"_id":               objectIDOrString(book.ID),
		"name":              book.Name,
		"shortDescription":  book.ShortDescription,
		"detailDescription": book.DetailDescription,
		"productStatus":     book.ProductStatus,
		"publisher":         book.Publisher,
		"publishYear":       book.PublishYear,
		"pricing": bson.M{
			"price": book.Pricing.Price,
		},
		"category": bson.M{
			"categoryId": book.Category.CategoryID,
		},
		"images": images,
		"series": bson.M{
			"seriesId":   book.Series.SeriesID,
			"seriesName": book.Series.SeriesName,
			"sequenceNo": book.Series.SequenceNo,
		},
		"authors":   authors,
		"tags":      tags,
		"createdAt": book.CreatedAt,
	}
}

func eventLogSeedDocument(logEntry domain.EventLog) bson.M {
	return bson.M{
		"_id":       primitive.NewObjectID(),
		"userId":    logEntry.UserID,
		"bookId":    logEntry.BookID,
		"eventType": logEntry.EventType,
		"createdAt": logEntry.CreatedAt,
	}
}

func countDuplicateValueGroups(ctx context.Context, coll *mongo.Collection, field string) (int64, error) {
	pipeline := mongo.Pipeline{
		bson.D{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$" + field},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
		}}},
		bson.D{{Key: "$match", Value: bson.D{{Key: "count", Value: bson.D{{Key: "$gt", Value: 1}}}}}},
		bson.D{{Key: "$count", Value: "duplicate_groups"}},
	}

	cur, err := coll.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cur.Close(ctx)

	var rows []struct {
		DuplicateGroups int64 `bson:"duplicate_groups"`
	}
	if err := cur.All(ctx, &rows); err != nil {
		return 0, err
	}
	if len(rows) == 0 {
		return 0, nil
	}
	return rows[0].DuplicateGroups, nil
}

func writeNeo4jBookGraph(file *os.File, node domain.BookNode) {
	status := "inactive"
	if node.IsActive {
		status = "active"
	}
	file.WriteString(fmt.Sprintf("MERGE (b:Book {mongo_id: '%s'}) SET b.title = '%s', b.is_active = %t, b.status = '%s';\n",
		escapeSQL(node.MongoID), escapeSQL(node.Title), node.IsActive, status))

	for _, categoryID := range node.Categories {
		if strings.TrimSpace(categoryID) == "" {
			continue
		}
		file.WriteString(fmt.Sprintf("MATCH (b:Book {mongo_id: '%s'}) MERGE (c:Category {categoryId: '%s'}) MERGE (b)-[:BELONGS_TO]->(c);\n",
			escapeSQL(node.MongoID), escapeSQL(categoryID)))
	}
	for _, authorName := range node.Authors {
		if strings.TrimSpace(authorName) == "" {
			continue
		}
		file.WriteString(fmt.Sprintf("MATCH (b:Book {mongo_id: '%s'}) MERGE (a:Author {name: '%s'}) MERGE (b)-[:WRITTEN_BY]->(a);\n",
			escapeSQL(node.MongoID), escapeSQL(authorName)))
	}
	if strings.TrimSpace(node.Publisher) != "" {
		file.WriteString(fmt.Sprintf("MATCH (b:Book {mongo_id: '%s'}) MERGE (p:Publisher {name: '%s'}) MERGE (b)-[:PUBLISHED_BY]->(p);\n",
			escapeSQL(node.MongoID), escapeSQL(node.Publisher)))
	}
	for _, tagName := range node.Tags {
		if strings.TrimSpace(tagName) == "" {
			continue
		}
		file.WriteString(fmt.Sprintf("MATCH (b:Book {mongo_id: '%s'}) MERGE (t:Tag {name: '%s'}) MERGE (b)-[:HAS_TAG]->(t);\n",
			escapeSQL(node.MongoID), escapeSQL(tagName)))
	}
	if strings.TrimSpace(node.SeriesName) != "" {
		file.WriteString(fmt.Sprintf("MATCH (b:Book {mongo_id: '%s'}) MERGE (s:Series {name: '%s'}) MERGE (b)-[rel:IN_SERIES]->(s) SET rel.sequence_no = %d;\n",
			escapeSQL(node.MongoID), escapeSQL(node.SeriesName), node.SequenceNo))
	}
}

func main() {
	// 1. Load Environment Variables and Config
	_ = godotenv.Load("../.env")
	cfg := config.Load()

	ctx := context.Background()

	// Parse flags
	verifyOnly := flag.Bool("verify", false, "Only verify existing data without seeding")
	flag.Parse()

	// 2. Prepare Export Files
	dataDir := "data"
	_ = os.MkdirAll(dataDir, 0755)

	pgSeedPath := filepath.Join(dataDir, "postgres_seed.sql")
	mgSeedPath := filepath.Join(dataDir, "mongo_seed.json")
	n4jSeedPath := filepath.Join(dataDir, "neo4j_seed.cypher")

	// 3. Connect to Databases
	pgDB, err := database.ConnectPostgres(cfg.Postgres)
	if err != nil {
		log.Fatalf("failed to connect postgres: %v", err)
	}

	mongoClient, err := database.ConnectMongo(ctx, cfg.Mongo)
	if err != nil {
		log.Fatalf("failed to connect mongo: %v", err)
	}
	defer mongoClient.Disconnect(ctx)

	neo4jDriver, err := database.ConnectNeo4j(cfg.Neo4j)
	if err != nil {
		log.Fatalf("failed to connect neo4j: %v", err)
	}
	defer neo4jDriver.Close(ctx)

	neoRepo := neo4jrepo.NewRecommendationRepository(neo4jDriver)

	fmt.Println("Checking database connectivity...")
	fmt.Println("  [✓] PostgreSQL connected and pinged")
	fmt.Println("  [✓] MongoDB connected and pinged")
	fmt.Println("  [✓] Neo4j connected and connectivity verified")

	if *verifyOnly {
		fmt.Println("Running data verification...")
		verifySeededData(ctx, pgDB, mongoClient, cfg.Mongo.DB, neo4jDriver)
		return
	}

	// Check if seed data already exists
	if fileExists(pgSeedPath) && fileExists(mgSeedPath) && fileExists(n4jSeedPath) {
		fmt.Println("Seed data files found in ./data_generator/data/. Loading existing data...")
		loadExistingData(ctx, pgDB, mongoClient, cfg.Mongo.DB, neo4jDriver, pgSeedPath, mgSeedPath, n4jSeedPath)
		fmt.Println("Existing data loaded successfully!")

		fmt.Println("Running post-load verification...")
		verifySeededData(ctx, pgDB, mongoClient, cfg.Mongo.DB, neo4jDriver)
		return
	}

	pgFile, _ := os.Create(pgSeedPath)
	mgFile, _ := os.Create(mgSeedPath)
	n4jFile, _ := os.Create(n4jSeedPath)
	defer pgFile.Close()
	defer mgFile.Close()
	defer n4jFile.Close()

	exports := &ExportFiles{
		Postgres: pgFile,
		Mongo:    mgFile,
		Neo4j:    n4jFile,
	}

	// Pre-calculate password hash for "123456"
	defaultHash, err := password.HashPassword("123456")
	if err != nil {
		log.Fatalf("failed to hash default password: %v", err)
	}

	fmt.Println("Starting data seeding and export...")

	// 4. Seed Categories (Mongo + Neo4j)
	categories := seedCategories(ctx, mongoClient, cfg.Mongo.DB, neoRepo, exports)
	fmt.Printf("Seeded %d categories\n", len(categories))

	// 5. Seed Books (Mongo + Postgres + Neo4j)
	books := seedBooks(ctx, mongoClient, cfg.Mongo.DB, pgDB, neoRepo, categories, exports)
	fmt.Printf("Seeded %d books\n", len(books))

	// 6. Seed Users & Addresses (Postgres)
	users := seedUsers(pgDB, defaultHash, exports)
	fmt.Printf("Seeded %d users\n", len(users))

	addresses := seedAddresses(pgDB, users, exports)
	fmt.Printf("Seeded %d addresses\n", len(addresses))

	// 7. Seed Carts & Cart Items (Postgres)
	seedCarts(pgDB, users, books, exports)
	fmt.Println("Seeded carts and cart items")

	// 8. Seed Orders & Related (Postgres)
	seedOrders(pgDB, users, books, addresses, exports)
	fmt.Println("Seeded orders, items, history, and shipments")

	// 9. Seed View Event Logs (Mongo)
	seedViewLogs(ctx, mongoClient, cfg.Mongo.DB, users, books, exports)
	fmt.Println("Seeded view event logs")

	fmt.Println("Data seeding and export completed successfully!")
	fmt.Println("Files saved to ./data_generator/data/")
}

func seedCategories(ctx context.Context, client *mongo.Client, dbName string, neoRepo *neo4jrepo.RecommendationRepository, exports *ExportFiles) []*domain.Category {
	coll := client.Database(dbName).Collection("categories")
	var categories []*domain.Category

	for _, categoryName := range generatedCategoryNames(TargetCategories) {
		cat := &domain.Category{
			ID:           primitive.NewObjectID().Hex(),
			CategoryName: categoryName,
			Slug:         domain.CanonicalSlug(categoryName),
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		_, _ = coll.InsertOne(ctx, cat)
		_ = neoRepo.UpsertCategoryNode(ctx, cat)

		// Export using MongoDB field names so loaded seed files match the live documents.
		writeMongoInsert(exports.Mongo, "categories", categorySeedDocument(cat))
		exports.Neo4j.WriteString(fmt.Sprintf("MERGE (c:Category {categoryId: '%s'}) SET c.name = '%s', c.slug = '%s';\n", cat.ID, escapeSQL(cat.CategoryName), cat.Slug))

		categories = append(categories, cat)
	}
	return categories
}

func seedBooks(ctx context.Context, client *mongo.Client, dbName string, pgDB *gorm.DB, neoRepo *neo4jrepo.RecommendationRepository, categories []*domain.Category, exports *ExportFiles) []string {
	coll := client.Database(dbName).Collection("books")
	var bookIDs []string

	for i := 0; i < int(TargetBooks*1.5); i++ {
		mongoID := primitive.NewObjectID().Hex()
		cat := categories[rand.Intn(len(categories))]
		price := gofakeit.Price(10, 100)
		stock := rand.Intn(500) + 10

		bookName := gofakeit.BookTitle()
		publisher := gofakeit.Company()
		publishYear := gofakeit.Number(1990, time.Now().Year())
		book := domain.Book{
			ID:                mongoID,
			Name:              bookName,
			ShortDescription:  gofakeit.Sentence(10),
			DetailDescription: gofakeit.Paragraph(2, 5, 10, "\n"),
			ProductStatus:     "active",
			Publisher:         publisher,
			PublishYear:       publishYear,
			Pricing:           domain.BookPricing{Price: price},
			Category:          domain.BookCategory{CategoryID: cat.ID},
			CreatedAt:         time.Now(),
			Authors: []domain.BookAuthor{
				{AuthorID: gofakeit.UUID(), AuthorName: gofakeit.Name(), Slug: gofakeit.UUID()},
			},
			Tags: []domain.BookTag{
				{TagID: gofakeit.UUID(), TagName: gofakeit.Word()},
			},
			Images: []domain.BookImage{
				{
					IsPrimary: true,
					Alt:       bookName,
					URL:       fmt.Sprintf("https://picsum.photos/seed/%s/400/600", mongoID),
				},
			},
		}

		_, _ = coll.InsertOne(ctx, book)
		pgDB.Exec("INSERT INTO books_ref (mongo_id, is_active) VALUES (?, ?)", mongoID, true)
		pgDB.Exec("INSERT INTO inventory (book_id, stock_quantity, updated_at) VALUES (?, ?, ?)", mongoID, stock, time.Now())

		var authorNames []string
		for _, a := range book.Authors {
			authorNames = append(authorNames, a.AuthorName)
		}
		var tagNames []string
		for _, t := range book.Tags {
			tagNames = append(tagNames, t.TagName)
		}

		bookNode := domain.BookNode{
			MongoID:    mongoID,
			Title:      book.Name,
			IsActive:   true,
			Categories: []string{cat.ID},
			Authors:    authorNames,
			Publisher:  publisher,
			Tags:       tagNames,
		}
		_ = neoRepo.UpsertBookNode(ctx, bookNode)

		// Export using MongoDB field names so loaded seed files match the live documents.
		writeMongoInsert(exports.Mongo, "books", bookSeedDocument(book))
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO books_ref (mongo_id, is_active) VALUES ('%s', true);\n", mongoID))
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO inventory (book_id, stock_quantity, updated_at) VALUES ('%s', %d, NOW());\n", mongoID, stock))
		writeNeo4jBookGraph(exports.Neo4j, bookNode)

		bookIDs = append(bookIDs, mongoID)
	}
	return bookIDs
}

func seedUsers(pgDB *gorm.DB, hash string, exports *ExportFiles) []domain.User {
	var users []domain.User
	usedEmails := make(map[string]bool)

	// 1. Seed 5 Admin accounts
	for i := 0; i < 5; i++ {
		aliasID := uuid.New()
		email := fmt.Sprintf("admin%d@paperhaven.com", i+1)
		usedEmails[email] = true

		user := domain.User{
			AliasID:      aliasID,
			FullName:     fmt.Sprintf("Admin %d", i+1),
			Email:        email,
			Phone:        gofakeit.Phone(),
			PasswordHash: hash,
			Role:         domain.RoleAdmin,
			IsActive:     true,
			CreatedAt:    time.Now(),
		}
		if err := pgDB.Create(&user).Error; err == nil {
			users = append(users, user)
			exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO users (alias_id, full_name, email, phone, password_hash, role, is_active, created_at) VALUES ('%s', '%s', '%s', '%s', '%s', 'admin', true, NOW());\n",
				user.AliasID, escapeSQL(user.FullName), escapeSQL(user.Email), escapeSQL(user.Phone), user.PasswordHash))
		}
	}

	// 2. Seed regular users
	for i := 0; i < int(TargetUsers*1.5); i++ {
		aliasID := uuid.New()
		email := gofakeit.Email()

		// Ensure uniqueness within this generation run to avoid collisions
		// before hitting the database unique constraint.
		attempts := 0
		for usedEmails[email] && attempts < 10 {
			email = gofakeit.Email()
			attempts++
		}
		if usedEmails[email] {
			// If still duplicate after 10 attempts, append a short UUID fragment
			// to the local part of the email to guarantee uniqueness while
			// maintaining a valid email format.
			parts := strings.Split(email, "@")
			if len(parts) == 2 {
				email = fmt.Sprintf("%s.%s@%s", parts[0], aliasID.String()[:4], parts[1])
			}
		}
		usedEmails[email] = true

		user := domain.User{
			AliasID:      aliasID,
			FullName:     gofakeit.Name(),
			Email:        email,
			Phone:        gofakeit.Phone(),
			PasswordHash: hash,
			Role:         domain.RoleUser,
			IsActive:     true,
			CreatedAt:    time.Now(),
		}
		if err := pgDB.Create(&user).Error; err != nil {
			// This handles collisions with existing data in the DB
			continue
		}
		users = append(users, user)

		// Export
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO users (alias_id, full_name, email, phone, password_hash, role, is_active, created_at) VALUES ('%s', '%s', '%s', '%s', '%s', 'user', true, NOW());\n",
			user.AliasID, escapeSQL(user.FullName), escapeSQL(user.Email), escapeSQL(user.Phone), user.PasswordHash))
	}
	return users
}

func seedAddresses(pgDB *gorm.DB, users []domain.User, exports *ExportFiles) []domain.Address {
	var addresses []domain.Address
	for i := 0; i < int(TargetAddresses*1.5); i++ {
		user := users[rand.Intn(len(users))]
		addr := domain.Address{
			AliasID:      uuid.New(),
			UserID:       user.ID,
			ReceiverName: user.FullName,
			Phone:        user.Phone,
			AddressLine:  gofakeit.Address().Address,
			City:         gofakeit.Address().City,
			IsDefault:    true,
			CreatedAt:    time.Now(),
		}
		if err := pgDB.Create(&addr).Error; err != nil {
			continue
		}
		addresses = append(addresses, addr)

		// Export (Note: user_id is internal, so we use a subquery for the export file to be usable)
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO addresses (alias_id, user_id, receiver_name, phone, address_line, city, is_default, created_at) SELECT '%s', id, '%s', '%s', '%s', '%s', true, NOW() FROM users WHERE alias_id = '%s';\n",
			addr.AliasID, escapeSQL(addr.ReceiverName), escapeSQL(addr.Phone), escapeSQL(addr.AddressLine), escapeSQL(addr.City), user.AliasID))
	}
	return addresses
}

func seedCarts(pgDB *gorm.DB, users []domain.User, books []string, exports *ExportFiles) {
	// Shuffle users to pick unique ones for carts
	rand.Shuffle(len(users), func(i, j int) {
		users[i], users[j] = users[j], users[i]
	})

	count := 0
	for _, user := range users {
		if count >= int(TargetCarts*1.5) {
			break
		}

		cart := domain.Cart{
			UserID:    user.ID,
			CreatedAt: time.Now(),
		}
		if err := pgDB.Create(&cart).Error; err != nil {
			// Skip if cart already exists or other error
			continue
		}

		// CRITICAL: Ensure cart.ID is not 0
		if cart.ID == 0 {
			continue
		}

		count++

		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO carts (user_id, created_at) SELECT id, NOW() FROM users WHERE alias_id = '%s';\n", user.AliasID))

		numItems := rand.Intn(4) + 2
		for j := 0; j < numItems; j++ {
			bookID := books[rand.Intn(len(books))]
			qty := rand.Intn(3) + 1
			item := domain.CartItemRecord{
				CartID:   cart.ID,
				BookID:   bookID,
				Quantity: qty,
			}
			if err := pgDB.Create(&item).Error; err != nil {
				continue
			}
			exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO cart_items (cart_id, book_id, quantity) SELECT id, '%s', %d FROM carts WHERE user_id = (SELECT id FROM users WHERE alias_id = '%s');\n",
				bookID, qty, user.AliasID))
		}
	}
}

func seedOrders(pgDB *gorm.DB, users []domain.User, books []string, addresses []domain.Address, exports *ExportFiles) {
	statuses := []domain.OrderStatus{
		domain.OrderStatusPending, domain.OrderStatusConfirmed,
		domain.OrderStatusPacking, domain.OrderStatusShipping,
		domain.OrderStatusCompleted, domain.OrderStatusCancelled,
	}

	// Group addresses by user ID for faster lookup
	userAddresses := make(map[int64][]domain.Address)
	for _, addr := range addresses {
		userAddresses[addr.UserID] = append(userAddresses[addr.UserID], addr)
	}

	for i := 0; i < int(TargetOrders*1.5); i++ {
		user := users[rand.Intn(len(users))]
		status := statuses[rand.Intn(len(statuses))]

		// Pick a random address for this user
		var addressID *int64
		var addressAliasID *uuid.UUID

		addrs := userAddresses[user.ID]
		if len(addrs) == 0 {
			// Create ad-hoc address if user has none
			addr := domain.Address{
				AliasID:      uuid.New(),
				UserID:       user.ID,
				ReceiverName: user.FullName,
				Phone:        user.Phone,
				AddressLine:  gofakeit.Address().Address,
				City:         gofakeit.Address().City,
				IsDefault:    true,
				CreatedAt:    time.Now(),
			}
			if err := pgDB.Create(&addr).Error; err == nil {
				userAddresses[user.ID] = append(userAddresses[user.ID], addr)
				addressID = &addr.ID
				addressAliasID = &addr.AliasID

				// Export the ad-hoc address
				exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO addresses (alias_id, user_id, receiver_name, phone, address_line, city, is_default, created_at) SELECT '%s', id, '%s', '%s', '%s', '%s', true, NOW() FROM users WHERE alias_id = '%s';\n",
					addr.AliasID, escapeSQL(addr.ReceiverName), escapeSQL(addr.Phone), escapeSQL(addr.AddressLine), escapeSQL(addr.City), user.AliasID))
			}
		} else {
			selectedAddr := addrs[rand.Intn(len(addrs))]
			addressID = &selectedAddr.ID
			addressAliasID = &selectedAddr.AliasID
		}

		order := domain.Order{
			AliasID:     uuid.New(),
			UserID:      user.ID,
			AddressID:   addressID,
			Status:      status,
			TotalAmount: 0,
			CreatedAt:   time.Now().AddDate(0, 0, -rand.Intn(30)),
		}
		if err := pgDB.Create(&order).Error; err != nil {
			continue
		}

		// CRITICAL: Ensure order.ID is not 0
		if order.ID == 0 {
			continue
		}

		// Export order with address_id subquery
		addrSubquery := "NULL"
		if addressAliasID != nil {
			addrSubquery = fmt.Sprintf("(SELECT id FROM addresses WHERE alias_id = '%s')", addressAliasID.String())
		}

		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO orders (alias_id, user_id, address_id, status, total_amount, created_at) SELECT '%s', id, %s, '%s', 0, '%s' FROM users WHERE alias_id = '%s';\n",
			order.AliasID, addrSubquery, status, order.CreatedAt.Format("2006-01-02 15:04:05"), user.AliasID))

		numItems := rand.Intn(4) + 1
		var total float64
		for j := 0; j < numItems; j++ {
			bookID := books[rand.Intn(len(books))]
			price := gofakeit.Price(10, 100)
			qty := rand.Intn(2) + 1
			item := domain.OrderItem{
				OrderID:     order.ID,
				MongoBookID: bookID,
				Name:        gofakeit.BookTitle(),
				Quantity:    qty,
				UnitPrice:   price,
			}
			if err := pgDB.Create(&item).Error; err != nil {
				continue
			}
			total += price * float64(qty)
			exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO order_items (order_id, mongo_book_id, name, quantity, unit_price) SELECT id, '%s', '%s', %d, %f FROM orders WHERE alias_id = '%s';\n",
				bookID, escapeSQL(item.Name), qty, price, order.AliasID))
		}
		pgDB.Model(&order).Update("total_amount", total)
		exports.Postgres.WriteString(fmt.Sprintf("UPDATE orders SET total_amount = %f WHERE alias_id = '%s';\n", total, order.AliasID))

		// History
		history := domain.OrderStatusHistory{
			AliasID:   uuid.New(),
			OrderID:   order.ID,
			NewStatus: string(domain.OrderStatusPending),
			ChangedAt: order.CreatedAt,
		}
		pgDB.Create(&history)
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO order_status_histories (alias_id, order_id, new_status, changed_at) SELECT gen_random_uuid(), id, 'pending', '%s' FROM orders WHERE alias_id = '%s';\n",
			order.CreatedAt.Format("2006-01-02 15:04:05"), order.AliasID))

		if status != domain.OrderStatusPending {
			history2 := domain.OrderStatusHistory{
				AliasID:   uuid.New(),
				OrderID:   order.ID,
				OldStatus: stringPtr(string(domain.OrderStatusPending)),
				NewStatus: string(status),
				ChangedAt: order.CreatedAt.Add(time.Hour),
			}
			pgDB.Create(&history2)
			exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO order_status_histories (alias_id, order_id, old_status, new_status, changed_at) SELECT gen_random_uuid(), id, 'pending', '%s', '%s' FROM orders WHERE alias_id = '%s';\n",
				status, order.CreatedAt.Add(time.Hour).Format("2006-01-02 15:04:05"), order.AliasID))
		}

		var shippedAt, deliveredAt *time.Time
		shipStatus := domain.ShipmentStatusPending

		if status == domain.OrderStatusShipping || status == domain.OrderStatusCompleted {
			t1 := order.CreatedAt.AddDate(0, 0, rand.Intn(2)+1)
			shippedAt = &t1
			shipStatus = domain.ShipmentStatusShipped

			if status == domain.OrderStatusCompleted {
				t2 := t1.AddDate(0, 0, rand.Intn(3)+1)
				deliveredAt = &t2
				shipStatus = domain.ShipmentStatusDelivered
			}
		}

		shipment := domain.Shipment{
			AliasID:        uuid.New(),
			OrderID:        order.ID,
			Status:         shipStatus,
			Carrier:        "FastDelivery",
			TrackingNumber: gofakeit.UUID(),
			ShippedAt:      shippedAt,
			DeliveredAt:    deliveredAt,
			CreatedAt:      order.CreatedAt,
		}
		pgDB.Create(&shipment)

		shippedAtStr := "NULL"
		if shippedAt != nil {
			shippedAtStr = fmt.Sprintf("'%s'", shippedAt.Format("2006-01-02 15:04:05"))
		}
		deliveredAtStr := "NULL"
		if deliveredAt != nil {
			deliveredAtStr = fmt.Sprintf("'%s'", deliveredAt.Format("2006-01-02 15:04:05"))
		}

		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO shipments (alias_id, order_id, status, carrier, tracking_no, shipped_at, delivered_at, created_at) SELECT gen_random_uuid(), id, '%s', 'FastDelivery', '%s', %s, %s, '%s' FROM orders WHERE alias_id = '%s';\n",
			shipStatus, shipment.TrackingNumber, shippedAtStr, deliveredAtStr, order.CreatedAt.Format("2006-01-02 15:04:05"), order.AliasID))
	}
}

func seedViewLogs(ctx context.Context, client *mongo.Client, dbName string, users []domain.User, books []string, exports *ExportFiles) {
	coll := client.Database(dbName).Collection("view_event_logs")
	for i := 0; i < int(TargetViewLogs*1.5); i++ {
		user := users[rand.Intn(len(users))]
		bookID := books[rand.Intn(len(books))]
		logEntry := domain.EventLog{
			UserID:    user.AliasID.String(),
			BookID:    bookID,
			EventType: "viewed",
			CreatedAt: time.Now().AddDate(0, 0, -rand.Intn(30)),
		}
		doc := eventLogSeedDocument(logEntry)
		if _, err := coll.InsertOne(ctx, doc); err != nil {
			continue
		}
		writeMongoInsert(exports.Mongo, "view_event_logs", doc)
	}
}

func stringPtr(s string) *string { return &s }

func fileExists(path string) bool {
	info, err := os.Stat(path)
	if os.IsNotExist(err) {
		return false
	}
	return !info.IsDir() && info.Size() > 0
}

func loadExistingData(ctx context.Context, pgDB *gorm.DB, mongoClient *mongo.Client, dbName string, neo4jDriver neo4j.DriverWithContext, pgPath, mgPath, n4jPath string) {
	// ── Clean existing data to avoid ID mismatches between databases ──────
	fmt.Println("  Cleaning existing data before re-seeding...")

	// Clean PostgreSQL seeded tables (order matters due to FK constraints)
	for _, table := range []string{
		"order_status_histories", "order_items", "orders",
		"cart_items", "carts",
		"shipments",
		"inventory", "books_ref",
		"addresses", "user_sessions", "users",
	} {
		pgDB.Exec(fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
	}
	fmt.Println("    [✓] PostgreSQL tables truncated")

	// Clean MongoDB collections
	mongoDB := mongoClient.Database(dbName)
	for _, coll := range []string{"books", "categories", "view_event_logs"} {
		_ = mongoDB.Collection(coll).Drop(ctx)
	}
	fmt.Println("    [✓] MongoDB collections dropped")

	// Clean Neo4j
	neo4jSession := neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
	_, _ = neo4jSession.Run(ctx, "MATCH (n) DETACH DELETE n", nil)
	neo4jSession.Close(ctx)
	fmt.Println("    [✓] Neo4j nodes deleted")

	// ── Load seed data ───────────────────────────────────────────────────
	// 1. Load Postgres
	fmt.Println("  Loading PostgreSQL data...")
	pgContent, err := os.ReadFile(pgPath)
	if err == nil {
		queries := strings.Split(string(pgContent), ";")
		for _, q := range queries {
			q = strings.TrimSpace(q)
			if q != "" {
				pgDB.Exec(q)
			}
		}
	}

	// 2. Load Mongo
	fmt.Println("  Loading MongoDB data...")
	mgFile, err := os.Open(mgPath)
	if err == nil {
		scanner := bufio.NewScanner(mgFile)
		buf := make([]byte, 0, 64*1024)
		scanner.Buffer(buf, 10*1024*1024) // handle large lines
		// Match db.collection.insertOne({...});
		re := regexp.MustCompile(`db\.(\w+)\.insertOne\((.*)\);`)
		for scanner.Scan() {
			line := scanner.Text()
			matches := re.FindStringSubmatch(line)
			if len(matches) == 3 {
				collName := matches[1]
				jsonStr := matches[2]
				var doc bson.D
				if err := bson.UnmarshalExtJSON([]byte(jsonStr), true, &doc); err == nil {
					// Remap "id" → "_id" for seed files that use "id" instead of "_id".
					doc = remapIDField(doc)
					_, _ = mongoClient.Database(dbName).Collection(collName).InsertOne(ctx, doc)
				}
			}
		}
		mgFile.Close()
	}

	// 3. Load Neo4j
	fmt.Println("  Loading Neo4j data...")
	n4jContent, err := os.ReadFile(n4jPath)
	if err == nil {
		session := neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeWrite})
		defer session.Close(ctx)
		queries := strings.Split(string(n4jContent), ";")
		for _, q := range queries {
			q = strings.TrimSpace(q)
			if q != "" {
				result, err := session.Run(ctx, q, nil)
				if err == nil {
					_, _ = result.Consume(ctx)
				}
			}
		}
	}
}

// remapIDField converts a JSON "id" field to a BSON "_id" ObjectId field.
// This handles seed files where the book JSON was exported with "id" (Go json tag)
// instead of "_id" (MongoDB native). Without this, MongoDB auto-generates a new
// ObjectId causing an ID mismatch with PostgreSQL's inventory.book_id.
func remapIDField(doc bson.D) bson.D {
	hasUnderscoreID := false
	idIdx := -1
	for i, elem := range doc {
		if elem.Key == "_id" {
			hasUnderscoreID = true
			break
		}
		if elem.Key == "id" {
			idIdx = i
		}
	}

	if hasUnderscoreID || idIdx < 0 {
		return doc
	}

	// Convert string hex to ObjectId if possible
	idValue := doc[idIdx].Value
	if hexStr, ok := idValue.(string); ok {
		if oid, err := primitive.ObjectIDFromHex(hexStr); err == nil {
			idValue = oid
		}
	}

	// Replace "id" with "_id"
	doc[idIdx] = bson.E{Key: "_id", Value: idValue}
	return doc
}

func verifySeededData(ctx context.Context, pgDB *gorm.DB, mongoClient *mongo.Client, dbName string, neo4jDriver neo4j.DriverWithContext) {
	fmt.Println("--- Database Verification Report ---")
	allPassed := true

	// 1. PostgreSQL Verification
	var userCount int64
	pgDB.Model(&domain.User{}).Count(&userCount)
	fmt.Printf("[PostgreSQL] Users: %d/%d\n", userCount, TargetUsers)
	if userCount < int64(TargetUsers) {
		allPassed = false
	}

	var addrCount int64
	pgDB.Model(&domain.Address{}).Count(&addrCount)
	fmt.Printf("[PostgreSQL] Addresses: %d/%d\n", addrCount, TargetAddresses)
	if addrCount < int64(TargetAddresses) {
		allPassed = false
	}

	var bookRefCount int64
	pgDB.Table("books_ref").Count(&bookRefCount)
	fmt.Printf("[PostgreSQL] Book References: %d/%d\n", bookRefCount, TargetBooks)
	if bookRefCount < int64(TargetBooks) {
		allPassed = false
	}

	var invCount int64
	pgDB.Table("inventory").Count(&invCount)
	fmt.Printf("[PostgreSQL] Inventories: %d/%d\n", invCount, TargetBooks)
	if invCount < int64(TargetBooks) {
		allPassed = false
	}

	var cartCount int64
	pgDB.Model(&domain.Cart{}).Count(&cartCount)
	fmt.Printf("[PostgreSQL] Carts: %d/%d\n", cartCount, TargetCarts)
	if cartCount < int64(TargetCarts) {
		allPassed = false
	}

	var cartItemCount int64
	pgDB.Table("cart_items").Count(&cartItemCount)
	fmt.Printf("[PostgreSQL] Cart Items: %d/%d\n", cartItemCount, TargetCartItems)
	if cartItemCount < int64(TargetCartItems) {
		allPassed = false
	}

	var orderCount int64
	pgDB.Model(&domain.Order{}).Count(&orderCount)
	fmt.Printf("[PostgreSQL] Orders: %d/%d\n", orderCount, TargetOrders)
	if orderCount < int64(TargetOrders) {
		allPassed = false
	}

	var orderItemCount int64
	pgDB.Table("order_items").Count(&orderItemCount)
	fmt.Printf("[PostgreSQL] Order Items: %d/%d\n", orderItemCount, TargetOrderItems)
	if orderItemCount < int64(TargetOrderItems) {
		allPassed = false
	}

	var oshCount int64
	pgDB.Table("order_status_histories").Count(&oshCount)
	fmt.Printf("[PostgreSQL] Order Status Histories: %d/%d\n", oshCount, TargetOrderHistories)
	if oshCount < int64(TargetOrderHistories) {
		allPassed = false
	}

	var shipCount int64
	pgDB.Table("shipments").Count(&shipCount)
	fmt.Printf("[PostgreSQL] Shipments: %d/%d\n", shipCount, TargetOrders)
	if shipCount < int64(TargetOrders) {
		allPassed = false
	}

	// 2. MongoDB Verification
	bookColl := mongoClient.Database(dbName).Collection("books")
	bookCount, _ := bookColl.CountDocuments(ctx, bson.M{})
	fmt.Printf("[MongoDB] Books: %d/%d\n", bookCount, TargetBooks)
	if bookCount < int64(TargetBooks) {
		allPassed = false
	}

	catColl := mongoClient.Database(dbName).Collection("categories")
	catCount, _ := catColl.CountDocuments(ctx, bson.M{})
	fmt.Printf("[MongoDB] Categories: %d/%d\n", catCount, TargetCategories)
	if catCount < int64(TargetCategories) {
		allPassed = false
	}
	if duplicateSlugs, err := countDuplicateValueGroups(ctx, catColl, "slug"); err == nil {
		fmt.Printf("[MongoDB] Duplicate category slug groups: %d\n", duplicateSlugs)
		if duplicateSlugs > 0 {
			allPassed = false
		}
	} else {
		log.Printf("failed to verify duplicate category slugs: %v", err)
		allPassed = false
	}
	if duplicateNames, err := countDuplicateValueGroups(ctx, catColl, "category_name"); err == nil {
		fmt.Printf("[MongoDB] Duplicate category name groups: %d\n", duplicateNames)
		if duplicateNames > 0 {
			allPassed = false
		}
	} else {
		log.Printf("failed to verify duplicate category names: %v", err)
		allPassed = false
	}

	logColl := mongoClient.Database(dbName).Collection("view_event_logs")
	logCount, _ := logColl.CountDocuments(ctx, bson.M{})
	fmt.Printf("[MongoDB] View Logs: %d/%d\n", logCount, TargetViewLogs)
	if logCount < int64(TargetViewLogs) {
		allPassed = false
	}

	// 3. Neo4j Verification
	session := neo4jDriver.NewSession(ctx, neo4j.SessionConfig{AccessMode: neo4j.AccessModeRead})
	defer session.Close(ctx)

	result, _ := session.Run(ctx, "MATCH (b:Book) RETURN count(b) as count", nil)
	if result.Next(ctx) {
		val, _ := result.Record().Get("count")
		neoBookCount := val.(int64)
		fmt.Printf("[Neo4j] Book Nodes: %d/%d\n", neoBookCount, TargetBooks)
		if neoBookCount < int64(TargetBooks) {
			allPassed = false
		}
	}

	result, _ = session.Run(ctx, "MATCH (c:Category) RETURN count(c) as count", nil)
	if result.Next(ctx) {
		val, _ := result.Record().Get("count")
		neoCatCount := val.(int64)
		fmt.Printf("[Neo4j] Category Nodes: %d/%d\n", neoCatCount, TargetCategories)
		if neoCatCount < int64(TargetCategories) {
			allPassed = false
		}
	}
	result, _ = session.Run(ctx, "MATCH (c:Category) WITH c.slug AS slug, count(c) AS count WHERE count > 1 RETURN count(*) as count", nil)
	if result.Next(ctx) {
		val, _ := result.Record().Get("count")
		duplicateNeoCategorySlugs := val.(int64)
		fmt.Printf("[Neo4j] Duplicate Category slug groups: %d\n", duplicateNeoCategorySlugs)
		if duplicateNeoCategorySlugs > 0 {
			allPassed = false
		}
	}

	fmt.Println("-----------------------------------")

	if !allPassed {
		fmt.Println("Warning: One or more data targets were not met. Consider running 'make db-seed' again.")
	} else {
		fmt.Println("Verification complete. All data targets have been met successfully.")
	}
}
