package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// ─── PostgreSQL repositories ─────────────────────────────────────────────────

// UserRepository covers all user persistence operations backed by PostgreSQL.
type UserRepository interface {
	CreateUser(ctx context.Context, user *User) error
	// GetUserByID fetches a user by internal BIGSERIAL primary key (fastest path; used after JWT extraction).
	GetUserByID(ctx context.Context, id int64) (*User, error)
	// GetUserByAliasID fetches a user by the external UUID alias (used for admin panel URL params).
	GetUserByAliasID(ctx context.Context, aliasID uuid.UUID) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
	ListUsers(ctx context.Context, page, pageSize int) ([]*User, int64, error)
	// DeactivateUser toggles the is_active flag; id is the alias_id UUID.
	DeactivateUser(ctx context.Context, aliasID uuid.UUID, active bool) error
}

// AddressRepository covers delivery address operations backed by PostgreSQL.
type AddressRepository interface {
	CreateAddress(ctx context.Context, addr *Address) error
	// GetAddressByAliasID fetches a single address by its external UUID alias.
	GetAddressByAliasID(ctx context.Context, aliasID uuid.UUID) (*Address, error)
	// ListAddressesByUser returns all addresses belonging to a user (by internal int64 user ID).
	ListAddressesByUser(ctx context.Context, userInternalID int64) ([]*Address, error)
	UpdateAddress(ctx context.Context, addr *Address) error
	// DeleteAddress marks an address as deleted (soft-delete).
	DeleteAddress(ctx context.Context, userInternalID int64, aliasID uuid.UUID) error
	// ResetDefault clears the is_default flag on all addresses for the same user.
	ResetDefault(ctx context.Context, userInternalID int64) error
	// SetDefault marks one address as default; userInternalID is int64, addrAliasID is UUID.
	SetDefault(ctx context.Context, userInternalID int64, addrAliasID uuid.UUID) error
}

// OrderRepository covers order persistence operations backed by PostgreSQL.
type OrderRepository interface {
	CreateOrder(ctx context.Context, order *Order, historyRepo OrderStatusHistoryRepository) error
	// GetOrderByAliasID fetches an order together with its line items using the external UUID alias.
	GetOrderByAliasID(ctx context.Context, aliasID uuid.UUID) (*Order, error)
	// ListOrdersByUser returns a paginated list of orders belonging to a single user (by internal int64 ID).
	ListOrdersByUser(ctx context.Context, userInternalID int64, page, pageSize int) ([]*Order, int64, error)
	ListAllOrders(ctx context.Context, status OrderStatus, page, pageSize int) ([]*Order, int64, error)
	// GetSalesSummary computes total revenue and order count for a date range (YYYY-MM-DD).
	GetSalesSummary(ctx context.Context, from, to string) (int64, float64, error)
	// UpdateOrderStatus transitions the order to newStatus after validating the state machine.
	// id is the internal BIGSERIAL PK; adminAliasID is the external UUID of the acting admin.
	// Returns an error if the transition is illegal (e.g. completed → any, cancelled → any).
	UpdateOrderStatus(ctx context.Context, id int64, newStatus OrderStatus, adminAliasID *uuid.UUID, note string) error
}

// InventoryRepository manages stock levels in the inventory table (PostgreSQL).
type InventoryRepository interface {
	GetInventory(ctx context.Context, bookID string) (*Inventory, error)
	// GetInventoryForUpdate acquires a row-level lock (SELECT FOR UPDATE).
	// Must always be called inside a Transaction block.
	GetInventoryForUpdate(ctx context.Context, bookID string) (*Inventory, error)
	CreateInventory(ctx context.Context, inv *Inventory) error
	// UpdateStock adjusts stock_quantity by delta (positive = restock, negative = deduct).
	// A database CHECK constraint prevents stock_quantity from going below zero.
	UpdateStock(ctx context.Context, bookID string, delta int) error
}

