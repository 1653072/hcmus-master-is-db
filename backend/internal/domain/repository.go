package domain

import (
	"context"

	"github.com/google/uuid"
)

// ─── PostgreSQL repositories ─────────────────────────────────────────────────

// UserRepository covers all user persistence operations backed by PostgreSQL.
type UserRepository interface {
	CreateUser(ctx context.Context, user *User) error
	GetUserByID(ctx context.Context, id uuid.UUID) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	UpdateUser(ctx context.Context, user *User) error
	ListUsers(ctx context.Context, page, pageSize int) ([]*User, int64, error)
	DeactivateUser(ctx context.Context, id uuid.UUID, active bool) error
}

// AddressRepository covers delivery address operations backed by PostgreSQL.
type AddressRepository interface {
	CreateAddress(ctx context.Context, addr *Address) error
	GetAddressByID(ctx context.Context, id uuid.UUID) (*Address, error)
	ListAddressesByUser(ctx context.Context, userID uuid.UUID) ([]*Address, error)
	UpdateAddress(ctx context.Context, addr *Address) error
	DeleteAddress(ctx context.Context, id uuid.UUID) error
	SetDefault(ctx context.Context, userID, addrID uuid.UUID) error
}

// OrderRepository covers order persistence operations backed by PostgreSQL.
type OrderRepository interface {
	CreateOrder(ctx context.Context, order *Order, historyRepo OrderStatusHistoryRepository) error
	GetOrderByID(ctx context.Context, id uuid.UUID) (*Order, error)
	ListOrdersByUser(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*Order, int64, error)
	ListAllOrders(ctx context.Context, status OrderStatus, page, pageSize int) ([]*Order, int64, error)
	UpdateOrderStatus(ctx context.Context, id uuid.UUID, status OrderStatus, adminID *uuid.UUID, note string) error
}

// InventoryRepository manages stock levels in the inventory table (PostgreSQL).
type InventoryRepository interface {
	GetInventory(ctx context.Context, bookID string) (*Inventory, error)
	GetInventoryForUpdate(ctx context.Context, bookID string) (*Inventory, error)
	CreateInventory(ctx context.Context, inv *Inventory) error
	UpdateStock(ctx context.Context, bookID string, delta int) error
}

// PersistentCartRepository is the PSQL source-of-truth for shopping carts.
type PersistentCartRepository interface {
	UpsertCartItem(ctx context.Context, item *PersistentCartItem) error
	GetCartByUser(ctx context.Context, userID uuid.UUID) ([]*PersistentCartItem, error)
	DeleteCartItem(ctx context.Context, userID uuid.UUID, bookID string) error
	DeleteCartByUser(ctx context.Context, userID uuid.UUID) error
}

// OrderStatusHistoryRepository stores the audit trail of order status changes.
type OrderStatusHistoryRepository interface {
	CreateHistory(ctx context.Context, history *OrderStatusHistory) error
	ListByOrder(ctx context.Context, orderID uuid.UUID) ([]*OrderStatusHistory, error)
}

// BookRefRepository manages the PostgreSQL bridge table between MongoDB book
// documents and active status.
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
	PersistentCartRepository
	OrderStatusHistoryRepository
	AddressRepository
	// Transaction runs fn inside a single PostgreSQL ACID transaction.
	Transaction(ctx context.Context, fn func(tx PostgresTransactor) error) error
}

// ─── MongoDB repositories ────────────────────────────────────────────────────

// BookFilter holds optional filter criteria for book search/listing queries.
type BookFilter struct {
	Search    string  // renamed from Query — full-text search term
	Author    string
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
	ListCategories(ctx context.Context, page, pageSize int) ([]*Category, int64, error)
	UpdateCategory(ctx context.Context, id string, cat *Category) error
	DeleteCategory(ctx context.Context, id string) error
}

// ─── Redis repositories ───────────────────────────────────────────────────────

// SessionRepository manages JWT session tokens and the blacklist in Redis.
type SessionRepository interface {
	SetToken(ctx context.Context, userID string, token string) error
	GetToken(ctx context.Context, userID string) (string, error)
	BlacklistToken(ctx context.Context, token string) error
	IsBlacklisted(ctx context.Context, token string) (bool, error)
}

// CartCacheRepository manages the Redis cart cache (source of truth is PSQL).
type CartCacheRepository interface {
	SetCart(ctx context.Context, userID string, items []CartItem) error
	GetCart(ctx context.Context, userID string) ([]CartItem, bool, error)
	InvalidateCart(ctx context.Context, userID string) error
}

// CheckoutSessionRepository manages temporary Buy-Now sessions in Redis.
type CheckoutSessionRepository interface {
	CreateSession(ctx context.Context, sessionID string, session *BuyNowSession) error
	GetSession(ctx context.Context, sessionID string) (*BuyNowSession, error)
	DeleteSession(ctx context.Context, sessionID string) error
}

// TrendingRepository manages the Redis Sorted Set used for bestseller rankings.
type TrendingRepository interface {
	IncrScore(ctx context.Context, bookID string, delta float64) error
	GetTop(ctx context.Context, n int) ([]TrendingBook, error)
	SetTop(ctx context.Context, books []TrendingBook) error
}

// BookCacheRepository caches book data in Redis for fast read paths.
type BookCacheRepository interface {
	SetDetail(ctx context.Context, bookID string, book *BookDetail) error
	GetDetail(ctx context.Context, bookID string) (*BookDetail, bool, error)
	SetNewest(ctx context.Context, books []*Book) error
	GetNewest(ctx context.Context) ([]*Book, bool, error)
	SetStock(ctx context.Context, bookID string, qty int) error
	GetStock(ctx context.Context, bookID string) (int, bool, error)
}

// ─── Neo4j repository ─────────────────────────────────────────────────────────

// RecommendationRepository issues graph traversal queries against Neo4j.
type RecommendationRepository interface {
	GetSimilarBooks(ctx context.Context, mongoID string, limit int) ([]SimilarBook, error)
	GetSeriesBooks(ctx context.Context, seriesName string) ([]SeriesBook, error)
	UpsertBookNode(ctx context.Context, node BookNode) error
	DeleteBookNode(ctx context.Context, mongoID string) error
	RecordViewed(ctx context.Context, userID, bookID string) error
	RecordPurchased(ctx context.Context, userID, bookID, orderID string, qty int) error
}
