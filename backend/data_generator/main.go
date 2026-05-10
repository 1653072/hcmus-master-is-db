package main

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/domain"
	neo4jrepo "bookstore/backend/internal/repository/neo4j"
	"bookstore/backend/utils/database"
	"bookstore/backend/utils/password"
	"bufio"
	"context"
	"encoding/json"
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

type ExportFiles struct {
	Postgres *os.File
	Mongo    *os.File
	Neo4j    *os.File
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

	seedAddresses(pgDB, users, exports)
	fmt.Println("Seeded addresses")

	// 7. Seed Carts & Cart Items (Postgres)
	seedCarts(pgDB, users, books, exports)
	fmt.Println("Seeded carts and cart items")

	// 8. Seed Orders & Related (Postgres)
	seedOrders(pgDB, users, books, exports)
	fmt.Println("Seeded orders, items, history, payments, and shipments")

	// 9. Seed View Event Logs (Mongo)
	seedViewLogs(ctx, mongoClient, cfg.Mongo.DB, users, books, exports)
	fmt.Println("Seeded view event logs")

	fmt.Println("Data seeding and export completed successfully!")
	fmt.Println("Files saved to ./data_generator/data/")
}

func seedCategories(ctx context.Context, client *mongo.Client, dbName string, neoRepo *neo4jrepo.RecommendationRepository, exports *ExportFiles) []*domain.Category {
	coll := client.Database(dbName).Collection("categories")
	var categories []*domain.Category

	for i := 0; i < int(TargetCategories*1.5); i++ {
		cat := &domain.Category{
			ID:           primitive.NewObjectID().Hex(),
			CategoryName: gofakeit.BookGenre(),
			Slug:         gofakeit.UUID(),
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if len(categories) > 10 && rand.Float32() < 0.3 {
			parent := categories[rand.Intn(len(categories))]
			cat.ParentCategory = parent.ID
		}

		_, _ = coll.InsertOne(ctx, cat)
		_ = neoRepo.UpsertCategoryNode(ctx, cat)

		// Export
		// We need the JSON to have "_id" instead of "id" so that mongo_seed.json will insert with the exact ID.
		var m map[string]interface{}
		b, _ := json.Marshal(cat)
		json.Unmarshal(b, &m)
		m["_id"] = map[string]string{"$oid": m["id"].(string)}
		delete(m, "id")
		jsonData, _ := json.Marshal(m)
		exports.Mongo.WriteString(fmt.Sprintf("db.categories.insertOne(%s);\n", string(jsonData)))
		exports.Neo4j.WriteString(fmt.Sprintf("MERGE (c:Category {categoryId: '%s'}) SET c.name = '%s', c.slug = '%s';\n", cat.ID, cat.CategoryName, cat.Slug))
		if cat.ParentCategory != "" {
			exports.Neo4j.WriteString(fmt.Sprintf("MATCH (p:Category {categoryId: '%s'}), (c:Category {categoryId: '%s'}) MERGE (p)-[:PARENT_OF]->(c);\n", cat.ParentCategory, cat.ID))
		}

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
		book := domain.Book{
			ID:                mongoID,
			Name:              bookName,
			ShortDescription:  gofakeit.Sentence(10),
			DetailDescription: gofakeit.Paragraph(2, 5, 10, "\n"),
			ProductStatus:     "active",
			Pricing:           domain.BookPricing{Price: price},
			Category:          domain.BookCategory{CategoryID: cat.ID},
			ImportedAt:        time.Now(),
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

		_ = neoRepo.UpsertBookNode(ctx, domain.BookNode{
			MongoID:    mongoID,
			Title:      book.Name,
			IsActive:   true,
			Categories: []string{cat.CategoryName},
			Authors:    authorNames,
			Publisher:  gofakeit.Company(),
			Tags:       tagNames,
		})

		// Export
		// We need the JSON to have "_id" instead of "id" so that mongo_seed.json will insert with the exact ID.
		var m map[string]interface{}
		b, _ := json.Marshal(book)
		json.Unmarshal(b, &m)
		m["_id"] = map[string]string{"$oid": m["id"].(string)}
		delete(m, "id")
		jsonData, _ := json.Marshal(m)
		exports.Mongo.WriteString(fmt.Sprintf("db.books.insertOne(%s);\n", string(jsonData)))
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO books_ref (mongo_id, is_active) VALUES ('%s', true);\n", mongoID))
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO inventory (book_id, stock_quantity, updated_at) VALUES ('%s', %d, NOW());\n", mongoID, stock))
		exports.Neo4j.WriteString(fmt.Sprintf("MERGE (b:Book {mongo_id: '%s'}) SET b.title = '%s', b.is_active = true;\n", mongoID, book.Name))

		bookIDs = append(bookIDs, mongoID)
	}
	return bookIDs
}

func seedUsers(pgDB *gorm.DB, hash string, exports *ExportFiles) []domain.User {
	var users []domain.User
	for i := 0; i < int(TargetUsers*1.5); i++ {
		aliasID := uuid.New()
		user := domain.User{
			AliasID:      aliasID,
			FullName:     gofakeit.Name(),
			Email:        gofakeit.Email() + aliasID.String()[:8],
			Phone:        gofakeit.Phone(),
			PasswordHash: hash,
			Role:         domain.RoleUser,
			IsActive:     true,
			CreatedAt:    time.Now(),
		}
		if err := pgDB.Create(&user).Error; err != nil {
			continue
		}
		users = append(users, user)

		// Export
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO users (alias_id, full_name, email, phone, password_hash, role, is_active, created_at) VALUES ('%s', '%s', '%s', '%s', '%s', 'user', true, NOW());\n",
			user.AliasID, user.FullName, user.Email, user.Phone, user.PasswordHash))
	}
	return users
}

