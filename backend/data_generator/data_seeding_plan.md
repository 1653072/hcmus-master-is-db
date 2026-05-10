# Data Seeding Plan — Bookstore Polyglot System

This plan describes the strategy for initializing large-scale sample data (100,000+ records) for the bookstore system, ensuring consistency between PostgreSQL, MongoDB, and Neo4j.

## 1. Volume Targets

### PostgreSQL (Transactional)
- `users`: 10,000+
- `addresses`: 10,000+
- `books_ref`: 2,000+
- `inventory`: 2,000+
- `carts`: 2,000+
- `cart_items`: 5,000+
- `orders`: 5,000+
- `order_items`: 10,000+
- `order_status_histories`: 10,000+
- `payments`: 5,000+
- `shipments`: 5,000+

### MongoDB (Catalog & Logs)
- `books`: 2,000+
- `categories`: 500+
- `view_event_logs`: 10,000+

### Neo4j (Graph)
- Sync all `Books`, `Authors`, `Categories`, `Tags` from MongoDB.
- Create `WRITTEN_BY`, `BELONGS_TO`, `SIMILARITY_TO` relationships.

## 2. Execution Strategy

Initialization must follow the Dependency Tree order to ensure Foreign Key and Reference Integrity:

### Step 1: Initialize Categories
- Create 500+ categories in MongoDB.
- Sync to Neo4j as `Category` nodes.
- Establish random `PARENT_OF` relationships to create a tree structure.

### Step 2: Initialize Books
- Create 2,000+ books in MongoDB.
- Randomly assign each book to a `Category` created in Step 1.
- **Important:** For each book created:
    - Save `mongo_id` to PostgreSQL `books_ref`.
    - Create an `inventory` record with a random quantity (10 - 500).
    - Create a `Book` node in Neo4j and connect `BELONGS_TO`, `WRITTEN_BY` relationships.

### Step 3: Initialize Users & Addresses
- Create 10,000+ users in PostgreSQL.
- Create 10,000+ addresses, randomly assigning a `user_id` from the user list.

### Step 4: Initialize Carts & Cart Items
- Randomly select 2,000 users to create carts.
- Create 5,000+ `cart_items` by randomly selecting books from `books_ref`.

### Step 5: Initialize Orders & Related Data
- Create 5,000+ orders.
- For each order:
    - Create 1-5 `order_items`.
    - Create 1-3 `order_status_histories` records (simulating the process from `pending` to `completed`).
    - Create 1 `payments` record.
    - Create 1 `shipments` record.

### Step 6: Initialize Logs (View Event Logs)
- Create 10,000+ logs in MongoDB.
- Randomly assign `userId` (alias_id) and `bookId` (mongo_id).

## 3. Tools Used
- **Language:** Go
- **Fake Library:** `github.com/brianvoe/gofakeit/v6`
- **Drivers:** GORM (Postgres), Mongo Go Driver, Neo4j Go Driver.

## 4. How to Run
```bash
cd backend/data_generator
go run main.go
```