// CartRepository is the PostgreSQL source-of-truth for shopping carts.
// Each user owns one Cart header record; CartItemRecord rows reference it.
// All user and cart IDs are internal int64 BIGSERIAL values.
type CartRepository interface {
	GetOrCreateCartByUserID(ctx context.Context, userInternalID int64) (*Cart, error)
	UpsertCartItem(ctx context.Context, cartID int64, item *CartItemRecord) error
	GetCartItemsByUserID(ctx context.Context, userInternalID int64) ([]*CartItemRecord, error)
	DeleteCartItemByBookID(ctx context.Context, cartID int64, bookID string) error
	DeleteCartByUserID(ctx context.Context, userInternalID int64) error
}

// OrderStatusHistoryRepository stores the audit trail of order status changes.
type OrderStatusHistoryRepository interface {
	CreateHistory(ctx context.Context, history *OrderStatusHistory) error
	// ListByOrder returns all history records for the given order (by internal int64 order ID).
	ListByOrder(ctx context.Context, orderInternalID int64) ([]*OrderStatusHistory, error)
}

// ShipmentRepository covers shipment tracking operations backed by PostgreSQL.
type ShipmentRepository interface {
	CreateShipment(ctx context.Context, shipment *Shipment) error
	GetShipmentByAliasID(ctx context.Context, aliasID uuid.UUID) (*Shipment, error)
	// GetShipmentByOrderAliasID fetches the shipment record for a specific order using its UUID alias.
	GetShipmentByOrderAliasID(ctx context.Context, orderAliasID uuid.UUID) (*Shipment, error)
	// UpdateShipmentStatus updates the status of a shipment; id is the internal BIGSERIAL PK.
	UpdateShipmentStatus(ctx context.Context, id int64, status ShipmentStatus) error
	// UpdateShipmentDetails updates carrier and tracking number; id is the internal BIGSERIAL PK.
	UpdateShipmentDetails(ctx context.Context, id int64, carrier, trackingNo string) error
}

// BookRefRepository manages the PostgreSQL bridge table between MongoDB book
// documents and their active status.
type BookRefRepository interface {
	GetBookRef(ctx context.Context, mongoID string) (*BookRef, error)
	CreateBookRef(ctx context.Context, ref *BookRef) error
	UpdateBookRef(ctx context.Context, ref *BookRef) error
}

// PostgresTransactor groups all PostgreSQL repositories under a single
// transaction scope.
type PostgresTransactor interface {
	UserRepository
	OrderRepository
	BookRefRepository
	InventoryRepository
	CartRepository
	OrderStatusHistoryRepository
	AddressRepository
	ShipmentRepository
	// Transaction runs fn inside a single PostgreSQL ACID transaction.
	Transaction(ctx context.Context, fn func(tx PostgresTransactor) error) error
}

// ─── MongoDB repositories ────────────────────────────────────────────────────

// BookFilter holds optional filter criteria for book search and listing queries.
type BookFilter struct {
	Search    string
	Author    string
	Category  string
	Publisher string
	Year      int
	MinPrice  float64
	MaxPrice  float64
	Page      int
	PageSize  int
}

// BookRepository covers all book-catalog operations backed by MongoDB.
type BookRepository interface {
	SearchBooks(ctx context.Context, filter BookFilter) ([]*Book, int64, error)
	GetBookByID(ctx context.Context, id string) (*Book, error)
	GetBooksByIDs(ctx context.Context, ids []string) ([]*Book, error)
	GetNewestBooks(ctx context.Context, limit int) ([]*Book, error)
	CreateBook(ctx context.Context, book *Book) (string, error)
	UpdateBook(ctx context.Context, id string, book *Book) error
	DeleteBook(ctx context.Context, id string) error
}