func seedAddresses(pgDB *gorm.DB, users []domain.User, exports *ExportFiles) {
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

		// Export (Note: user_id is internal, so we use a subquery for the export file to be usable)
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO addresses (alias_id, user_id, receiver_name, phone, address_line, city, is_default, created_at) SELECT '%s', id, '%s', '%s', '%s', '%s', true, NOW() FROM users WHERE alias_id = '%s';\n",
			addr.AliasID, addr.ReceiverName, addr.Phone, addr.AddressLine, addr.City, user.AliasID))
	}
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

func seedOrders(pgDB *gorm.DB, users []domain.User, books []string, exports *ExportFiles) {
	statuses := []domain.OrderStatus{
		domain.OrderStatusPending, domain.OrderStatusConfirmed,
		domain.OrderStatusPacking, domain.OrderStatusShipping,
		domain.OrderStatusCompleted, domain.OrderStatusCancelled,
	}

	for i := 0; i < int(TargetOrders*1.5); i++ {
		user := users[rand.Intn(len(users))]
		status := statuses[rand.Intn(len(statuses))]
		order := domain.Order{
			AliasID:     uuid.New(),
			UserID:      user.ID,
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

		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO orders (alias_id, user_id, status, total_amount, created_at) SELECT '%s', id, '%s', 0, '%s' FROM users WHERE alias_id = '%s';\n",
			order.AliasID, status, order.CreatedAt.Format("2006-01-02 15:04:05"), user.AliasID))

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
				bookID, gofakeit.BookTitle(), qty, price, order.AliasID))
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

		// Payment & Shipment
		payment := domain.Payment{
			AliasID:   uuid.New(),
			OrderID:   order.ID,
			Method:    "COD",
			Status:    "completed",
			Amount:    total,
			CreatedAt: order.CreatedAt,
		}
		pgDB.Create(&payment)
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO payments (alias_id, order_id, method, status, amount, created_at) SELECT gen_random_uuid(), id, 'COD', 'completed', %f, '%s' FROM orders WHERE alias_id = '%s';\n",
			total, order.CreatedAt.Format("2006-01-02 15:04:05"), order.AliasID))

		shipment := domain.Shipment{
			AliasID:        uuid.New(),
			OrderID:        order.ID,
			Status:         "shipped",
			Carrier:        "FastDelivery",
			TrackingNumber: gofakeit.UUID(),
			CreatedAt:      order.CreatedAt,
		}
		pgDB.Create(&shipment)
		exports.Postgres.WriteString(fmt.Sprintf("INSERT INTO shipments (alias_id, order_id, status, carrier, tracking_no, created_at) SELECT gen_random_uuid(), id, 'shipped', 'FastDelivery', '%s', '%s' FROM orders WHERE alias_id = '%s';\n",
			shipment.TrackingNumber, order.CreatedAt.Format("2006-01-02 15:04:05"), order.AliasID))
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
		if _, err := coll.InsertOne(ctx, logEntry); err != nil {
			continue
		}
		var m map[string]interface{}
		b, _ := json.Marshal(logEntry)
		json.Unmarshal(b, &m)
		m["_id"] = map[string]string{"$oid": m["id"].(string)}
		delete(m, "id")
		jsonData, _ := json.Marshal(m)
		exports.Mongo.WriteString(fmt.Sprintf("db.view_event_logs.insertOne(%s);\n", string(jsonData)))
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
		// Match db.collection.insertOne({...});
		re := regexp.MustCompile(`db\.(\w+)\.insertOne\((.*)\);`)
		for scanner.Scan() {
			line := scanner.Text()
			matches := re.FindStringSubmatch(line)
			if len(matches) == 3 {
				collName := matches[1]
				jsonStr := matches[2]
				var doc interface{}
				if err := bson.UnmarshalExtJSON([]byte(jsonStr), true, &doc); err == nil {
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
				_, _ = session.Run(ctx, q, nil)
			}
		}
	}
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

	var payCount int64
	pgDB.Table("payments").Count(&payCount)
	fmt.Printf("[PostgreSQL] Payments: %d/%d\n", payCount, TargetOrders)
	if payCount < int64(TargetOrders) {
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

	fmt.Println("-----------------------------------")

	if !allPassed {
		fmt.Println("Warning: One or more data targets were not met. Consider running 'make db-seed' again.")
	} else {
		fmt.Println("Verification complete. All data targets have been met successfully.")
	}
}
