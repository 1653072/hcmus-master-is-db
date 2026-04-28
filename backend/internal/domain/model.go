package domain

import (
	"time"

	"github.com/google/uuid"
)

// ─── Similarity / Trending constants ──────────────────────────────────────────

const (
	WeightCategory  = 0.50
	WeightAuthor    = 0.33
	WeightPublisher = 0.17

	TrendingWindowDays = 30
	TrendingTopN       = 10
)

// ─── User ────────────────────────────────────────────────────────────────────

type UserRole string

const (
	RoleUser  UserRole = "user"
	RoleAdmin UserRole = "admin"
)

// User is the PostgreSQL-backed entity for authentication and profile data.
type User struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	FullName     string    `gorm:"not null"`
	Email        string    `gorm:"uniqueIndex;not null"`
	Phone        string
	PasswordHash string   `gorm:"not null"`
	Role         UserRole `gorm:"type:varchar(10);not null;default:'user'"`
	IsActive     bool     `gorm:"not null;default:true"`
	DefaultAddr  string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// ─── Address (PostgreSQL) ─────────────────────────────────────────────────────

type Address struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       uuid.UUID `gorm:"type:uuid;not null;index"`
	ReceiverName string    `gorm:"not null"`
	Phone        string    `gorm:"not null"`
	AddressLine  string    `gorm:"not null"`
	Ward         string
	District     string
	City         string `gorm:"not null"`
	IsDefault    bool   `gorm:"not null;default:false"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
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
	MongoID  string `gorm:"primaryKey;column:mongo_id"`
	IsActive bool   `gorm:"not null;default:true"`
}

// Inventory holds the stock level for a book, stored in PostgreSQL.
type Inventory struct {
	BookID        string `gorm:"primaryKey;column:book_id"`
	StockQuantity int    `gorm:"not null;default:0"`
	UpdatedAt     time.Time
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
	CategoryName   string    `bson:"categoryName"  json:"category_name"`
	Slug           string    `bson:"slug"          json:"slug"`
	ParentCategory string    `bson:"parentCategory,omitempty" json:"parent_category,omitempty"`
	CreatedAt      time.Time `bson:"createdAt"     json:"created_at"`
	UpdatedAt      time.Time `bson:"updatedAt"     json:"updated_at"`
}

// ─── Persistent Cart (PostgreSQL) ────────────────────────────────────────────

// PersistentCartItem is the PSQL source-of-truth for a user's cart.
type PersistentCartItem struct {
	UserID    uuid.UUID `gorm:"type:uuid;primaryKey"`
	BookID    string    `gorm:"primaryKey"`
	Quantity  int       `gorm:"not null;default:1"`
	UpdatedAt time.Time
}

// CartItem represents a single line in a user's shopping cart (Redis cache / response).
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
	OrderStatusPacking   OrderStatus = "packing"
	OrderStatusShipping  OrderStatus = "shipping"
	OrderStatusCompleted OrderStatus = "completed"
	OrderStatusCancelled OrderStatus = "cancelled"
)

// Order is the header record of a placed order.
type Order struct {
	ID          uuid.UUID   `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID      uuid.UUID   `gorm:"type:uuid;not null;index"`
	Status      OrderStatus `gorm:"type:varchar(20);not null;default:'pending'"`
	TotalAmount float64     `gorm:"not null"`
	AddressID   *uuid.UUID  `gorm:"type:uuid"`
	Note        string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Items       []OrderItem `gorm:"foreignKey:OrderID"`
}

// OrderItem stores the price snapshot at the time of purchase.
type OrderItem struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	OrderID     uuid.UUID `gorm:"type:uuid;not null;index"`
	MongoBookID string    `gorm:"not null"`
	Name        string    `gorm:"not null"`
	Quantity    int       `gorm:"not null"`
	UnitPrice   float64   `gorm:"not null"`
}

// OrderStatusHistory is the audit trail for every order status change.
type OrderStatusHistory struct {
	ID               uuid.UUID  `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	OrderID          uuid.UUID  `gorm:"type:uuid;not null;index"`
	OldStatus        *string    `gorm:"type:varchar(20)"` // nullable for initial creation
	NewStatus        string     `gorm:"type:varchar(20);not null"`
	ChangedByAdminID *uuid.UUID `gorm:"type:uuid"`
	Note             string
	ChangedAt        time.Time `gorm:"not null;default:now()"`
}

// Payment stores payment details for an order.
type Payment struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	OrderID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Method      string    `gorm:"not null"`
	Status      string    `gorm:"not null;default:'pending'"`
	Amount      float64   `gorm:"not null"`
	ProviderRef string
	PaidAt      *time.Time
	CreatedAt   time.Time
}

// Shipment stores shipment details for an order.
type Shipment struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	OrderID     uuid.UUID `gorm:"type:uuid;not null;index"`
	Status      string    `gorm:"not null;default:'pending'"`
	Carrier     string
	TrackingNo  string
	ShippedAt   *time.Time
	DeliveredAt *time.Time
	CreatedAt   time.Time
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

// ─── Trending (Redis) ─────────────────────────────────────────────────────────

// TrendingBook is an entry from the Redis sorted set of bestsellers.
type TrendingBook struct {
	BookID string  `json:"book_id"`
	Title  string  `json:"title"`
	Score  float64 `json:"score"`
}
