package domain

import (
	"time"

	"github.com/google/uuid"
)

// ─── Similarity / BestSeller constants ────────────────────────────────────────

const (
	WeightCategory  = 0.50
	WeightAuthor    = 0.33
	WeightPublisher = 0.17

	BestSellerWindowDays = 30
	BestSellerTopN       = 10
)

// ─── User ────────────────────────────────────────────────────────────────────

type UserRole string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"
)

// User is the PostgreSQL-backed entity for authentication and profile data.
//
// Dual-identifier pattern:
//   - ID (BIGSERIAL) is the internal primary key used for all FK relationships.
//     It is never exposed in API responses (json:"-").
//   - AliasID (UUID) is the stable external identifier returned in all API responses.
//     It is generated once at row creation and never changes.
type User struct {
	ID           int64     `gorm:"primaryKey;autoIncrement"                                        json:"-"`
	AliasID      uuid.UUID `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid();column:alias_id" json:"alias_id"`
	FullName     string    `gorm:"not null"                                                        json:"full_name"`
	Email        string    `gorm:"uniqueIndex;not null"                                            json:"email"`
	Phone        string    `                                                                       json:"phone,omitempty"`
	PasswordHash string    `gorm:"not null"                                                        json:"-"`
	Role         UserRole  `gorm:"type:varchar(10);not null;default:'user'"                        json:"role"`
	IsActive     bool      `gorm:"not null;default:true"                                           json:"is_active"`
	CreatedAt    time.Time `                                                                       json:"created_at"`
	UpdatedAt    time.Time `                                                                       json:"-"`
}

// ─── Address (PostgreSQL) ─────────────────────────────────────────────────────

// Address stores a delivery address belonging to a user.
//
// Dual-identifier pattern: ID (BIGSERIAL) is the internal FK used by the orders
// table; AliasID (UUID) is the external identifier exposed via the API.
type Address struct {
	ID           int64     `gorm:"primaryKey;autoIncrement"                                        json:"-"`
	AliasID      uuid.UUID `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid();column:alias_id" json:"alias_id"`
	UserID       int64     `gorm:"not null;index"                                                  json:"-"`
	ReceiverName string    `gorm:"not null"                                                        json:"receiver_name"`
	Phone        string    `gorm:"not null"                                                        json:"phone"`
	AddressLine  string    `gorm:"not null"                                                        json:"address_line"`
	Ward         string    `                                                                       json:"ward,omitempty"`
	District     string    `                                                                       json:"district,omitempty"`
	City         string    `gorm:"not null"                                                        json:"city"`
	IsDefault    bool       `gorm:"not null;default:false"                                          json:"is_default"`
	CreatedAt    time.Time  `                                                                       json:"created_at"`
	UpdatedAt    time.Time  `                                                                       json:"-"`
	DeletedAt    *time.Time `gorm:"index"                                                           json:"-"`
}

// ─── Book (Catalog — MongoDB) ─────────────────────────────────────────────────

// BookImage represents a single image entry in the book's images array.
type BookImage struct {
	IsPrimary bool   `bson:"isPrimary" json:"is_primary"`
	Alt       string `bson:"alt"       json:"alt"`
	URL       string `bson:"url"       json:"url"`
}

// BookSeries stores series metadata embedded in the book document.
type BookSeries struct {
	SeriesID   string `bson:"seriesId"    json:"series_id"`
	SeriesName string `bson:"seriesName"  json:"series_name"`
	SequenceNo int    `bson:"sequenceNo"  json:"sequence_no"`
}

// BookAuthor stores author data embedded in the book document.
type BookAuthor struct {
	AuthorID   string `bson:"authorId"    json:"author_id"`
	Slug       string `bson:"slug"        json:"slug"`
	AuthorName string `bson:"authorName"  json:"author_name"`
}

// BookTag represents a tag entry embedded in the book document.
type BookTag struct {
	TagID   string `bson:"tagId"   json:"tag_id"`
	TagName string `bson:"tagName" json:"tag_name"`
}

// BookPricing holds the current price of the book.
type BookPricing struct {
	Price float64 `bson:"price" json:"price"`
}