// CategoryRepository covers CRUD operations on the MongoDB "categories" collection.
type CategoryRepository interface {
	CreateCategory(ctx context.Context, cat *Category) (string, error)
	GetCategoryByID(ctx context.Context, id string) (*Category, error)
	GetCategoryBySlug(ctx context.Context, slug string) (*Category, error)
	ListCategories(ctx context.Context, page, pageSize int) ([]*Category, int64, error)
	UpdateCategory(ctx context.Context, id string, cat *Category) error
	DeleteCategory(ctx context.Context, id string) error
}

// EventLogRepository persists user behaviour events in the MongoDB "view_event_logs" collection.
// It is the source of truth for the 30-day most-viewed aggregation.
type EventLogRepository interface {
	InsertEventLog(ctx context.Context, log *EventLog) error
	AggregateTopViewed(ctx context.Context, from time.Time, limit int) ([]MostViewedBook, error)
}

// ─── Redis repositories ───────────────────────────────────────────────────────

// SessionRepository manages JWT session tokens and the blacklist in Redis.
type SessionRepository interface {
	SetToken(ctx context.Context, userID string, token string) error
	GetToken(ctx context.Context, userID string) (string, error)
	BlacklistToken(ctx context.Context, token string) error
	IsBlacklisted(ctx context.Context, token string) (bool, error)
}

// CartCacheRepository manages the Redis cart cache.
// The PostgreSQL cart_items table is always the source of truth.
type CartCacheRepository interface {
	SetCart(ctx context.Context, userID string, items []CartItem) error
	GetCart(ctx context.Context, userID string) ([]CartItem, bool, error)
	InvalidateCart(ctx context.Context, userID string) error
}

// CheckoutSessionRepository manages temporary Buy-Now sessions in Redis (TTL 15 min).
type CheckoutSessionRepository interface {
	CreateSession(ctx context.Context, sessionID string, session *BuyNowSession) error
	GetSession(ctx context.Context, sessionID string) (*BuyNowSession, error)
	DeleteSession(ctx context.Context, sessionID string) error
}

// BestSellerRepository manages the Redis JSON string cache for bestseller rankings (NV-E2).
// The cache key "books:best_sellers" stores a Snappy-compressed JSON array with TTL 1 day.
// The data is refreshed daily at 17:00 UTC (00:00 GMT+7) by BestSellerWorker, which aggregates
// order_items from PostgreSQL for the past 30 days.
type BestSellerRepository interface {
	GetTopBestSellers(ctx context.Context, topN int) ([]BestSellerBook, error)
	SetTopBestSellers(ctx context.Context, books []BestSellerBook) error
}

// BookCacheRepository caches book data in Redis for fast read paths.
type BookCacheRepository interface {
	SetDetail(ctx context.Context, bookID string, book *BookDetail) error
	GetDetail(ctx context.Context, bookID string) (*BookDetail, bool, error)
	InvalidateDetail(ctx context.Context, bookID string) error
	SetNewest(ctx context.Context, books []*Book) error
	GetNewest(ctx context.Context) ([]*Book, bool, error)
	InvalidateNewest(ctx context.Context) error
	SetStock(ctx context.Context, bookID string, qty int) error
	GetStock(ctx context.Context, bookID string) (int, bool, error)
	InvalidateStock(ctx context.Context, bookID string) error
}

// OrderCacheRepository caches paginated order history lists in Redis (NV-D2, TTL 30 min).
type OrderCacheRepository interface {
	SetOrderHistory(ctx context.Context, userID string, page, pageSize int, orders []*Order, total int64) error
	GetOrderHistory(ctx context.Context, userID string, page, pageSize int) ([]*Order, int64, bool, error)
	InvalidateOrderHistory(ctx context.Context, userID string) error
}

// CategoryCacheRepository caches paginated category lists in Redis (NV-F4).
type CategoryCacheRepository interface {
	SetCategoryList(ctx context.Context, page, pageSize int, cats []*Category, total int64) error
	GetCategoryList(ctx context.Context, page, pageSize int) ([]*Category, int64, bool, error)
	InvalidateCategoryList(ctx context.Context) error
}

