# Online Bookstore — Multi-Database System (N06)

> HCMUS Master — Information Systems Database Final Project
> Group N06 — Polyglot Persistence Architecture
> Backend: **Go 1.23** · PostgreSQL · MongoDB · Neo4j · Redis
> Frontend: **Next.js 14** · React 18 · TypeScript · Tailwind CSS · Zustand

---

## Table of Contents

- [1. System Overview](#1-system-overview)
  - [1.1. Business Context](#11-business-context)
  - [1.2. Database Selection Matrix](#12-database-selection-matrix)
  - [1.3. Business Requirements (NV)](#13-business-requirements-nv)
  - [1.4. Actors](#14-actors)
- [2. Architecture](#2-architecture)
  - [2.1. Overall System Architecture](#21-overall-system-architecture)
  - [2.2. Key Data Flows](#22-key-data-flows)
- [3. Database Responsibilities](#3-database-responsibilities)
  - [3.1. PostgreSQL — Transactional Data](#31-postgresql--transactional-data)
  - [3.2. MongoDB — Catalog, Categories & Event Logs](#32-mongodb--catalog-categories--event-logs)
  - [3.3. Neo4j — Recommendation Graph](#33-neo4j--recommendation-graph)
  - [3.4. Redis — Cache, Sessions & Rankings](#34-redis--cache-sessions--rankings)
- [4. Backend](#4-backend)
  - [4.1. Technology Stack](#41-technology-stack)
  - [4.2. Project Structure](#42-project-structure)
  - [4.3. Background Workers](#43-background-workers)
  - [4.4. Redis Feature Flags](#44-redis-feature-flags)
- [5. API Reference](#5-api-reference)
  - [5.1. Public](#51-public-no-authentication)
  - [5.2. Customer](#52-customer-jwt-role-user)
  - [5.3. Admin](#53-admin-jwt-role-admin)
- [6. Getting Started](#6-getting-started)
  - [6.1. Prerequisites](#61-prerequisites)
  - [6.2. Quick Start with Docker](#62-quick-start-with-docker)
  - [6.3. Manual Setup](#63-manual-setup)
- [7. Configuration](#7-configuration)
  - [7.1. Database & Server Settings](#71-database--server-settings)
  - [7.2. Redis Feature Flags](#72-redis-feature-flags)
- [8. Database Management](#8-database-management)
  - [8.1. PostgreSQL Migrations](#81-postgresql-migrations)
  - [8.2. Makefile Commands](#82-makefile-commands)
- [9. Swagger API Docs](#9-swagger-api-docs)
- [10. Frontend](#10-frontend)
  - [10.1. Technology Stack](#101-technology-stack)
  - [10.2. Project Structure](#102-project-structure)
  - [10.3. Pages & Routing](#103-pages--routing)
  - [10.4. State Management](#104-state-management)
  - [10.5. API Client Layer](#105-api-client-layer)
  - [10.6. Component Architecture](#106-component-architecture)
  - [10.7. Getting Started](#107-getting-started)

---

## 1. System Overview

### 1.1. Business Context

The **Online Bookstore System** (`hcmus-master-is-db`) is a full-stack e-commerce platform built around **Polyglot Persistence** — each business domain uses the database type that best matches its data characteristics.

The system solves four core technical challenges:

| Challenge | Solution |
|---|---|
| Polymorphic book attributes (hardcover, boxset, special editions) | MongoDB flexible document store |
| High-concurrency flash sales — cart & checkout without data loss | Redis in-memory cache + PostgreSQL pessimistic locking |
| Smart book recommendations (same series, similar by author/genre) | Neo4j graph traversal |
| Transaction integrity — deduct stock and create order atomically | PostgreSQL ACID transactions |

---

### 1.2. Database Selection Matrix

| # | Data Characteristic | Technical Requirement | Selected Database |
|---|---|---|---|
| 1 | Transactional Data | Strong ACID, referential integrity | **PostgreSQL** |
| 2 | Catalog / Category Data | Polymorphic schema, high read frequency | **MongoDB** |
| 3 | Graph Data | Multi-dimensional relationships, graph traversal | **Neo4j** |
| 4 | Ephemeral / Cached Data | Sub-millisecond in-memory access, short TTL | **Redis** |

---

### 1.3. Business Requirements (NV)

| Code | Feature | PostgreSQL | MongoDB | Redis | Neo4j |
|---|---|:---:|:---:|:---:|:---:|
| **A1** | Register account | ✓ | | ✓ | |
| **A2** | Login | ✓ | | ✓ | |
| **A3** | Logout | | | ✓ | |
| **A4** | View & update profile | ✓ | | ✓ | |
| **B1** | Search & filter products | | ✓ | | |
| **B2** | View product detail | ✓ | ✓ | ✓ | ✓ |
| **B3** | View newest books | | ✓ | ✓ | |
| **C1** | Add to cart | ✓ | | ✓ | |
| **C2** | View & edit cart | ✓ | ✓ | ✓ | |
| **C3** | Buy Now | ✓ | | ✓ | |
| **D1** | Create order (Checkout) | ✓ | | ✓ | ✓ |
| **D2** | View order history | ✓ | | ✓ | |
| **D3** | View order detail | ✓ | ✓ | | |
| **E1** | Related product recommendations | | ✓ | ✓ | ✓ |
| **E2** | Best Seller (Top 10 by purchases/30d) | ✓ | ✓ | ✓ | |
| **E3** | Most Viewed (daily + 30-day) | | ✓ | ✓ | |
| **F1** | Update order status | ✓ | | ✓ | |
| **F2** | Manage products | ✓ | ✓ | ✓ | ✓ |
| **F3** | Manage inventory | ✓ | | ✓ | |
| **F4** | Manage categories | | ✓ | ✓ | ✓ |

---

### 1.4. Actors

| Actor | Type | Capabilities |
|---|---|---|
| **Guest** | Unauthenticated | Browse catalog, search, view recommendations, most-viewed, best-sellers |
| **Customer** | Authenticated (`role: user`) | Full shopping: cart, checkout, buy-now, order history, profile |
| **System** | Automated | Daily workers: compute best-sellers & most-viewed, refresh Redis caches |
| **Admin** | Authenticated (`role: admin`) | Catalog + category + order + user management, analytics |

---

## 2. Architecture

### 2.1. Overall System Architecture

```text
┌──────────────────┐      REST / JSON (HTTPS)      ┌────────────────────────────────────────────┐
│     Next.js      │ ────────────────────────────► │              Gin HTTP Server               │
│    Frontend      │ ◄──────────────────────────── │        internal/server  (Port 8080)        │
│   (Port 3000)    │                               └─────────────────────┬──────────────────────┘
└──────────────────┘                                                     │
                                                           JWT Authentication Middleware
                                                     (RequireAuth / RequireUser / RequireAdmin)
                                                                         │
                                               ┌─────────────────────────▼──────────────────────┐
                                               │                internal/domain                 │
                                               │      Repository Interfaces + Domain Models     │
                                               └──────┬───────────┬────────────┬───────────┬────┘
                                                      │           │            │           │
                 ┌────────────────────────────────────┘           │            │           └──────────────────────────────────┐
                 │                                                │            │                                              │
      ┌──────────▼──────────┐                          ┌──────────▼────────┐ ┌────▼──────────────┐                     ┌──────▼──────────────┐
      │     PostgreSQL      │                          │      MongoDB      │ │       Neo4j       │                     │        Redis        │
      │    (Port 5432)      │                          │    (Port 27017)   │ │    (Port 7687)    │                     │    (Port 6379)      │
      ├─────────────────────┤                          ├───────────────────┤ ├───────────────────┤                     ├─────────────────────┤
      │ users               │                          │ books             │ │ Book              │                     │ Sessions            │
      │ addresses           │                          │ categories        │ │ Author            │                     │ Cart cache          │
      │ books_ref           │                          │ view_event_logs   │ │ Category          │                     │ Best sellers        │
      │ inventory           │                          └──────────▲────────┘ │ Publisher         │                     │ Most viewed         │
      │ carts               │                                     │          │ Tag               │                     │ Order history       │
      │ cart_items          │                                     │          │ Series            │                     │ Category list       │
      │ orders              │                                     │          └───────────────────┘                     │ Buy-now session     │
      │ order_items         │                                     │                                                    └──────────▲──────────┘
      │ order_status        │                                     │                                                               │
      │  _histories         │                                     │                internal/worker/                               │
      │ shipments           │                                     └─────── best_seller_worker.go  (daily 17:00 UTC) ──────────────┘
      └──────────▲──────────┘                                              → Query PostgreSQL order_items (past 30 days)
                 │                                                        → Write top-10 JSON to Redis "books:best_sellers"
                 │
                 └──────────────────────────────────────────────────────── most_viewed_worker.go  (daily 17:00 UTC)
                                                                           → Aggregate MongoDB view_event_logs (past 30 days)
                                                                           → Write JSON to Redis "books:most_viewed:30d:data"
                                                                           → DEL "books:most_viewed:daily:count"
                                                                           → DEL "books:most_viewed:daily:data"
```

---

### 2.2. Key Data Flows

#### Shopping Flow (C → D)
1. **Add to Cart** → check stock (Redis cache → PostgreSQL) → `GetOrCreateCartByUserID` → upsert `cart_items` (PostgreSQL) → refresh Redis cart cache
2. **Checkout** (single PostgreSQL ACID transaction):
   - `SELECT inventory FOR UPDATE` per book (pessimistic lock — prevents overselling)
   - `DELETE cart_items` via `carts` cascade
   - `INSERT orders` + `INSERT order_items` (price snapshot at purchase time)
   - `UPDATE inventory stock_quantity` (deduct purchased quantity)
   - `INSERT order_status_histories` (`old_status = NULL`, `new_status = 'pending'`)
3. **After transaction**: invalidate Redis cart cache + order-history cache + stale stock cache entries

#### View Book Flow (B2 + E3)
1. Fetch book from Redis cache (on hit) or MongoDB + PostgreSQL (on miss, for stock data).
2. `POST /books/:id/view` →
   - Insert `EventLog` document into MongoDB `view_event_logs` (persistent source of truth for 30-day aggregate).
   - `ZINCRBY books:most_viewed:daily:count 1 {bookID}` in Redis (feature-flag guarded by `FEATURES_REDIS_MOST_VIEWED_DAILY`).
   - **No Neo4j write** — user behaviour is stored in MongoDB only.

#### Recommendation Flow (E1 + E2 + E3)
| Feature | Source | Endpoint |
|---|---|---|
| Related books | Neo4j: pre-computed `SIMILARITY_TO` edges (computed on book upsert) with live traversal fallback | `GET /books/:id/similar` |
| Same series | Neo4j `IN_SERIES` relationships ordered by `sequence_no` | `GET /books/:id/series` |
| Best Seller (top 10) | Redis `books:best_sellers` JSON STRING — refreshed daily at 17:00 UTC (00:00 GMT+7) from PostgreSQL order_items | `GET /best-sellers` |
| Most Viewed today (top 10) | Redis `books:most_viewed:daily:count` ZSET (ZINCRBY per view) + on-demand enrichment from MongoDB | `GET /most-viewed/daily` |
| Most Viewed 30 days (top 10) | Redis `books:most_viewed:30d:data` JSON STRING — refreshed daily at 17:00 UTC (00:00 GMT+7) from MongoDB view_event_logs | `GET /most-viewed/30days` |

#### Category Sync Flow (F4)
Admin CRUD on categories → MongoDB write → Neo4j `Category` node upsert (with `PARENT_OF` relationship) → Redis category cache invalidation

---

## 3. Database Responsibilities

### 3.1. PostgreSQL — Transactional Data

Handles all business-critical data requiring ACID guarantees.

#### Dual-Identifier Pattern

All user-facing tables follow a **dual-identifier** design to balance security, performance,
and API ergonomics:

| Identifier | Type | Scope | Purpose |
|---|---|---|---|
| `id` | `BIGSERIAL` (auto-increment int64) | **Internal only** — never sent to clients | Primary key for all FK relationships and database joins. Integer PKs keep indexes compact and joins fast. |
| `alias_id` | `UUID` (gen_random_uuid) | **External** — all API responses and URL parameters | Opaque, non-sequential identifier that prevents **ID enumeration attacks** — a client cannot guess or iterate over valid resource IDs. |

**Rules:**
- The JWT token embeds **both** (`alias_id` as `"alias_id"`, `uid` as the int64) so middleware
  can serve both Redis operations (alias_id) and DB FK lookups (int64) without any extra round-trip.
- All Go domain struct `ID int64` fields are tagged `json:"-"` so they are **never serialised**
  to HTTP responses.
- All `AliasID uuid.UUID` fields are tagged `json:"alias_id"` for API responses.
- URL parameters (e.g. `/orders/:id`, `/users/:id`) always carry the `alias_id` UUID.
  Handlers resolve these to the internal `int64` before issuing any database write.

#### PostgreSQL Tables

| Table | PK | Alias | Key Columns | Purpose |
|---|---|---|---|---|
| `users` | `id BIGSERIAL` | `alias_id UUID` | `full_name`, `email` (unique), `phone`, `password_hash`, `role` ENUM('user','admin'), `is_active`, `created_at` | User accounts |
| `addresses` | `id BIGSERIAL` | `alias_id UUID` | `user_id BIGINT FK→users.id`, `receiver_name`, `phone`, `address_line`, `ward`, `district`, `city`, `is_default`, `created_at` | Delivery addresses per user (one marked as default) |
| `books_ref` | `mongo_id TEXT` | — | `id BIGSERIAL`, `is_active BOOLEAN` | Bridge table: maps MongoDB book ObjectID to PostgreSQL for inventory and cart FKs |
| `inventory` | `book_id TEXT FK→books_ref.mongo_id` | — | `stock_quantity INT CHECK(≥0)`, `updated_at` | Book stock levels — `SELECT FOR UPDATE` during checkout and admin stock updates ensures ACID correctness |
| `carts` | `id BIGSERIAL` | — | `user_id BIGINT FK→users.id UNIQUE`, `created_at`, `updated_at` | One cart header per user (user_id is UNIQUE) — internal only, no alias needed |
| `cart_items` | `(cart_id BIGINT FK, book_id TEXT FK)` composite | — | `quantity INT CHECK(>0)`, `updated_at` | Cart line items; ON DELETE CASCADE from carts |
| `orders` | `id BIGSERIAL` | `alias_id UUID` | `user_id BIGINT FK→users.id`, `status` ENUM, `total_amount NUMERIC`, `address_id BIGINT FK→addresses.id nullable`, `note`, `created_at` | Order headers |
| `order_items` | `id BIGSERIAL` | — | `order_id BIGINT FK→orders.id`, `mongo_book_id TEXT`, `name TEXT` (snapshot), `quantity INT`, `unit_price NUMERIC` (snapshot) | Immutable price snapshots; remains readable even if the MongoDB document changes |
| `order_status_histories` | `id BIGSERIAL` | `alias_id UUID` | `order_id BIGINT FK→orders.id`, `old_status VARCHAR nullable`, `new_status VARCHAR`, `changed_by_admin_alias_id UUID nullable` (denormalised), `note`, `changed_at` | Full audit trail of every status transition |
| `shipments` | `id BIGSERIAL` | `alias_id UUID` | `order_id BIGINT FK→orders.id`, `status` ENUM, `carrier`, `tracking_no`, `shipped_at`, `delivered_at`, `created_at` | Shipment tracking records |

#### PostgreSQL Data Models

| Table | Column | Type | Constraints | Description |
|---|---|---|---|---|
| `users` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `alias_id` | `UUID` | `UNIQUE`, `NOT NULL` | External public ID |
| | `full_name` | `VARCHAR(100)` | `NOT NULL` | User's full name |
| | `email` | `VARCHAR(255)` | `UNIQUE`, `NOT NULL` | Login email |
| | `phone` | `VARCHAR(20)` | | Contact number |
| | `password_hash` | `TEXT` | `NOT NULL` | Bcrypt hashed password |
| | `role` | `user_role` | `NOT NULL`, Default: `user` | Enum: `user`, `admin` |
| | `is_active` | `BOOLEAN` | `NOT NULL`, Default: `TRUE` | Soft-deactivate flag |
| | `created_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Creation timestamp |
| | `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Last update timestamp |
| `addresses` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `alias_id` | `UUID` | `UNIQUE`, `NOT NULL` | External public ID |
| | `user_id` | `BIGINT` | `FK → users.id`, `ON DELETE CASCADE` | Owner ID |
| | `receiver_name` | `TEXT` | `NOT NULL` | Recipient name |
| | `phone` | `TEXT` | `NOT NULL` | Contact number |
| | `address_line` | `TEXT` | `NOT NULL` | Street, House number |
| | `ward` | `TEXT` | | Ward/Commune |
| | `district` | `TEXT` | | District/County |
| | `city` | `TEXT` | `NOT NULL` | City/Province |
| | `is_default` | `BOOLEAN` | `NOT NULL`, Default: `false` | Default flag |
| | `created_at` | `TIMESTAMPTZ` | `NOT NULL` | Creation timestamp |
| | `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | Last update timestamp |
| | `deleted_at` | `TIMESTAMPTZ` | | Soft-delete timestamp |
| `books_ref` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `mongo_id` | `TEXT` | `UNIQUE`, `NOT NULL` | Natural Key from MongoDB |
| | `price` | `NUMERIC(12,2)` | `NOT NULL`, `CHECK > 0` | Current price |
| | `is_active` | `BOOLEAN` | `NOT NULL`, Default: `TRUE` | Availability flag |
| `inventory` | `book_id` | `TEXT` | `PRIMARY KEY`, `FK → books_ref.mongo_id` | Link to book |
| | `stock_quantity` | `INTEGER` | `NOT NULL`, `CHECK >= 0` | Current stock count |
| | `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Last stock update |
| `orders` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `alias_id` | `UUID` | `UNIQUE`, `NOT NULL` | External public ID |
| | `user_id` | `BIGINT` | `FK → users.id`, `ON DELETE RESTRICT` | Customer ID |
| | `status` | `order_status` | `NOT NULL`, Default: `pending` | Enum: `pending`, `confirmed`, ... |
| | `total_amount` | `NUMERIC(14,2)` | `NOT NULL`, `CHECK >= 0` | Total order value |
| | `address_id` | `BIGINT` | `FK → addresses.id`, `ON DELETE SET NULL` | Shipping address |
| | `note` | `TEXT` | | Customer note |
| | `created_at` | `TIMESTAMPTZ` | `NOT NULL` | Order placement time |
| | `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | Last status update |
| `order_items` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `order_id` | `BIGINT` | `FK → orders.id`, `ON DELETE CASCADE` | Parent order |
| | `mongo_book_id` | `TEXT` | `NOT NULL` | Snapshot: Book ID |
| | `title` | `TEXT` | `NOT NULL` | Snapshot: Book title |
| | `quantity` | `INTEGER` | `NOT NULL`, `CHECK > 0` | Purchased quantity |
| | `unit_price` | `NUMERIC(12,2)` | `NOT NULL`, `CHECK > 0` | Snapshot: Price at purchase |
| `order_status_histories` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `alias_id` | `UUID` | `UNIQUE`, `NOT NULL` | External public ID |
| | `order_id` | `BIGINT` | `FK → orders.id`, `ON DELETE CASCADE` | Linked order |
| | `old_status` | `VARCHAR(20)` | | Previous state |
| | `new_status` | `VARCHAR(20)` | `NOT NULL` | New state |
| | `changed_by_admin_alias_id` | `UUID` | | Admin ID (denormalized) |
| | `note` | `TEXT` | | Audit note |
| | `changed_at` | `TIMESTAMPTZ` | `NOT NULL`, Default: `NOW()` | Event time |
| `carts` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `user_id` | `BIGINT` | `UNIQUE`, `FK → users.id`, `ON DELETE CASCADE` | Owner ID |
| | `created_at` | `TIMESTAMPTZ` | `NOT NULL` | Creation time |
| | `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | Last update time |
| `cart_items` | `cart_id` | `BIGINT` | `PK`, `FK → carts.id`, `ON DELETE CASCADE` | Parent cart |
| | `book_id` | `TEXT` | `PK`, `FK → books_ref.mongo_id`, `ON DELETE CASCADE` | Linked book |
| | `quantity` | `INTEGER` | `NOT NULL`, `CHECK > 0` | Desired quantity |
| | `updated_at` | `TIMESTAMPTZ` | `NOT NULL` | Last change |
| `shipments` | `id` | `BIGSERIAL` | `PRIMARY KEY` | Internal ID |
| | `alias_id` | `UUID` | `UNIQUE`, `NOT NULL` | External public ID |
| | `order_id` | `BIGINT` | `FK → orders.id`, `ON DELETE CASCADE` | Linked order |
| | `status` | `VARCHAR(30)` | `NOT NULL`, Default: `pending` | Enum: `pending`, `shipped`, `delivered` |
| | `carrier` | `TEXT` | | Shipping provider |
| | `tracking_no` | `TEXT` | | Tracking number |
| | `shipped_at` | `TIMESTAMPTZ` | | Dispatched time |
| | `delivered_at` | `TIMESTAMPTZ` | | Arrival time |
| | `created_at` | `TIMESTAMPTZ` | `NOT NULL` | Record creation |

#### MongoDB Data Models

##### `books` collection
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectID` | Primary Key |
| `name` | `String` | Book title |
| `slug` | `String` | URL-friendly identifier (Unique) |
| `shortDescription` | `String` | Brief summary |
| `detailDescription` | `String` | Full HTML/Markdown description |
| `productStatus` | `String` | e.g., `active`, `inactive` |
| `pricing` | `Object` | `{ price: Decimal128 }` |
| `category` | `Object` | `{ categoryId: String }` |
| `images` | `Array` | `[{ isPrimary: Boolean, alt: String, url: String }]` |
| `series` | `Object` | `{ seriesId: String, seriesName: String, sequenceNo: Int }` |
| `authors` | `Array` | `[{ authorId: String, slug: String, authorName: String }]` |
| `tags` | `Array` | `[{ tagId: String, tagName: String }]` |
| `createdAt` | `ISODate` | Document creation timestamp |

##### `categories` collection
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectID` | Primary Key |
| `categoryName` | `String` | Display name |
| `slug` | `String` | URL-friendly identifier (Unique) |
| `parentCategory` | `ObjectID` | Reference to parent category (Nullable) |
| `createdAt` | `ISODate` | Creation timestamp |
| `updatedAt` | `ISODate` | Last update timestamp |

##### `view_event_logs` collection
| Field | Type | Description |
|---|---|---|
| `_id` | `ObjectID` | Primary Key |
| `userId` | `String` | User `alias_id` (UUID) |
| `bookId` | `String` | Book `_id` (hex string) |
| `eventType` | `String` | e.g., `viewed` |
| `createdAt` | `ISODate` | Event timestamp |

#### Neo4j Data Models

##### Node Labels & Properties
| Label | Property | Type | Description |
|---|---|---|---|
| `Book` | `mongo_id` | `String` | Unique Natural Key (from MongoDB) |
| | `title` | `String` | Book title |
| | `is_active` | `Boolean` | Availability flag |
| | `status` | `String` | e.g., `active` |
| `Author` | `name` | `String` | Unique author name |
| `Category` | `categoryId` | `String` | Unique ID (from MongoDB) |
| | `name` | `String` | Display name |
| | `slug` | `String` | URL identifier |
| `Publisher` | `name` | `String` | Unique publisher name |
| `Tag` | `name` | `String` | Unique tag name |
| `Series` | `name` | `String` | Unique series name |

##### Relationship Types
| Type | From | To | Properties | Description |
|---|---|---|---|---|
| `WRITTEN_BY` | `Book` | `Author` | — | Authorship link |
| `BELONGS_TO` | `Book` | `Category` | — | Category assignment |
| `PUBLISHED_BY` | `Book` | `Publisher` | — | Publisher link |
| `HAS_TAG` | `Book` | `Tag` | — | Semantic tagging |
| `IN_SERIES` | `Book` | `Series` | `sequence_no: Int` | Series volume order |
| `SIMILARITY_TO` | `Book` | `Book` | `score: Float`, `computedAt: DateTime` | Pre-computed similarity |
| `PARENT_OF` | `Category` | `Category` | — | Hierarchical structure |

#### Redis Data Models

| Key Pattern | Data Type | Value Structure | Description | Feature Flag |
|---|---|---|---|---|
| `users:current_sessions:{aliasID}` | `STRING` | Snappy-compressed JWT | Active user session | — (always active) |
| `users:blacklist_sessions:{token}` | `STRING` | `"revoked"` | Logged-out token storage | — (always active) |
| `users:carts:{aliasID}` | `STRING` | Snappy-compressed JSON | Cart cache (List of items) | `REDIS_CART_CACHE` |
| `users:checkouts:{sessionID}` | `STRING` | Snappy-compressed JSON | Temporary Buy-Now data | — (always active) |
| `users:orders:{userID}:{page}:{size}` | `STRING` | Snappy-compressed JSON | Paginated order history | `REDIS_ORDER_HISTORY` |
| `books:details:{bookID}` | `STRING` | Snappy-compressed JSON | Book doc + stock snapshot | `REDIS_BOOK_CACHE` |
| `books:newest` | `STRING` | Snappy-compressed JSON | List of newest books | `REDIS_NEWEST_BOOKS` |
| `books:stocks:{bookID}` | `STRING` | `Int` (as String) | Real-time stock counter | `REDIS_STOCK_CACHE` |
| `books:categories:{page}:{size}` | `STRING` | Snappy-compressed JSON | Category list cache | `REDIS_CATEGORY_CACHE` |
| `books:best_sellers` | `STRING` | Snappy-compressed JSON | Top 10 books (30d sales) | `REDIS_BEST_SELLERS` |
| `books:most_viewed:daily:count` | `ZSET` | `Member: bookID, Score: count` | Live daily view counter | `REDIS_MOST_VIEWED_DAILY` |
| `books:most_viewed:daily:data` | `STRING` | Snappy-compressed JSON | Enriched daily top 10 | `REDIS_MOST_VIEWED_DAILY` |
| `books:most_viewed:30d:data` | `STRING` | Snappy-compressed JSON | Nightly aggregated top 10 | `REDIS_MOST_VIEWED_30D` |

#### Database Indexes

##### PostgreSQL
| Table | Index Columns | Type | Purpose |
|---|---|---|---|
| `users` | `alias_id` | UNIQUE | External lookup |
| `users` | `email` | UNIQUE | Login lookup |
| `users` | `role` | B-TREE | Admin filtering |
| `users` | `is_active` | B-TREE | Active status filtering |
| `addresses` | `alias_id` | UNIQUE | External lookup |
| `addresses` | `user_id` | B-TREE | User address list |
| `addresses` | `(user_id, is_default)` | B-TREE | Default address lookup |
| `books_ref` | `mongo_id` | UNIQUE | MongoDB bridge lookup |
| `books_ref` | `is_active` | B-TREE | Active status filtering |
| `inventory` | `book_id` | UNIQUE | Stock lookup |
| `orders` | `alias_id` | UNIQUE | External lookup |
| `orders` | `user_id` | B-TREE | User order history |
| `orders` | `status` | B-TREE | Status filtering |
| `orders` | `created_at DESC` | B-TREE | Sorting by date |
| `order_items` | `order_id` | B-TREE | Order line items |
| `order_items` | `mongo_book_id` | B-TREE | Sales analytics per book |
| `order_status_histories` | `alias_id` | UNIQUE | External lookup |
| `order_status_histories` | `order_id` | B-TREE | Audit trail lookup |
| `order_status_histories` | `changed_at DESC` | B-TREE | Chronological audit |
| `carts` | `user_id` | UNIQUE | User cart lookup |
| `cart_items` | `cart_id` | B-TREE | Cart content lookup |
| `shipments` | `alias_id` | UNIQUE | External lookup |
| `shipments` | `order_id` | B-TREE | Order shipment lookup |
| `shipments` | `tracking_no` | B-TREE | Tracking lookup |
| `shipments` | `status` | B-TREE | Shipment status filtering |

##### MongoDB
| Collection | Index Keys | Type | Purpose |
|---|---|---|---|
| `books` | `{ slug: 1 }` | UNIQUE | Fast lookup by slug |
| `books` | `{ "authors.slug": 1 }` | B-TREE | Author filtering |
| `books` | `{ "category.categoryId": 1, publishYear: -1 }` | B-TREE | Category + Year filtering |
| `books` | `{ "series.seriesId": 1, "series.sequenceNo": 1 }` | B-TREE | Series volume ordering |
| `books` | `{ createdAt: -1 }` | B-TREE | Sorting by creation date |
| `books` | `{ name: "text", shortDescription: "text", ... }` | TEXT | Full-text search (weighted) |
| `categories` | `{ slug: 1 }` | UNIQUE | Fast lookup by slug |
| `categories` | `{ parentCategory: 1 }` | B-TREE | Parent-child navigation |
| `view_event_logs` | `{ bookId: 1 }` | B-TREE | Most-viewed enrichment |
| `view_event_logs` | `{ eventType: 1, createdAt: -1 }` | B-TREE | 30-day aggregation filter |

##### Neo4j
| Label | Property | Constraint/Index | Purpose |
|---|---|---|---|
| `Book` | `mongo_id` | UNIQUE CONSTRAINT | Unique bridge key |
| `Book` | `title` | INDEX | Title lookup |
| `Book` | `is_active` | INDEX | Active filtering |
| `Book` | `status` | INDEX | Status filtering |
| `Author` | `name` | UNIQUE CONSTRAINT | Unique author |
| `Publisher` | `name` | UNIQUE CONSTRAINT | Unique publisher |
| `Series` | `name` | UNIQUE CONSTRAINT | Unique series |
| `Tag` | `name` | UNIQUE CONSTRAINT | Unique tag |
| `Category` | `categoryId` | UNIQUE CONSTRAINT | Unique category |

##### Redis
| Key Pattern | Type | Purpose |
|---|---|---|
| `books:most_viewed:daily:count` | ZSET | Sorted ranking by view count |
| `users:blacklist_sessions:{token}` | STRING | Fast token revocation check |

> **Note on `order_status_histories.changed_by_admin_alias_id`:** The admin's `alias_id` UUID is
> stored directly in the history row (denormalised). This avoids a JOIN back to the `users` table
> when serialising history entries — the int64 FK is not stored here because the audit log is
> write-once and never needs FK enforcement.

**Order status lifecycle (state machine — enforced in PostgreSQL repository):**
```
pending ──► confirmed ──► packing ──► shipping ──► completed  (terminal)
   │             │            │           │
   └─────────────┴────────────┴───────────┴──────────► cancelled  (terminal)

Rules:
  • Any status except "completed" and "cancelled" may transition to "cancelled".
  • "completed" and "cancelled" are terminal states — no further transitions allowed.
  • When an order is cancelled, the stock quantities of all line items are
    restored to the inventory inside the same database transaction.
```

**Shipment status lifecycle (state machine — enforced in PostgreSQL repository):**
```
pending ──► shipped ──► delivered (terminal)
```
Rules:
  • "delivered" is a terminal state.
  • "pending" can transition to "shipped".
  • "shipped" can transition to "delivered".

---

### 3.2. MongoDB — Catalog, Categories & Event Logs

Stores flexible, polymorphic book documents, the category hierarchy, and user behaviour events.

#### `books` collection
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
  "createdAt": "2025-01-01T00:00:00Z"
}
```

#### `categories` collection
```json
{
  "_id": "ObjectID",
  "categoryName": "Science Fiction",
  "slug": "science-fiction",
  "parentCategory": "ObjectID | null"
}
```

#### `view_event_logs` collection — NV-E3 source of truth

Stores every `viewed` user behaviour event. Used by `MostViewedWorker` nightly to aggregate the
top-10 most-viewed books in the past 30 days via a MongoDB aggregation pipeline.

```json
{
  "_id":       "ObjectID (auto-generated)",
  "userId":    "UUID string (alias_id from PostgreSQL users.alias_id)",
  "bookId":    "MongoDB ObjectID hex string (book identifier)",
  "eventType": "viewed",
  "createdAt": "2025-01-01T10:00:00Z (UTC timestamp)"
}
```

**Indexes:**
- `{ bookId: 1 }` — fast lookups when enriching most-viewed results
- `{ eventType: 1, createdAt: -1 }` — supports the 30-day aggregation pipeline filter

Indexes defined in `db/mongo/indexes/books_indexes.json`.

---

### 3.3. Neo4j — Recommendation Graph

**Similarity score formula:**
```
score = 0.50 × categoryOverlap + 0.33 × authorOverlap + 0.17 × publisherOverlap
      + bonus(tagOverlap, sameSeries)
```

**Node types:**

**No User nodes are stored in Neo4j.** User behaviour (view events) is recorded exclusively
in the MongoDB `view_event_logs` collection.

| Node | Key Properties | Role |
|---|---|---|
| `Book` | `mongo_id` (unique), `title`, `is_active` | Central entity for all recommendation traversals |
| `Author` | `name` (unique) | Same-author similarity |
| `Category` | `categoryId` (unique), `name`, `slug` | Same-category similarity + hierarchical navigation |
| `Publisher` | `name` (unique) | Same-publisher similarity |
| `Tag` | `name` (unique) | Semantic / topic similarity |
| `Series` | `name` (unique) | Volume grouping for series recommendations |

**Relationship types:**

```cypher
// Structural relationships (created / updated by AdminCreateBook and AdminUpdateBook):
(Book)-[:WRITTEN_BY]   ->(Author)
(Book)-[:BELONGS_TO]   ->(Category)
(Book)-[:PUBLISHED_BY] ->(Publisher)
(Book)-[:HAS_TAG]      ->(Tag)
(Book)-[:IN_SERIES {sequence_no: <int>}]->(Series)

// Pre-computed similarity (recomputed on every book upsert):
// score = 0.50 × shared_categories + 0.33 × shared_authors + 0.17 × shared_publishers
(Book)-[:SIMILARITY_TO {score: <float>, computedAt: <datetime>}]->(Book)

// Category hierarchy (synced from MongoDB on every Admin category mutation):
(Category)-[:PARENT_OF]->(Category)
```

---

### 3.4. Redis — Cache, Sessions & Rankings

All values are stored as **Snappy-compressed JSON** to reduce memory footprint.

| Redis Key Pattern | Type | TTL | Feature Flag | Purpose |
|---|---|---|---|---|
| `users:current_sessions:{aliasID}` | STRING | 7 days | — (always active) | Active JWT token for the logged-in user (`aliasID` = UUID alias_id) |
| `users:blacklist_sessions:{token}` | STRING | 3 days | — (always active) | Revoked / logged-out token blacklist |
| `users:carts:{aliasID}` | STRING | 3 days | `REDIS_CART_CACHE` | Cart item cache keyed by user alias_id UUID — PostgreSQL `cart_items` is always the source of truth |
| `users:checkouts:{sessionID}` | STRING | 15 min | — (always active) | Temporary Buy-Now session (single book) |
| `users:orders:{userID}:{page}:{size}` | STRING | 30 min | `REDIS_ORDER_HISTORY` | Paginated order history list cache |
| `books:details:{bookID}` | STRING | 10 min | `REDIS_BOOK_CACHE` | Book detail cache (MongoDB document + PostgreSQL stock) |
| `books:newest` | STRING | 30 min | `REDIS_BOOK_CACHE` | Newest books list JSON |
| `books:stocks:{bookID}` | STRING | 5 min | `REDIS_BOOK_CACHE` | Stock quantity cache |
| `books:categories:{page}:{size}` | STRING | 30 min | `REDIS_CATEGORY_CACHE` | Category list page cache |
| `books:best_sellers` | STRING | 1 day | `REDIS_BEST_SELLERS` | Top-10 bestselling books — Snappy-compressed JSON, refreshed daily at 17:00 UTC (00:00 GMT+7) by BestSellerWorker from PostgreSQL order_items |
| `books:most_viewed:daily:count` | ZSET | 1 day | `REDIS_MOST_VIEWED_DAILY` | Live daily view counter — `ZINCRBY` on every `POST /books/:id/view`; expires automatically after 24 hours |
| `books:most_viewed:daily:data` | STRING | 1 day | `REDIS_MOST_VIEWED_DAILY` | Enriched top-10 daily most-viewed JSON — rebuilt on demand by the API handler when the live count ranking diverges from the cached ranking |
| `books:most_viewed:30d:data` | STRING | 1 day | `REDIS_MOST_VIEWED_DAILY` | Top-10 most-viewed books in the past 30 days — refreshed nightly by MostViewedWorker from MongoDB view_event_logs |

---

## 4. Backend

### 4.1. Technology Stack

| Layer | Technology |
|---|---|
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

---

### 4.2. Project Structure

```
backend/
├── main.go                          # Entry point → @swagger header + cmd.Run
├── go.mod / go.sum
├── Makefile
├── docker-compose.yml               # PostgreSQL, MongoDB, Neo4j, Redis services
├── .env.example
│
├── cmd/
│   ├── cmd.go                       # Cobra root + docs import
│   └── server.go                    # DB connections → repo wiring → workers → Gin → graceful shutdown
│
├── config/
│   ├── config.go                    # Typed Config struct (incl. FeaturesConfig) + Viper loader
│   └── default.go                   # Embedded YAML defaults (all feature flags: true)
│
├── docs/                            # swag-generated Swagger UI assets
│   ├── docs.go
│   ├── swagger.json
│   └── swagger.yaml
│
├── internal/
│   ├── domain/
│   │   ├── model.go                 # All domain structs, enums, constants
│   │   │                            #  (BestSellerBook, MostViewedBook, EventLog, OrderStatus, …)
│   │   ├── repository.go            # All repository interfaces + PostgresTransactor
│   │   └── dto.go                   # Request / Response DTOs
│   │
│   ├── middleware/
│   │   ├── auth.go                  # RequireAuth, RequireUser, RequireAdmin
│   │   └── constants.go             # Context keys
│   │
│   ├── repository/
│   │   ├── postgres/
│   │   │   ├── postgres.go              # New() — implements PostgresTransactor
│   │   │   ├── user.go
│   │   │   ├── order.go                 # CreateOrder, UpdateOrderStatus (state machine),
│   │   │   │                            #  isValidOrderStatusTransition
│   │   │   ├── order_status_histories.go
│   │   │   ├── inventory.go             # GetInventoryForUpdate (SELECT FOR UPDATE —
│   │   │   │                            #  ACID lock for concurrent checkout + admin stock updates)
│   │   │   ├── cart.go                  # GetOrCreateCartByUserID, UpsertCartItem,
│   │   │   │                            #  GetCartItemsByUserID, DeleteCartItemByBookID, DeleteCartByUserID
│   │   │   └── address.go
│   │   │
│   │   ├── mongo/
│   │   │   ├── book.go                  # SearchBooks, GetNewestBooks, GetBooksByIDs, CRUD
│   │   │   ├── category.go              # Category CRUD
│   │   │   └── event_log.go             # InsertEventLog, AggregateTopViewed (NV-E3, 30d)
│   │   │                                #  Collection: "view_event_logs"
│   │   │
│   │   ├── neo4j/
│   │   │   ├── neo4j.go                 # runQuery / writeQuery helpers
│   │   │   └── recommendation.go        # GetSimilarBooks (SIMILARITY_TO + live fallback),
│   │   │                                #  GetSeriesBooks, UpsertBookNode
│   │   │                                #  (+ computeSimilarityEdgesForBook),
│   │   │                                #  DeleteBookNode,
│   │   │                                #  UpsertCategoryNode, DeleteCategoryNode (F4)
│   │   │                                #  No User nodes — user behaviour in MongoDB only
│   │   │
│   │   └── redis/
│   │       ├── redis.go                 # Client alias
│   │       ├── session.go               # SetToken, BlacklistToken, IsBlacklisted
│   │       ├── cart.go                  # SetCart, GetCart, InvalidateCart
│   │       ├── checkout_session.go      # CreateSession, GetSession, DeleteSession (TTL 15 min)
│   │       ├── best_seller.go           # GetTopBestSellers, SetTopBestSellers
│   │       │                            #  Key: "books:best_sellers" STRING TTL 1 day
│   │       │                            #  No sorted set — data from PostgreSQL only
│   │       ├── most_viewed.go           # IncrementDailyViewCount, GetTopDailyViewedFromCountSet,
│   │       │                            #  ResetDailyViewCountSet, SetDailyTopViewedData,
│   │       │                            #  GetDailyTopViewedData, Set30DaysTopViewedData,
│   │       │                            #  Get30DaysTopViewedData
│   │       ├── book_cache.go            # SetDetail, GetNewest, SetStock, …
│   │       ├── order_cache.go           # SetOrderHistory, GetOrderHistory, InvalidateOrderHistory (D2)
│   │       └── category_cache.go        # SetCategoryList, GetCategoryList, InvalidateCategoryList (F4)
│   │
│   ├── server/
│   │   ├── server.go                # Route groups (pub / auth / user / admin) + Swagger
│   │   ├── service.go               # Service struct (all repos + jwtCfg + FeaturesConfig)
│   │   ├── response.go              # Unified JSON response helpers
│   │   ├── user.go                  # Register, Login, Logout, GetProfile, UpdateProfile
│   │   ├── book.go                  # SearchBooks, GetBookDetail, GetNewBooks, ViewBook
│   │   │                            #  (feature-flag guards on all Redis cache ops)
│   │   ├── cart.go                  # AddToCart, GetCart, UpdateCartItem, RemoveCartItem
│   │   │                            #  (feature-flag guards on RedisCartCache)
│   │   ├── order.go                 # Checkout (atomic TX + cache invalidation),
│   │   │                            # BuyNow, GetOrderHistory (D2 Redis cache), GetOrderDetail
│   │   ├── recommendation.go        # GetSimilarBooks, GetSeriesBooks,
│   │   │                            # GetBestSellers (E2), GetTopDailyViewed (E3), GetTopMostViewed30Days (E3)
│   │   ├── admin_book.go            # AdminCreate/Update/Delete/Stock (MongoDB + PG + Neo4j)
│   │   ├── admin_order.go           # AdminListOrders, AdminUpdateOrderStatus, AdminGetOrderHistory
│   │   ├── admin_user.go            # AdminListUsers, AdminGetBestSellers, AdminGetSales
│   │   └── admin_category.go        # GetCategories (public), AdminListCategories,
│   │                                # AdminCreate/Update/DeleteCategory
│   │                                #  (MongoDB + Neo4j sync + Redis invalidation)
│   │
│   └── worker/
│       ├── best_seller_worker.go    # Daily 17:00 UTC (00:00 GMT+7): PG aggregate → Redis best-sellers (E2)
│       └── most_viewed_worker.go    # Daily 17:00 UTC (00:00 GMT+7): ZSET snapshot + MongoDB 30d aggregate (E3)
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
    │   └── queries/                 # Named SQL files
    ├── mongo/indexes/
    │   └── books_indexes.json       # Index definitions for books + categories collections
    └── neo4j/
        ├── migrations/              # Cypher constraint files
        └── queries/                 # similar_books.cypher, series_books.cypher
```

---

### 4.3. Background Workers

Two cron workers start automatically when the server starts (initial run immediately, then daily at **17:00 UTC / 00:00 GMT+7**):

#### `BestSellerWorker` — NV-E2
```
Runs daily at 17:00 UTC (00:00 GMT+7)
  └─ PostgreSQL query:
       SELECT oi.mongo_book_id, SUM(oi.quantity) AS total_sold
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.created_at >= now() - 30 days
         AND o.status != 'cancelled'
       GROUP BY oi.mongo_book_id
       ORDER BY total_sold DESC
       LIMIT 10

  └─ Result written to Redis:
       SET "books:best_sellers" <Snappy-compressed JSON>  EX 86400

No Redis sorted set is used — the PostgreSQL order_items table is the
sole authoritative data source for bestseller rankings.
```

#### `MostViewedWorker` — NV-E3
```
Runs daily at 17:00 UTC (00:00 GMT+7)

  Step 1 — Aggregate 30-day views from MongoDB:
    MongoDB aggregate pipeline on "view_event_logs":
      { $match:  { eventType: "viewed", createdAt: { $gte: now() - 30 days } } }
      { $group:  { _id: "$bookId", viewCount: { $sum: 1 } } }
      { $sort:   { viewCount: -1 } }
      { $limit:  10 }
    → Write to Redis: SET "books:most_viewed:30d:data" <Snappy JSON>  EX 86400

  Step 2 — Reset daily counters (new day starts from zero):
    DEL "books:most_viewed:daily:count"   (daily view count sorted set)
    DEL "books:most_viewed:daily:data"    (enriched daily top-10 cache)
```

**On-demand daily data refresh** (handled by `GetTopDailyViewed` API handler — NOT the worker):
1. Read top-N entries from `books:most_viewed:daily:count` sorted set.
2. Read `books:most_viewed:daily:data` cache.
3. If the cached book ID ranking matches the live count set → return cached data (fast path).
4. If rankings differ → fetch book titles from MongoDB for the top-N IDs, build enriched response,
   write to `books:most_viewed:daily:data`, return result.

**Real-time view counting** (triggered by `POST /books/:id/view`):
- MongoDB: insert document into `view_event_logs` (source of truth for 30-day aggregate).
- Redis: `ZINCRBY books:most_viewed:daily:count 1 {bookID}` + `EXPIRENV 24h` (feature-flag guarded).
- **Neo4j: no write** — user behaviour tracking is MongoDB-only.

---

### 4.4. Redis Feature Flags

All Redis caching operations are individually toggleable at runtime via environment variables.  
Set to `false` to bypass the cache layer and always read/write from the primary database.

| Config Key | Environment Variable | Default | Controls |
|---|---|---|---|
| `redis_book_cache` | `FEATURES_REDIS_BOOK_CACHE` | `true` | NV-B2: book detail cache |
| `redis_newest_books` | `FEATURES_REDIS_NEWEST_BOOKS` | `true` | NV-B3: newest books list cache |
| `redis_stock_cache` | `FEATURES_REDIS_STOCK_CACHE` | `true` | NV-F3: real-time stock quantity cache |
| `redis_cart_cache` | `FEATURES_REDIS_CART_CACHE` | `true` | NV-C1/C2: Redis cart cache read/write layer |
| `redis_best_sellers` | `FEATURES_REDIS_BEST_SELLERS` | `true` | NV-E2: bestseller JSON cache reads (data written by BestSellerWorker regardless of flag) |
| `redis_order_history` | `FEATURES_REDIS_ORDER_HISTORY` | `true` | NV-D2: order history page cache (TTL 30 min) |
| `redis_most_viewed_daily` | `FEATURES_REDIS_MOST_VIEWED_DAILY` | `true` | NV-E3: daily view counter + daily data cache refresh |
| `redis_most_viewed_30d` | `FEATURES_REDIS_MOST_VIEWED_30D` | `true` | NV-E3: 30-day aggregated most viewed cache reads |
| `redis_category_cache` | `FEATURES_REDIS_CATEGORY_CACHE` | `true` | NV-F4: category list page cache |

> **Note:** Session and buy-now checkout session operations (auth-critical) are not flag-controlled and are always active.

---

## 5. API Reference

All endpoints are prefixed with `/api/v1`. Interactive docs: `http://localhost:8080/swagger/index.html`

### 5.1. Public (no authentication)

| Method | Path | NV | Description |
|---|---|---|---|
| `POST` | `/auth/register` | A1 | Create a new customer account |
| `POST` | `/auth/login` | A2 | Authenticate and receive JWT |
| `GET` | `/books` | B1 | Search books (`search`, `author`, `publisher`, `year`, `min_price`, `max_price`, `page`, `page_size`) |
| `GET` | `/books/new` | B3 | Newest books (`limit`) — Redis cached |
| `GET` | `/books/:id` | B2 | Book detail with live stock — Redis cached |
| `GET` | `/books/:id/similar` | E1 | Neo4j similar-book recommendations |
| `GET` | `/books/:id/series` | E1 | All volumes in the same series |
| `GET` | `/categories` | F4 | List all categories — Redis cached |
| `GET` | `/best-sellers` | E2 | Top-10 best-selling books (30d, Redis) |
| `GET` | `/most-viewed/daily` | E3 | Top-10 most-viewed books today (Redis ZSET) |
| `GET` | `/most-viewed/30days` | E3 | Top-10 most-viewed books in past 30 days (Redis cache, refreshed nightly from MongoDB) |

---

### 5.2. Customer (JWT, `role: user`)

| Method | Path | NV | Description |
|---|---|---|---|
| `POST` | `/auth/logout` | A3 | Revoke JWT (Redis blacklist) |
| `GET` | `/users/me` | A4 | View own profile |
| `PUT` | `/users/me` | A4 | Update name / phone / default address |
| `GET` | `/cart` | C2 | Get cart (Redis cache → PSQL fallback) |
| `POST` | `/cart` | C1 | Add / update item (PSQL + Redis) |
| `PUT` | `/cart/:bookId` | C2 | Update item quantity |
| `DELETE` | `/cart/:bookId` | C2 | Remove item |
| `POST` | `/orders/buy-now` | C3 | Create 15-min buy-now Redis session for single book |
| `POST` | `/orders/checkout` | D1 | Checkout from cart or buy-now session (atomic PG TX) |
| `GET` | `/orders` | D2 | List own orders — Redis cached (30 min) |
| `GET` | `/orders/:id` | D3 | Order detail (PG + MongoDB book metadata) |
| `GET` | `/orders/:id/shipment` | — | View shipment tracking details |
| `POST` | `/books/:id/view` | E3 | Record book view → insert into MongoDB `view_event_logs` + ZINCRBY daily Redis count sorted set (no Neo4j write) |

> Admin accounts (`role: admin`) are blocked from all customer purchase endpoints.

---

### 5.3. Admin (JWT, `role: admin`)

| Method | Path | NV | Description |
|---|---|---|---|
| `GET` | `/admin/books` | F2 | List books with stock |
| `POST` | `/admin/books` | F2 | Create book (MongoDB + PG bridge + Neo4j graph node) |
| `PUT` | `/admin/books/:id` | F2 | Update book metadata |
| `DELETE` | `/admin/books/:id` | F2 | Soft-delete (`is_active=false`) |
| `PATCH` | `/admin/books/:id/stock` | F3 | Set stock quantity in inventory |
| `GET` | `/admin/categories` | F4 | List categories (MongoDB + Redis cache) |
| `POST` | `/admin/categories` | F4 | Create category → MongoDB + Neo4j + Redis invalidate |
| `PUT` | `/admin/categories/:id` | F4 | Update category → MongoDB + Neo4j re-sync + Redis invalidate |
| `DELETE` | `/admin/categories/:id` | F4 | Delete category → MongoDB + Neo4j detach + Redis invalidate |
| `GET` | `/admin/orders` | F1 | List all orders (filter: `status`) |
| `GET` | `/admin/orders/:id` | D3 | Full order detail |
| `PATCH` | `/admin/orders/:id/status` | F1 | Update order status + write history row |
| `GET` | `/admin/orders/:id/history` | F1 | Order status change audit trail |
| `GET` | `/admin/shipments/:id` | — | Get shipment details |
| `GET` | `/admin/orders/:id/shipment` | — | Get shipment by order |
| `PATCH` | `/admin/shipments/:id/status` | — | Update shipment status |
| `PUT` | `/admin/shipments/:id` | — | Update shipment details (carrier, tracking) |
| `GET` | `/admin/users` | — | List all users |
| `GET` | `/admin/users/:id` | — | View any user |
| `PATCH` | `/admin/users/:id/deactivate` | — | Activate / deactivate account |
| `GET` | `/admin/analytics/best-sellers` | E2 | Best-seller scores from Redis |
| `GET` | `/admin/analytics/sales` | — | Sales summary by date range |

---

## 6. Getting Started

### 6.1. Prerequisites

- **Go 1.23+**
- **Docker + Docker Compose** (recommended)
- OR: PostgreSQL 16, MongoDB 7, Neo4j 5, Redis 7 (manual)
- [`golang-migrate`](https://github.com/golang-migrate/migrate) CLI
- [`swag`](https://github.com/swaggo/swag) CLI (for regenerating Swagger docs only)

---

### 6.2. Quick Start with Docker

```bash
cd hcmus-master-is-db/backend

# 1. Copy and configure environment
cp .env.example .env

# 2. Start all 4 databases
make db-start

# 3. Apply PostgreSQL migrations
make db-init-pg

# 4. Create PostgreSQL admin role (optional, for admin tools)
make db-admin-pg

# 5. Apply Neo4j constraints
make db-init-neo4j

# 5. Create MongoDB collections + indexes
make db-init-mongo

# 6. Verify Redis connection
make db-init-redis

# 7. Seed large dataset (optional)
make db-seed

# 8. Verify seeded data (optional)
make db-seed-verification

# 9. Start the API server
make run
# → API:     http://localhost:8080
# → Swagger: http://localhost:8080/swagger/index.html
```

**One-liner for easy copy-paste (from Step 2 to 9):**
```bash
make db-start && make db-init-pg && make db-admin-pg && make db-init-neo4j && make db-init-mongo && make db-init-redis && make db-seed && make db-seed-verification && make run
```

### 6.3. Troubleshooting & Database Reset

If you encounter errors like `role "developer" does not exist` or connection failures during initialization, it may be because the databases were initialized with old credentials. You can perform a full reset:

```bash
# 1. Stop containers and remove volumes
make db-stop
docker volume rm backend_postgres_data backend_mongo_data backend_neo4j_data backend_redis_data

# 2. Start fresh
make db-start
make db-init-pg
make db-admin-pg
make db-init-mongo
make db-init-neo4j
make db-init-redis
```

---

### 6.4. Manual Setup

```bash
go mod tidy
cp .env.example .env
# Edit .env with your database credentials

make migrate-up    # Apply PostgreSQL migrations
make run           # Start server
```

---

## 7. Configuration

All settings have embedded defaults and can be overridden via environment variables using `_` as the nested key separator (e.g. `POSTGRES_HOST=myhost`).

### 7.1. Database & Server Settings

| Environment Variable | Default | Description |
|---|---|---|
| `ENV` | `development` | Runtime environment |
| `SERVER_PORT` | `8080` | HTTP listen port |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_DB` | `bookstore` | Database name |
| `POSTGRES_USER` | `developer` | Username |
| `POSTGRES_PASSWORD` | `devpassword` | Password |
| `POSTGRES_SSLMODE` | `disable` | SSL mode |
| `MONGO_URI` | `mongodb://developer:devpassword@localhost:27017/bookstore?authSource=bookstore` | MongoDB connection URI |
| `MONGO_DB` | `bookstore` | Database name |
| `NEO4J_URI` | `bolt://localhost:7687` | Neo4j Bolt URI |
| `NEO4J_USER` | `developer` | Username |
| `NEO4J_PASSWORD` | `devpassword` | Password |
| `REDIS_ADDR` | `localhost:6379` | Redis address |
| `REDIS_PASSWORD` | *(empty)* | Redis password |
| `REDIS_DB` | `0` | Redis logical DB index |
| `JWT_SECRET` | *(change this!)* | HMAC signing secret |
| `JWT_ACCESS_TTL` | `24h` | Token expiry duration |
| `LOGGER_LEVEL` | `info` | Log level |

### 7.2. Redis Feature Flags

| Environment Variable | Default | Feature Controlled |
|---|---|---|
| `FEATURES_REDIS_BOOK_CACHE` | `true` | Book detail cache (B2) |
| `FEATURES_REDIS_NEWEST_BOOKS` | `true` | Newest books list cache (B3) |
| `FEATURES_REDIS_STOCK_CACHE` | `true` | Stock quantity cache (F3) |
| `FEATURES_REDIS_CART_CACHE` | `true` | Cart Redis cache layer (C1, C2) |
| `FEATURES_REDIS_BEST_SELLERS` | `true` | Best-seller ZSET + cache (E2) |
| `FEATURES_REDIS_ORDER_HISTORY` | `true` | Order history page cache 30 min TTL (D2) |
| `FEATURES_REDIS_MOST_VIEWED_DAILY` | `true` | Most-viewed daily ZSET + daily data cache (E3) |
| `FEATURES_REDIS_MOST_VIEWED_30D` | `true` | Most-viewed 30-day cache reads (E3) |
| `FEATURES_REDIS_CATEGORY_CACHE` | `true` | Category list cache (F4) |

Example — disable order-history cache only:
```bash
FEATURES_REDIS_ORDER_HISTORY=false make run
```

---

## 8. Database Management

### 8.1. PostgreSQL Migrations

Migrations are managed by **golang-migrate** and live in `db/postgres/migrations/`.

| Migration File | Description |
|---|---|
| `202605120000_init_schema` | Initial consolidated schema (Users, BooksRef, Orders, Addresses, Inventory, Carts, Shipments, History) |

### 8.2. Makefile Commands

```bash
# Database lifecycle
make db-start           # docker-compose up -d (all 4 DBs)
make db-stop            # docker-compose down (stop containers)
make db-delete          # docker-compose down -v (stop containers and DELETE volumes)
make db-logs            # Follow container logs

# Initialization
make db-init-pg         # Apply PostgreSQL migrations
make db-admin-pg        # Create bookstore_admin PG role
make db-init-mongo      # Create MongoDB collections + indexes
make db-init-neo4j      # Apply Neo4j constraints/indexes
make db-init-redis      # Ping Redis to verify connection
make db-seed            # Seed large dataset (10k+ users, 2k+ books, etc.)
make db-seed-verification # Verify seeded data across all 4 databases

# Development
make run                # Start API server (reads .env)
make build              # Compile binary to bin/bookstore-api
make dev                # Live reload via air
make tidy               # go mod tidy

# Database migrations
make migrate-up         # Apply all pending PostgreSQL migrations
make migrate-down       # Roll back one migration
make migrate-create NAME=<name>  # Create a new migration pair

# Code generation
make swagger-gen        # Regenerate docs/ from @swag annotations
make sqlc-generate      # Regenerate typed query code

make clean              # Remove build artifacts
```

---

## 9. Swagger API Docs

Swagger UI is served at **`http://localhost:8080/swagger/index.html`** while the server is running.

To regenerate docs after modifying handler annotations:

```bash
make swagger-gen
```

Generated files are committed to `docs/` (`docs.go`, `swagger.json`, `swagger.yaml`).

---

## 10. Frontend

> **Next.js 14** (App Router) · React 18 · TypeScript · Tailwind CSS · Zustand · Axios

The frontend is a server-side rendered (SSR) Next.js application that consumes all REST endpoints documented in [Section 5](#5-api-reference). It mirrors the three actor scopes (Guest, Customer, Admin) through client-side route protection and conditional UI rendering.

---

### 10.1. Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5.9 |
| UI Library | React 18.3 |
| Styling | Tailwind CSS 3.4 + PostCSS + Autoprefixer |
| HTTP Client | Axios (with interceptor for JWT Bearer) |
| State Management | Zustand 5 (persist middleware for auth) |
| Form Handling | React Hook Form 7 + Zod 4 (schema validation) |
| UI Primitives | Radix UI (`@radix-ui/react-slot`) + CVA (class-variance-authority) |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| CSS Utilities | clsx + tailwind-merge |

---

### 10.2. Project Structure

```
frontend/
├── next.config.mjs                    # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── tsconfig.json                      # TypeScript paths (@/ alias → src/)
├── postcss.config.mjs                 # PostCSS plugins
├── package.json                       # Dependencies & scripts
├── .env.local                         # NEXT_PUBLIC_API_BASE_URL (git-ignored)
│
├── src/
│   ├── app/                           # Next.js App Router — file-based routing
│   │   ├── layout.tsx                 # Root layout (HTML shell, <Toaster />, global CSS)
│   │   ├── globals.css                # Tailwind directives + global styles
│   │   ├── page.tsx                   # Homepage — hero, category pills, book grids, rankings, ads
│   │   │
│   │   ├── login/page.tsx             # NV-A2: Login form (react-hook-form + zod)
│   │   ├── (auth)/register/page.tsx   # NV-A1: Register form
│   │   ├── profile/page.tsx           # NV-A4: View & update profile
│   │   │
│   │   ├── books/
│   │   │   ├── page.tsx               # NV-B1: Book catalog with search & filters
│   │   │   └── [id]/page.tsx          # NV-B2: Book detail + stock + similar + series
│   │   ├── categories/
│   │   │   ├── page.tsx               # NV-F4: Category listing
│   │   │   └── [slug]/page.tsx        # Books filtered by category slug
│   │   ├── best-sellers/page.tsx      # NV-E2: Top-10 best sellers
│   │   ├── most-viewed/
│   │   │   ├── daily/page.tsx         # NV-E3: Most viewed today
│   │   │   └── 30days/page.tsx        # NV-E3: Most viewed past 30 days
│   │   ├── authors/page.tsx           # Author listing page
│   │   │
│   │   ├── cart/page.tsx              # NV-C1/C2: Cart view & edit
│   │   ├── checkout/page.tsx          # NV-D1: Checkout flow (cart or buy-now session)
│   │   ├── orders/
│   │   │   ├── page.tsx               # NV-D2: Order history
│   │   │   └── [id]/page.tsx          # NV-D3: Order detail
│   │   │
│   │   └── admin/                     # Admin panel (role: admin only)
│   │       ├── layout.tsx             # Admin sidebar layout
│   │       ├── page.tsx               # Dashboard overview
│   │       ├── books/page.tsx         # NV-F2: Book CRUD + stock management
│   │       ├── categories/page.tsx    # NV-F4: Category CRUD
│   │       ├── orders/
│   │       │   ├── page.tsx           # NV-F1: Order management
│   │       │   └── [id]/page.tsx      # NV-F1: Order detail + status update + audit trail
│   │       ├── users/page.tsx         # User management (activate/deactivate)
│   │       └── analytics/page.tsx     # NV-E2: Best-seller analytics + sales summary
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── SiteHeader.tsx         # Main navigation bar (responsive, auth-aware)
│   │   │   ├── Header.tsx             # Legacy header wrapper
│   │   │   ├── Footer.tsx             # Site footer with navigation links
│   │   │   └── RouteShell.tsx         # Page wrapper (Header + Footer + content)
│   │   │
│   │   ├── ads/
│   │   │   └── PromoBanners.tsx       # Home and side promotional banners
│   │   │
│   │   ├── home/
│   │   │   ├── HeroSection.tsx        # Homepage hero banner
│   │   │   ├── BooksGridSection.tsx   # Book grid (newest / best sellers)
│   │   │   ├── CategoryPills.tsx      # Category pill buttons
│   │   │   ├── RankingSection.tsx     # Most-viewed + best-seller rankings
│   │   │   └── OrderJourneySection.tsx # Order and checkout journey section
│   │   │
│   │   ├── books/
│   │   │   ├── book-card.tsx          # Reusable book card component
│   │   │   ├── BooksPage.tsx          # Shared book listing page logic
│   │   │   ├── BooksToolbar.tsx       # Filter & sort toolbar
│   │   │   └── section-header.tsx     # Section header with "See all" link
│   │   │
│   │   ├── sections/
│   │   │   ├── SectionTitle.tsx       # Styled section title
│   │   │   └── section-title.tsx      # Section title variant
│   │   │
│   │   ├── admin/
│   │   │   ├── BookFormDrawer.tsx     # Slide-over drawer for book create/edit
│   │   │   ├── CategoryFormDrawer.tsx # Slide-over drawer for category create/edit
│   │   │   ├── ConfirmDialog.tsx      # Confirmation modal (delete / status change)
│   │   │   ├── Pagination.tsx         # Reusable pagination controls
│   │   │   └── StatusBadge.tsx        # Order status badge (colour-coded)
│   │   │
│   │   └── ui/
│   │       ├── button.tsx             # CVA-based Button component (variants: primary, secondary, outline)
│   │       └── container.tsx          # Max-width content container
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts             # Axios instance (baseURL + JWT interceptor)
│   │   │   ├── auth.ts               # register, login, logout
│   │   │   ├── books.ts              # search, getNewBooks, getDetail, getSimilar, getSeries, admin CRUD
│   │   │   ├── categories.ts         # list, admin CRUD
│   │   │   ├── cart.ts               # get, add, updateItem, removeItem
│   │   │   ├── orders.ts             # checkout, buyNow, history, detail, admin operations
│   │   │   ├── recommendations.ts    # similarBooks, seriesBooks
│   │   │   └── admin.ts              # listUsers, getUser, deactivateUser, bestSellers, sales
│   │   │
│   │   ├── types/
│   │   │   └── index.ts              # All TypeScript interfaces & request/response DTOs
│   │   │
│   │   ├── routes.ts                 # Navigation link definitions (navLinks, footerLinks)
│   │   ├── design-tokens.ts          # Design system constants (colours, spacing, typography)
│   │   ├── books.ts                  # Book utility helpers
│   │   ├── cn.ts                     # clsx + tailwind-merge utility
│   │   └── utils.ts                  # General utility functions
│   │
│   └── stores/
│       ├── auth.store.ts             # Zustand: token + user state (persist to localStorage)
│       └── cart.store.ts             # Zustand: cart items + total price (in-memory)
│
└── DESIGN.md                          # Design system documentation
```

---

### 10.3. Pages & Routing

The application uses **Next.js App Router** with file-based routing. Pages are organised by actor scope:

#### Public Pages (Guest)

| Route | File | NV | Description |
|---|---|---|---|
| `/` | `page.tsx` | — | Homepage with hero, category pills, book grids, rankings, order journey, and side ads |
| `/login` | `login/page.tsx` | A2 | Login form with email + password validation |
| `/register` | `(auth)/register/page.tsx` | A1 | Registration form with name, email, phone, password |
| `/books` | `books/page.tsx` | B1 | Book catalog with search, filter by author/publisher/year/price |
| `/books/:id` | `books/[id]/page.tsx` | B2 | Book detail: metadata, stock, similar books (Neo4j), series volumes |
| `/categories` | `categories/page.tsx` | F4 | All categories listing |
| `/categories/:slug` | `categories/[slug]/page.tsx` | B1 | Books filtered by category slug |
| `/best-sellers` | `best-sellers/page.tsx` | E2 | Top-10 bestselling books (30-day, from Redis) |
| `/most-viewed/daily` | `most-viewed/daily/page.tsx` | E3 | Top-10 most viewed today (Redis ZSET) |
| `/most-viewed/30days` | `most-viewed/30days/page.tsx` | E3 | Top-10 most viewed past 30 days (Redis cache) |
| `/authors` | `authors/page.tsx` | — | Author listing page |

#### Customer Pages (JWT, `role: user`)

| Route | File | NV | Description |
|---|---|---|---|
| `/profile` | `profile/page.tsx` | A4 | View & update user profile (name, phone, default address) |
| `/cart` | `cart/page.tsx` | C1/C2 | View cart items, update quantities, remove items |
| `/checkout` | `checkout/page.tsx` | D1 | Checkout from cart or buy-now session |
| `/orders` | `orders/page.tsx` | D2 | Order history list (paginated) |
| `/orders/:id` | `orders/[id]/page.tsx` | D3 | Order detail with line items and status |

#### Admin Pages (JWT, `role: admin`)

| Route | File | NV | Description |
|---|---|---|---|
| `/admin` | `admin/page.tsx` | — | Admin dashboard overview |
| `/admin/books` | `admin/books/page.tsx` | F2 | Book CRUD table + stock management (drawer form) |
| `/admin/categories` | `admin/categories/page.tsx` | F4 | Category CRUD table (drawer form) |
| `/admin/orders` | `admin/orders/page.tsx` | F1 | Order list with status filter |
| `/admin/orders/:id` | `admin/orders/[id]/page.tsx` | F1 | Order detail + status update + audit trail |
| `/admin/users` | `admin/users/page.tsx` | — | User management: list, view, activate/deactivate |
| `/admin/analytics` | `admin/analytics/page.tsx` | E2 | Best-seller analytics + sales summary |

---

### 10.4. State Management

Two Zustand stores handle client-side state. Authentication state is persisted to `localStorage` via the `persist` middleware; cart state is kept in-memory only (source of truth is always the backend).

| Store | File | Persistence | State | Actions |
|---|---|---|---|---|
| `useAuthStore` | `stores/auth.store.ts` | `localStorage` (`auth-storage`) | `token: string`, `user: UserInfo` | `setAuth(token, user)`, `clearAuth()` |
| `useCartStore` | `stores/cart.store.ts` | In-memory only | `items: CartItem[]`, `totalPrice: number` | `setCart(items, totalPrice)`, `clearCart()` |

**Authentication flow:**
1. `POST /auth/login` → receive `{ access_token, user }`.
2. Store token in `localStorage` as `access_token` (for Axios interceptor) and in Zustand `auth-storage` (for UI state).
3. Axios request interceptor reads `localStorage.access_token` and attaches `Authorization: Bearer <token>` header.
4. On logout: `POST /auth/logout` → `clearAuth()` → remove `access_token` from `localStorage`.

---

### 10.5. API Client Layer

All backend communication goes through a centralised Axios instance (`lib/api/client.ts`) configured with:

| Setting | Value |
|---|---|
| `baseURL` | `NEXT_PUBLIC_API_BASE_URL` env var (default: `http://localhost:8080/api/v1`) |
| `Content-Type` | `application/json` |
| JWT injection | Request interceptor reads `localStorage.access_token` and sets `Authorization` header |

#### API Modules

Each module exports a plain object with async methods that call the backend and unwrap the response:

| Module | File | Methods | Backend Scope |
|---|---|---|---|
| `authApi` | `lib/api/auth.ts` | `register`, `login`, `logout` | Public + Customer |
| `booksApi` | `lib/api/books.ts` | `search`, `getNewBooks`, `getDetail`, `getSimilar`, `getSeries`, `adminList`, `adminCreate`, `adminUpdate`, `adminDelete`, `adminUpdateStock` | Public + Admin |
| `categoriesApi` | `lib/api/categories.ts` | `list`, `adminList`, `adminCreate`, `adminUpdate`, `adminDelete` | Public + Admin |
| `cartApi` | `lib/api/cart.ts` | `get`, `add`, `updateItem`, `removeItem` | Customer |
| `ordersApi` | `lib/api/orders.ts` | `checkout`, `buyNow`, `history`, `detail`, `adminList`, `adminGet`, `adminUpdateStatus`, `adminHistory` | Customer + Admin |
| `recommendationsApi` | `lib/api/recommendations.ts` | `similarBooks`, `seriesBooks` | Public |
| `adminApi` | `lib/api/admin.ts` | `listUsers`, `getUser`, `deactivateUser`, `bestSellers`, `sales` | Admin |

#### TypeScript Interfaces

All request/response types are defined in `lib/types/index.ts` (351 lines), including:

| Category | Interfaces |
|---|---|
| Domain Models | `User`, `Book`, `BookDetail`, `Category`, `CartItem`, `Order`, `OrderItem`, `OrderStatusHistory`, `Shipment` |
| Book Sub-types | `BookImage`, `BookSeries`, `BookAuthor`, `BookTag`, `BookPricing`, `BookCategoryRef` |
| Recommendations | `SimilarBook`, `SeriesBook`, `BestSellerBook`, `MostViewedBook` |
| Request DTOs | `RegisterRequest`, `LoginRequest`, `UpdateProfileRequest`, `CreateBookRequest`, `UpdateBookRequest`, `AddToCartRequest`, `CheckoutRequest`, `BuyNowRequest`, `UpdateOrderStatusRequest`, `DeactivateUserRequest` |
| Response DTOs | `LoginResponse`, `BookListResponse`, `CategoryListResponse`, `CartResponse`, `OrderListResponse`, `UserListResponse`, `RecommendationResponse`, `BuyNowResponse`, `SalesSummary` |

---

### 10.6. Component Architecture

Components are organised into seven directories by responsibility:

| Directory | Scope | Components |
|---|---|---|
| `components/layout/` | App-wide shell | `SiteHeader` (navigation + auth-aware menu), `Footer` (links + branding), `RouteShell` (Header + Footer wrapper), `Header` (legacy) |
| `components/ads/` | Promotional placements | `PromoBanners` (home-wide banner and side ad rails) |
| `components/home/` | Homepage sections | `HeroSection`, `BooksGridSection`, `CategoryPills`, `RankingSection`, `OrderJourneySection` |
| `components/books/` | Book catalog | `book-card` (card with cover, title, author, price), `BooksPage` (shared listing logic), `BooksToolbar` (catalog toolbar component), `ranked-book-tile`, `section-header` |
| `components/sections/` | Shared section titles | `SectionTitle`, `section-title` |
| `components/admin/` | Admin panel | `BookFormDrawer` (slide-over for book CRUD), `CategoryFormDrawer` (slide-over for category CRUD), `ConfirmDialog` (delete/status confirmation), `Pagination` (page controls), `StatusBadge` (colour-coded order status) |
| `components/ui/` | Design system primitives | `button` (CVA variants: primary, secondary, outline, ghost + sizes), `commerce` (customer-facing sections, panels, grids, states), `container` (max-width wrapper) |

#### Design System

The frontend uses a token-based design system documented in `DESIGN.md`, with CSS variables in `src/app/globals.css` and Tailwind theme extensions in `tailwind.config.ts`:

- **Colour palette**: Backed by CSS variables and Tailwind token names for warm canvas backgrounds, commerce accents, and semantic status colours.
- **Typography**: System font stack configured via Tailwind CSS.
- **Spacing & Layout**: Shared page width, section spacing, commerce panels, and product grids through Tailwind utilities and `components/ui/commerce.tsx`.
- **Button variants**: Built with `class-variance-authority` (CVA) for type-safe variant props (`variant`, `size`).
- **Utility functions**: `cn()` from `lib/cn.ts` — merges `clsx` + `tailwind-merge` for conflict-free class composition.

---

### 10.7. Getting Started

```bash
cd hcmus-master-is-db/frontend

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Or create manually:
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1" > .env.local

# 3. Start development server
npm run dev
# → http://localhost:3000

# 4. Build for production (optional)
npm run build
npm start
```

| Script | Command | Description |
|---|---|---|
| `dev` | `next dev` | Start development server with hot reload |
| `build` | `next build` | Create production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint checks |

> **Note:** The backend API server must be running on `http://localhost:8080` before starting the frontend.
> See [Section 6.2](#62-quick-start-with-docker) for backend setup instructions.