// BookCategory is the category reference embedded in the book document.
type BookCategory struct {
	CategoryID string `bson:"categoryId" json:"category_id"`
}

// Book represents a book document stored in MongoDB.
type Book struct {
	ID                string       `bson:"_id,omitempty"        json:"id"`
	Name              string       `bson:"name"                 json:"name"`
	ShortDescription  string       `bson:"shortDescription"     json:"short_description"`
	DetailDescription string       `bson:"detailDescription"    json:"detail_description"`
	ProductStatus     string       `bson:"productStatus"        json:"product_status"`
	Pricing           BookPricing  `bson:"pricing"              json:"pricing"`
	Category          BookCategory `bson:"category"             json:"category"`
	Images            []BookImage  `bson:"images"               json:"images"`
	Series            BookSeries   `bson:"series"               json:"series,omitempty"`
	Authors           []BookAuthor `bson:"authors"              json:"authors"`
	Tags              []BookTag    `bson:"tags"                 json:"tags"`
	ImportedAt        time.Time    `bson:"importedAt"           json:"imported_at"`
	CreatedAt         time.Time    `bson:"createdAt"            json:"created_at"`
}

// BookRef is the PostgreSQL row that bridges MongoDB documents to stock data.
type BookRef struct {
	ID       int64  `gorm:"primaryKey;autoIncrement" json:"-"`
	MongoID  string `gorm:"primaryKey;column:mongo_id"`
	IsActive bool   `gorm:"not null;default:true"`
}

// Inventory holds the stock level for a book, stored in PostgreSQL.
type Inventory struct {
	BookID        string    `gorm:"primaryKey;column:book_id"`
	StockQuantity int       `gorm:"not null;default:0"`
	UpdatedAt     time.Time `gorm:"not null;default:now()"`
}

// BookDetail combines a MongoDB Book document with live stock data from PostgreSQL.
type BookDetail struct {
	Book
	StockQuantity int     `json:"stock_quantity"`
	Price         float64 `json:"price"`
}

// ─── Category (MongoDB) ───────────────────────────────────────────────────────

// Category is a document stored in the MongoDB "categories" collection.
type Category struct {
	ID             string    `bson:"_id,omitempty" json:"id"`
	CategoryName   string    `bson:"category_name" json:"category_name"`
	Slug           string    `bson:"slug"          json:"slug"`
	ParentCategory string    `bson:"parent_category,omitempty" json:"parent_category,omitempty"`
	CreatedAt      time.Time `bson:"created_at"    json:"created_at"`
	UpdatedAt      time.Time `bson:"updated_at"    json:"updated_at"`
}

// ─── Cart (PostgreSQL) ────────────────────────────────────────────────────────

// Cart is the PostgreSQL header record for a user's shopping cart.
// Each user has at most one active cart (user_id is unique).
// UserID is the internal int64 FK pointing to users.id; it is never exposed in responses.
type Cart struct {
	ID        int64     `gorm:"primaryKey;autoIncrement" json:"-"`
	UserID    int64     `gorm:"not null;uniqueIndex"     json:"-"`
	CreatedAt time.Time `                                json:"-"`
	UpdatedAt time.Time `                                json:"-"`
}

// CartItemRecord is the PostgreSQL line-item record stored in the cart_items table.
// Each row links a cart to a book and records the desired quantity.
type CartItemRecord struct {
	CartID    int64     `gorm:"primaryKey"      json:"-"`
	BookID    string    `gorm:"primaryKey"      json:"-"`
	Quantity  int       `gorm:"not null;default:1"`
	UpdatedAt time.Time `                       json:"-"`
}

// TableName overrides the default GORM table name.
func (CartItemRecord) TableName() string { return "cart_items" }

// CartItem represents a single enriched line in a user's shopping cart
// (used for Redis cache and API responses, not persisted directly).
type CartItem struct {
	BookID   string  `json:"book_id"`
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity"`
}

// ─── Order (PostgreSQL) ───────────────────────────────────────────────────────

type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"
	OrderStatusConfirmed OrderStatus = "confirmed"
	OrderStatusPacking   OrderStatus = "packing"
	OrderStatusShipping  OrderStatus = "shipping"
	OrderStatusCompleted OrderStatus = "completed"
	OrderStatusCancelled OrderStatus = "cancelled"
)