// MostViewedRepository manages the two Redis structures for daily most-viewed rankings (NV-E3):
//
//   - Count sorted set  (key: "books:most_viewed:daily:count", type: ZSET, TTL 1 day):
//     Accumulates ZINCRBY increments on every ViewBook call throughout the day.
//     Expires automatically after 24 hours; if the worker fails, new events recreate
//     it from zero — which is the correct behaviour for a fresh day.
//
//   - Data cache        (key: "books:most_viewed:daily:data",  type: STRING, TTL 1 day):
//     Stores a Snappy-compressed JSON array of the top-N most-viewed books,
//     enriched with book titles from MongoDB.  Refreshed on demand by the API handler
//     whenever the live count set diverges from the cached ranking.
//
// MostViewedWorker runs at 17:00 UTC (00:00 GMT+7) and simply clears both keys so the new day
// starts from zero.
type MostViewedRepository interface {
	// IncrementDailyViewCount atomically increments the view counter for bookID in the
	// daily count sorted set and sets a 24-hour TTL on first write of the day via EXPIRENV.
	IncrementDailyViewCount(ctx context.Context, bookID string) error

	// GetTopDailyViewedFromCountSet returns the top-N entries from the live daily count sorted set.
	GetTopDailyViewedFromCountSet(ctx context.Context, topN int) ([]MostViewedBook, error)

	// ResetDailyViewCountSet deletes the daily count sorted set (called by worker at 17:00 UTC / 00:00 GMT+7).
	ResetDailyViewCountSet(ctx context.Context) error

	// SetDailyTopViewedData stores the enriched top-N JSON in the daily data cache (TTL 1 day).
	SetDailyTopViewedData(ctx context.Context, books []MostViewedBook) error

	// GetDailyTopViewedData retrieves the cached daily top-N data.
	// The second return value is true on a cache hit.
	GetDailyTopViewedData(ctx context.Context) ([]MostViewedBook, bool, error)

	// Set30DaysTopViewedData stores the pre-computed 30-day top-N JSON (TTL 1 day).
	Set30DaysTopViewedData(ctx context.Context, books []MostViewedBook) error

	// Get30DaysTopViewedData retrieves the cached 30-day top-N data.
	// The second return value is true on a cache hit.
	Get30DaysTopViewedData(ctx context.Context) ([]MostViewedBook, bool, error)
}

// ─── Neo4j repository ─────────────────────────────────────────────────────────

// RecommendationRepository issues graph traversal and mutation queries against Neo4j.
// The graph stores Book nodes connected via BELONGS_TO, WRITTEN_BY, PUBLISHED_BY,
// HAS_TAG, IN_SERIES, and SIMILARITY_TO relationships.
// No User nodes are stored; user behaviour (VIEWED events) is recorded in MongoDB only.
type RecommendationRepository interface {
	// GetSimilarBooks returns books similar to mongoID, ranked by pre-computed
	// SIMILARITY_TO edge scores (falls back to live traversal when edges are absent).
	GetSimilarBooks(ctx context.Context, mongoID string, limit int) ([]SimilarBook, error)

	// GetSeriesBooks returns all books in the same series, ordered by volume.
	GetSeriesBooks(ctx context.Context, seriesName string) ([]SeriesBook, error)

	// UpsertBookNode creates or updates a Book node and its outgoing relationships,
	// then recomputes SIMILARITY_TO edges against all active books.
	UpsertBookNode(ctx context.Context, node BookNode) error

	// DeleteBookNode marks a Book node as inactive (soft-delete in the graph).
	DeleteBookNode(ctx context.Context, mongoID string) error

	// UpsertCategoryNode creates or updates a Category node and its PARENT_OF relationship.
	UpsertCategoryNode(ctx context.Context, cat *Category) error

	// DeleteCategoryNode detaches and removes a Category node from the graph.
	DeleteCategoryNode(ctx context.Context, catID string) error
}
