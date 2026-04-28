# 1. Online Bookstore — Multi-Database System (N06)

> HCMUS Master — Information Systems Database Final Project  
> Group N06 — Polyglot Persistence Architecture  
> Backend: **Go 1.23** · PostgreSQL · MongoDB · Neo4j · Redis

---

## 1.1. Table of Contents

- [1. Online Bookstore — Multi-Database System (N06)](#1-online-bookstore--multi-database-system-n06)
  - [1.1. Table of Contents](#11-table-of-contents)
  - [1.2. System Overview](#12-system-overview)
  - [1.3. Architecture](#13-architecture)
- [2. Backend](#2-backend)
  - [2.1. Technology Stack](#21-technology-stack)
  - [2.2. Database Responsibilities](#22-database-responsibilities)
    - [2.2.1. PostgreSQL — Transactional Data](#221-postgresql--transactional-data)
    - [2.2.2. MongoDB — Book Catalog \& Categories](#222-mongodb--book-catalog--categories)
    - [2.2.3. Neo4j — Recommendation Engine](#223-neo4j--recommendation-engine)
    - [2.2.4. Redis — Sessions, Cart Cache \& Trending](#224-redis--sessions-cart-cache--trending)
  - [2.3. Project Structure](#23-project-structure)
  - [2.4. API Reference](#24-api-reference)
    - [2.4.1. Public](#241-public-no-authentication)
    - [2.4.2. Customer](#242-customer-jwt-role-user)
    - [2.4.3. Admin](#243-admin-jwt-role-admin)
  - [2.5. Getting Started](#25-getting-started)
    - [2.5.1. Prerequisites](#251-prerequisites)
    - [2.5.2. Quick Start with Docker](#252-quick-start-with-docker)
    - [2.5.3. Manual Setup](#253-manual-setup)
  - [2.6. Configuration](#26-configuration)
  - [2.7. Database Management](#27-database-management)
    - [2.7.1. PostgreSQL Migrations](#271-postgresql-migrations)
    - [2.7.2. Makefile DB Commands](#272-makefile-db-commands)
  - [2.8. Swagger API Docs](#28-swagger-api-docs)
- [3. Frontend](#3-frontend)

---

## 1.2. System Overview

The **Online Bookstore System** is a full-stack e-commerce application built around **Polyglot Persistence** — each business domain uses the database type best suited to its data characteristics.

| # | Data Characteristic | Technical Requirement | Selected Database |
|---|--------------------|-----------------------|-------------------|
| 1 | Transactional Data | Strong ACID, referential integrity | **PostgreSQL** |
| 2 | Catalog / Category Data | Polymorphic schema, high read frequency | **MongoDB** |
| 3 | Graph Data | Multi-dimensional relationships, graph traversal | **Neo4j** |
| 4 | Ephemeral / Cached Data | Sub-millisecond in-memory access, short TTL | **Redis** |

**Actors**

| Actor | Type | Capabilities |
|-------|------|-------------|
| Guest | Unauthenticated | Browse catalog, search books, view recommendations |
| Customer | Authenticated (`role: user`) | Shopping cart, checkout, buy-now, order history, profile |
| Admin | Authenticated (`role: admin`) | Catalog + category management, order tracking, user management, analytics |

---

## 1.3. Architecture

```
┌──────────────┐        REST / JSON        ┌──────────────────────────────────────┐
│  Next.js FE  │ ────────────────────────► │           Gin HTTP Server            │
│  (Port 3000) │ ◄──────────────────────── │    internal/server  (Port 8080)      │
└──────────────┘                           └──────────────┬───────────────────────┘
                                                          │ JWT Middleware
                                                          │ (role: user | admin)
                                           ┌──────────────▼───────────────────────┐
                                           │          internal/domain             │
                                           │   Repository Interfaces + Models     │
                                           └──────┬──────┬──────┬────────────────┘
                                                  │      │      │      │
                                        ┌─────────▼─┐ ┌──▼──┐ ┌▼────┐ ┌▼──────┐
                                        │ PostgreSQL│ │Mongo│ │Neo4j│ │Redis  │
                                        │ Users,    │ │Book │ │Reco.│ │Session│
                                        │ Orders,   │ │Cat. │ │Graph│ │Cart   │
                                        │ Inventory │ │     │ │     │ │Trend. │
                                        └───────────┘ └─────┘ └─────┘ └───────┘
                                                          ▲
                                           ┌──────────────┘
                                           │  internal/worker/trending_worker.go
                                           │  Daily cron 00:00 UTC — PSQL → Redis
                                           └──────────────────────────────────────
```

---

# 2. Backend

## 2.1. Technology Stack

| Layer | Technology |
|-------|-----------|
| Language | Go 1.23 |
| Web Framework | Gin |
| CLI | Cobra |
| Configuration | Viper (YAML + env var overrides) |
| PostgreSQL ORM | GORM + golang-migrate |
| MongoDB Driver | go.mongodb.org/mongo-driver |
| Neo4j Driver | neo4j-go-driver/v5 |
| Redis Client | go-redis/v9 |
| Redis Compression | golang/snappy (Snappy codec) |
| Authentication | JWT (golang-jwt/jwt/v5) + bcrypt |
| Logging | Zap (uber-go/zap) |
| Swagger Docs | swaggo/swag + gin-swagger |
| Background Jobs | robfig/cron/v3 |

## 2.2. Database Responsibilities

### 2.2.1. PostgreSQL — Transactional Data

Handles all business-critical data requiring ACID guarantees.

| Table | Purpose |
|-------|---------|
| `users` | Accounts with role (`user`/`admin`), bcrypt hash, active flag |
| `addresses` | Delivery addresses per user (one marked as default) |
| `books_ref` | Bridge table: MongoDB ID → active status (FK anchor for inventory, cart) |
| `inventory` | `(book_id, stock_quantity)` — `SELECT FOR UPDATE` during checkout |
| `persistent_cart_items` | Source-of-truth cart rows per user |
| `orders` | Order headers (lowercase status: `pending` → `packing` → `shipping` → `completed`/`cancelled`) |
| `order_items` | Immutable line items with price snapshot |
| `order_status_history` | Full audit trail — every status change with `old_status` (nullable) / `new_status` |
| `payments` | Payment records linked to orders |
| `shipments` | Shipment tracking records linked to orders |

**Order status lifecycle:**
```
pending → packing → shipping → completed
                  ↘ cancelled (from any state)
```
Initial `order_status_history` row created on order creation: `old_status = NULL`, `new_status = 'pending'`.

### 2.2.2. MongoDB — Book Catalog & Categories

Stores flexible, polymorphic book documents and category hierarchy.

**`books` collection** — V2 document structure:
```json
{
  "_id": "ObjectID",
  "name": "Book Title",
  "shortDescription": "...",
  "detailDescription": "...",
  "productStatus": "active",
  "pricing": { "price": 29.99 },
  "category": { "categoryId": "..." },
  "images": [{ "isPrimary": true, "alt": "...", "url": "..." }],
  "series": { "seriesId": "...", "seriesName": "...", "sequenceNo": 1 },
  "authors": [{ "authorId": "...", "slug": "...", "authorName": "..." }],
  "tags": [{ "tagId": "...", "tagName": "..." }],
  "importedAt": "2024-01-01T00:00:00Z"
}
```

**`categories` collection** — hierarchy via `parentCategory` reference.

Indexes defined in `db/mongo/indexes/books_indexes.json`.

### 2.2.3. Neo4j — Recommendation Engine

Similarity scoring: `score = 0.5 × categoryOverlap + 0.33 × authorOverlap + 0.17 × publisherOverlap`

**V2 Relationship types:**
```cypher
(Book)-[:WRITTEN_BY]->(Author)
(Book)-[:BELONGS_TO]->(Category)
(Book)-[:PUBLISHED_BY]->(Publisher)
(Book)-[:HAS_TAG]->(Tag)
(Book)-[:IN_SERIES {sequence_no}]->(Series)
(User)-[:VIEWED {viewedAt}]->(Book)
(User)-[:PURCHASED {purchasedAt, orderId, quantity}]->(Book)
(Book)-[:SIMILAR_TO {score, computedAt}]->(Book)
```

### 2.2.4. Redis — Sessions, Cart Cache & Trending

All values are **Snappy-compressed JSON** for reduced memory footprint.

| Key Pattern | TTL | Purpose |
|-------------|-----|---------|
| `users:current_sessions:{userID}` | 7 days | Active JWT token |
| `users:blacklist_sessions:{token}` | 3 days | Revoked tokens |
| `users:carts:{userID}` | 3 days | Cart cache (PSQL is source of truth) |
| `users:checkouts:{sessionID}` | 15 min | Buy-Now temporary session |
| `books:details:{bookID}` | 10 min | Book detail cache |
| `books:newest` | 30 min | Newest books list cache |
| `books:stocks:{bookID}` | 5 min | Stock quantity cache |
| `books:trendings` | Sorted Set | Sales score per book |
| `books:trendings:cache` | Persistent | Pre-computed top-N JSON (refreshed daily) |

---

## 2.3. Project Structure

```
backend/
├── main.go                          # Entry point → @swagger annotations + cmd.Run
├── go.mod / go.sum
├── Makefile
├── docker-compose.yml               # PostgreSQL, MongoDB, Neo4j, Redis services
├── .env.example
│
├── cmd/
│   ├── cmd.go                       # Cobra root + docs import
│   └── server.go                    # DB connections, repo wiring, Gin server, worker, graceful shutdown
│
├── config/
│   ├── config.go                    # Typed Config struct + Viper loader
│   └── default.go                   # Embedded YAML defaults
│
├── docs/                            # swag-generated Swagger UI assets
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
│
├── internal/
│   ├── server/                      # HTTP layer (Gin handlers)
│   │   ├── server.go                # Route groups + Swagger route
│   │   ├── service.go               # Service struct (all repos + jwtCfg)
│   │   ├── response.go              # Unified JSON response helpers
│   │   ├── user.go                  # Register, Login, Logout, GetProfile, UpdateProfile
│   │   ├── book.go                  # SearchBooks, GetBookDetail, GetNewBooks, ViewBook
│   │   ├── cart.go                  # AddToCart, GetCart, UpdateCartItem, RemoveCartItem
│   │   ├── order.go                 # Checkout (atomic TX), BuyNow, GetOrderHistory, GetOrderDetail
│   │   ├── recommendation.go        # GetSimilarBooks, GetSeriesBooks, GetTrending
│   │   ├── admin_book.go            # AdminCreate/Update/Delete/Stock (MongoDB + PG + Neo4j)
│   │   ├── admin_order.go           # AdminListOrders, AdminGetOrder, AdminUpdateOrderStatus, AdminGetOrderHistory
│   │   ├── admin_user.go            # AdminListUsers, AdminGetUser, AdminDeactivateUser, AdminGetSales
│   │   └── admin_category.go        # AdminListCategories, AdminCreateCategory, AdminUpdate/DeleteCategory (MongoDB)
│   │
│   ├── domain/
│   │   ├── model.go                 # All domain structs + OrderStatus/UserRole enums + weight constants
│   │   ├── repository.go            # All repository interfaces + PostgresTransactor
│   │   └── dto.go                   # Request / Response DTOs
│   │
│   ├── middleware/
│   │   ├── auth.go                  # RequireAuth, RequireUser, RequireAdmin
│   │   └── constants.go             # Context keys
│   │
│   ├── repository/
│   │   ├── postgres/                # address.go, inventory.go, cart_persistent.go,
│   │   │                            # order_status_history.go, order.go, user.go, postgres.go
│   │   ├── mongo/                   # book.go, category.go
│   │   ├── neo4j/                   # recommendation.go (V2 relationships + RecordViewed/Purchased)
│   │   └── redis/                   # session.go, cart.go, trending.go,
│   │                                # checkout_session.go, book_cache.go
│   │
│   └── worker/
│       └── trending_worker.go       # Daily cron 00:00 UTC — PSQL aggregate → Redis
│
├── utils/
│   ├── database/                    # ConnectPostgres, ConnectMongo, ConnectNeo4j, ConnectRedis
│   ├── redis/compress.go            # Snappy Encode/Decode wrappers
│   ├── token/jwt.go                 # GenerateToken, ParseToken
│   ├── password/bcrypt.go           # HashPassword, CheckPassword
│   └── log/log.go                   # Zap logger factory
│
└── db/
    ├── postgres/
    │   ├── migrations/              # 9 migration pairs (3 baseline + 6 V2)
    │   ├── queries/                 # Named SQL (user.sql, order.sql)
    │   └── store/                   # sqlc-generated typed code
    ├── mongo/indexes/
    │   └── books_indexes.json       # Index definitions for books + categories collections
    └── neo4j/
        ├── migrations/              # Cypher constraint files (init + V2 relationships)
        └── queries/                 # similar_books.cypher, series_books.cypher
```

---

## 2.4. API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs: `http://localhost:8080/swagger/index.html`

### 2.4.1. Public (no authentication)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Create a new customer account |
| `POST` | `/auth/login` | Authenticate and receive JWT |
| `GET` | `/books` | Search books (`search`, `author`, `publisher`, `year`, `min_price`, `max_price`, `page`, `page_size`) |
| `GET` | `/books/new` | Newest books (`limit`) |
| `GET` | `/books/:id` | Book detail with stock |
| `GET` | `/books/:id/similar` | Neo4j similar-book recommendations |
| `GET` | `/books/:id/series` | All volumes in the same series |
| `GET` | `/trending` | Redis top-N bestsellers |

### 2.4.2. Customer (JWT, `role: user`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/logout` | Revoke JWT (Redis blacklist) |
| `GET` | `/users/me` | View own profile |
| `PUT` | `/users/me` | Update name / phone / default address |
| `GET` | `/cart` | Get cart (Redis cache → PSQL fallback) |
| `POST` | `/cart` | Add / update item (PSQL + Redis) |
| `PUT` | `/cart/:bookId` | Update item quantity |
| `DELETE` | `/cart/:bookId` | Remove item |
| `POST` | `/orders/checkout` | Checkout from cart or buy-now session |
| `POST` | `/orders/buy-now` | Create a 15-min buy-now session for a single book |
| `GET` | `/orders` | List own orders |
| `GET` | `/orders/:id` | Order detail |
| `POST` | `/books/:id/view` | Record a book view in Neo4j (for recommendations) |

> Admin accounts (`role: admin`) are blocked from all customer purchase endpoints.

### 2.4.3. Admin (JWT, `role: admin`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/admin/books` | List books with stock |
| `POST` | `/admin/books` | Create book (MongoDB + PG + Neo4j) |
| `PUT` | `/admin/books/:id` | Update book metadata |
| `DELETE` | `/admin/books/:id` | Soft-delete (`is_active=false`) |
| `PATCH` | `/admin/books/:id/stock` | Set stock quantity in inventory |
| `GET` | `/admin/categories` | List categories (MongoDB) |
| `POST` | `/admin/categories` | Create category (MongoDB) |
| `PUT` | `/admin/categories/:id` | Update category (MongoDB) |
| `DELETE` | `/admin/categories/:id` | Delete category (MongoDB) |
| `GET` | `/admin/orders` | List all orders (filter: `status`) |
| `GET` | `/admin/orders/:id` | Full order detail |
| `PATCH` | `/admin/orders/:id/status` | Update order status + write history row |
| `GET` | `/admin/orders/:id/history` | Order status change audit trail |
| `GET` | `/admin/users` | List all users |
| `GET` | `/admin/users/:id` | View any user |
| `PATCH` | `/admin/users/:id/deactivate` | Activate / deactivate account |
| `GET` | `/admin/analytics/trending` | Trending scores from Redis |
| `GET` | `/admin/analytics/sales` | Sales summary by date range |

---

## 2.5. Getting Started

### 2.5.1. Prerequisites

- Go 1.23+
- Docker + Docker Compose (recommended)
- OR: PostgreSQL 16, MongoDB 7, Neo4j 5, Redis 7 (manual)
- [`golang-migrate`](https://github.com/golang-migrate/migrate) CLI
- [`swag`](https://github.com/swaggo/swag) CLI (for regenerating Swagger docs)

### 2.5.2. Quick Start with Docker

```bash
cd hcmus-master-is-db/backend

# 1. Copy and configure environment
cp .env.example .env

# 2. Start all 4 databases
make db-start

# 3. Apply PostgreSQL migrations
make db-init-pg

# 4. Apply Neo4j constraints
make db-init-neo4j

# 5. Create MongoDB collections
make db-init-mongo

# 6. Verify Redis
make db-init-redis

# 7. Start the API server
make run
# → http://localhost:8080
# → http://localhost:8080/swagger/index.html
```

### 2.5.3. Manual Setup

```bash
go mod tidy
cp .env.example .env
# Edit .env with your database credentials

make migrate-up
make run
```

---

## 2.6. Configuration

All settings have embedded defaults and can be overridden via environment variables using `__` as the nested key separator.

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `ENV` | `development` | Runtime environment |
| `SERVER__PORT` | `8080` | HTTP listen port |
| `POSTGRES__HOST` | `localhost` | PostgreSQL host |
| `POSTGRES__PORT` | `5432` | PostgreSQL port |
| `POSTGRES__DB` | `bookstore` | Database name |
| `POSTGRES__USER` | `postgres` | Username |
| `POSTGRES__PASSWORD` | `secret` | Password |
| `POSTGRES__SSLMODE` | `disable` | SSL mode |
| `MONGO__URI` | `mongodb://localhost:27017` | MongoDB connection URI |
| `MONGO__DB` | `bookstore` | Database name |
| `NEO4J__URI` | `bolt://localhost:7687` | Neo4j Bolt URI |
| `NEO4J__USER` | `neo4j` | Username |
| `NEO4J__PASSWORD` | `password` | Password |
| `REDIS__ADDR` | `localhost:6379` | Redis address |
| `REDIS__PASSWORD` | _(empty)_ | Redis password |
| `REDIS__DB` | `0` | Redis logical DB index |
| `JWT__SECRET` | _(change this!)_ | HMAC signing secret |
| `JWT__ACCESS_TTL` | `24h` | Token expiry duration |
| `LOGGER__LEVEL` | `info` | Log level |

---

## 2.7. Database Management

### 2.7.1. PostgreSQL Migrations

Migrations are managed by **golang-migrate** and live in `db/postgres/migrations/`.

| File | Description |
|------|-------------|
| `202604231400_create_users` | `users` table, `user_role` enum |
| `202604231401_create_books_ref` | `books_ref` bridge table |
| `202604231402_create_orders` | `orders`, `order_items`, `order_status` enum |
| `202604281400_create_addresses` | `addresses` table |
| `202604281401_add_packing_status` | Add `packing` to `order_status`; `address_id`, `note` to `orders` |
| `202604281402_create_inventory` | `inventory(book_id, stock_quantity)` |
| `202604281403_create_persistent_cart` | `persistent_cart_items` |
| `202604281404_create_payments_shipments` | `payments`, `shipments` |
| `202604281405_create_order_status_history` | `order_status_history` audit trail |

### 2.7.2. Makefile DB Commands

```bash
make db-start         # docker-compose up -d (all 4 DBs)
make db-stop          # docker-compose down
make db-logs          # Follow container logs
make db-init-pg       # Apply PostgreSQL migrations
make db-admin-pg      # Create bookstore_admin PG role
make db-init-mongo    # Create MongoDB collections
make db-init-neo4j    # Apply Neo4j constraints/indexes
make db-init-redis    # Ping Redis to verify connection
make swagger-gen      # Regenerate docs/ from @swag annotations
```

Full command reference:

| Command | Description |
|---------|-------------|
| `make run` | Start API server (reads `.env`) |
| `make build` | Compile binary to `bin/bookstore-api` |
| `make dev` | Live reload via `air` |
| `make tidy` | `go mod tidy` |
| `make migrate-up` | Apply all pending PostgreSQL migrations |
| `make migrate-down` | Roll back one migration |
| `make migrate-create NAME=<n>` | Create a new migration pair |
| `make sqlc-generate` | Regenerate typed query code |
| `make swagger-gen` | Regenerate Swagger API docs |
| `make clean` | Remove build artifacts |

---

## 2.8. Swagger API Docs

Swagger UI is available at **`http://localhost:8080/swagger/index.html`** when the server is running.

To regenerate docs after modifying handler annotations:

```bash
make swagger-gen
```

Generated files committed to `docs/` (docs.go, swagger.json, swagger.yaml).

---

# 3. Frontend

> Documentation for the frontend (Next.js) will be added here once implemented.