// Order is the header record of a placed order.
//
// Dual-identifier pattern: ID (BIGSERIAL) is the internal FK used by order_items,
// order_status_histories, payments, and shipments tables; AliasID (UUID) is the
// external identifier exposed in all API responses and accepted in URL parameters.
type Order struct {
	ID          int64       `gorm:"primaryKey;autoIncrement"                                        json:"-"`
	AliasID     uuid.UUID   `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid();column:alias_id" json:"alias_id"`
	UserID      int64       `gorm:"not null;index"                                                  json:"-"`
	Status      OrderStatus `gorm:"type:varchar(20);not null;default:'pending'"                     json:"status"`
	TotalAmount float64     `gorm:"not null"                                                        json:"total_amount"`
	AddressID   *int64      `                                                                       json:"-"`
	Note        string      `                                                                       json:"note,omitempty"`
	CreatedAt   time.Time   `                                                                       json:"created_at"`
	UpdatedAt   time.Time   `                                                                       json:"-"`
	Items       []OrderItem `gorm:"foreignKey:OrderID"                                              json:"items,omitempty"`
}

// OrderItem stores the price snapshot at the time of purchase.
// It is embedded in Order responses; the internal int64 IDs are hidden from JSON.
type OrderItem struct {
	ID          int64   `gorm:"primaryKey;autoIncrement"      json:"-"`
	OrderID     int64   `gorm:"not null;index"                json:"-"`
	MongoBookID string  `gorm:"column:mongo_book_id;not null" json:"book_id"`
	Name        string  `gorm:"not null"                      json:"name"`
	Quantity    int     `gorm:"not null"                      json:"quantity"`
	UnitPrice   float64 `gorm:"not null"                      json:"unit_price"`
}

// OrderStatusHistory is the audit trail for every order status change.
//
// OrderID is the internal FK (hidden from JSON). ChangedByAdminAliasID stores the
// admin's alias_id UUID directly (denormalised) so the history record can be
// serialised without a join back to the users table.
type OrderStatusHistory struct {
	ID                    int64      `gorm:"primaryKey;autoIncrement"                                        json:"-"`
	AliasID               uuid.UUID  `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid();column:alias_id" json:"alias_id"`
	OrderID               int64      `gorm:"not null;index"                                                  json:"-"`
	OldStatus             *string    `gorm:"type:varchar(20)"                                                json:"old_status"`
	NewStatus             string     `gorm:"type:varchar(20);not null"                                       json:"new_status"`
	ChangedByAdminAliasID *uuid.UUID `gorm:"type:uuid;column:changed_by_admin_alias_id"                      json:"changed_by_admin_alias_id,omitempty"`
	Note                  string     `                                                                       json:"note,omitempty"`
	ChangedAt             time.Time  `gorm:"not null;default:now()"                                          json:"changed_at"`
}

// TableName overrides the default GORM table name.
func (OrderStatusHistory) TableName() string { return "order_status_histories" }

// Payment stores payment details for an order.
//
// Dual-identifier pattern: ID (BIGSERIAL) internal; AliasID (UUID) external.
type Payment struct {
	ID          int64      `gorm:"primaryKey;autoIncrement"                                        json:"-"`
	AliasID     uuid.UUID  `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid();column:alias_id" json:"alias_id"`
	OrderID     int64      `gorm:"not null;index"                                                  json:"-"`
	Method      string     `gorm:"not null"                                                        json:"method"`
	Status      string     `gorm:"not null;default:'pending'"                                      json:"status"`
	Amount      float64    `gorm:"not null"                                                        json:"amount"`
	ProviderRef string     `                                                                       json:"provider_ref,omitempty"`
	PaidAt      *time.Time `                                                                       json:"paid_at,omitempty"`
	CreatedAt   time.Time  `                                                                       json:"created_at"`
}

// ShipmentStatus represents the current state of a delivery.
type ShipmentStatus string

const (
	ShipmentStatusPending   ShipmentStatus = "pending"
	ShipmentStatusShipped   ShipmentStatus = "shipped"
	ShipmentStatusDelivered ShipmentStatus = "delivered"
	ShipmentStatusFailed    ShipmentStatus = "failed"
	ShipmentStatusReturned  ShipmentStatus = "returned"
)

// Shipment stores shipment details for an order.
//
// Dual-identifier pattern: ID (BIGSERIAL) internal; AliasID (UUID) external.
type Shipment struct {
	ID             int64          `gorm:"primaryKey;autoIncrement"                                        json:"-"`
	AliasID        uuid.UUID      `gorm:"type:uuid;uniqueIndex;default:gen_random_uuid();column:alias_id" json:"alias_id"`
	OrderID        int64          `gorm:"not null;index"                                                  json:"-"`
	Status         ShipmentStatus `gorm:"type:varchar(30);not null;default:'pending'"                     json:"status"`
	Carrier        string         `                                                                       json:"carrier,omitempty"`
	TrackingNumber string         `gorm:"column:tracking_no"                                              json:"tracking_number,omitempty"`
	ShippedAt      *time.Time     `                                                                       json:"shipped_at,omitempty"`
	DeliveredAt    *time.Time     `                                                                       json:"delivered_at,omitempty"`
	CreatedAt      time.Time      `                                                                       json:"created_at"`
}

// ─── Buy-Now checkout session (Redis) ────────────────────────────────────────

// BuyNowSession is stored temporarily in Redis during the buy-now checkout flow.
type BuyNowSession struct {
	UserID   string  `json:"user_id"`
	BookID   string  `json:"book_id"`
	Quantity int     `json:"quantity"`
	Price    float64 `json:"price"`
	BookName string  `json:"book_name"`
}

// ─── Neo4j Graph Nodes ────────────────────────────────────────────────────────

// BookNode is the graph representation of a book used by the recommendation engine.
type BookNode struct {
	MongoID    string   `json:"mongo_id"`
	Title      string   `json:"title"`
	Authors    []string `json:"authors"`
	Categories []string `json:"categories"`
	Publisher  string   `json:"publisher"`
	Tags       []string `json:"tags"`
	SeriesName string   `json:"series_name,omitempty"`
	SequenceNo int      `json:"sequence_no,omitempty"`
	IsActive   bool     `json:"is_active"`
}

// SimilarBook is a recommendation result with a computed similarity score.
type SimilarBook struct {
	BookID   string  `json:"book_id"`
	Title    string  `json:"title"`
	Score    float64 `json:"score"`
	CoverURL string  `json:"cover_url,omitempty"`
}

// SeriesBook is a recommendation result for series/volume suggestions.
type SeriesBook struct {
	BookID        string `json:"book_id"`
	Title         string `json:"title"`
	VolumeOrder   int    `json:"volume_order"`
	AlreadyBought bool   `json:"already_bought"`
}

// ─── BestSeller (Redis) ───────────────────────────────────────────────────────

// BestSellerBook is an entry in the Redis bestseller cache (NV-E2).
// TotalSold reflects units sold in the past 30 days, as aggregated daily by BestSellerWorker.
type BestSellerBook struct {
	BookID    string  `json:"book_id"`
	Title     string  `json:"title"`
	TotalSold float64 `json:"total_sold"`
}

// ─── Most Viewed (Redis + MongoDB) ───────────────────────────────────────────

const (
	MostViewedWindowDays = 30
	MostViewedTopN       = 10
)

// MostViewedBook is an entry in the most-viewed rankings (NV-E3).
type MostViewedBook struct {
	BookID    string  `json:"book_id"`
	Title     string  `json:"title"`
	ViewCount float64 `json:"view_count"`
}

// ─── Event Log (MongoDB) ─────────────────────────────────────────────────────

const (
	EventTypeViewed    = "viewed"
)

// EventLog records a user behaviour event (view, purchase) stored in MongoDB
// under the "view_event_logs" collection. Used as the source of truth for
// 30-day most-viewed aggregation.
type EventLog struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id,omitempty"`
	BookID    string    `json:"book_id"`
	EventType string    `json:"event_type"`
	CreatedAt time.Time `json:"created_at"`
}
