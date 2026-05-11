package domain

import "github.com/google/uuid"

// ─── Auth DTOs ────────────────────────────────────────────────────────────────

type RegisterRequest struct {
	FullName string `json:"full_name" binding:"required,min=2,max=100"`
	Email    string `json:"email"     binding:"required,email"`
	Phone    string `json:"phone"     binding:"required"`
	Password string `json:"password"  binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	AccessToken string   `json:"access_token"`
	User        UserInfo `json:"user"`
}

type UserInfo struct {
	AliasID  uuid.UUID `json:"alias_id"`
	FullName string    `json:"full_name"`
	Email    string    `json:"email"`
	Phone    string    `json:"phone,omitempty"`
	Role     UserRole  `json:"role"`
}

// ─── Profile DTOs ─────────────────────────────────────────────────────────────

type UpdateProfileRequest struct {
	FullName    string `json:"full_name"    binding:"omitempty,min=2,max=100"`
	Phone       string `json:"phone"        binding:"omitempty"`
}

// ─── Address DTOs ─────────────────────────────────────────────────────────────

type CreateAddressRequest struct {
	ReceiverName string `json:"receiver_name" binding:"required"`
	Phone        string `json:"phone"         binding:"required"`
	AddressLine  string `json:"address_line"  binding:"required"`
	Ward         string `json:"ward"`
	District     string `json:"district"`
	City         string `json:"city"          binding:"required"`
	IsDefault    bool   `json:"is_default"`
}

type UpdateAddressRequest struct {
	ReceiverName string `json:"receiver_name"`
	Phone        string `json:"phone"         binding:"omitempty"`
	AddressLine  string `json:"address_line"`
	Ward         string `json:"ward"`
	District     string `json:"district"`
	City         string `json:"city"`
	IsDefault    *bool  `json:"is_default"`
}

// ─── Book DTOs ────────────────────────────────────────────────────────────────

type BookListResponse struct {
	Books    []BookDetail `json:"books"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}

type CreateBookRequest struct {
	Name              string       `json:"name"               binding:"required"`
	ShortDescription  string       `json:"short_description"`
	DetailDescription string       `json:"detail_description"`
	ProductStatus     string       `json:"product_status"`
	Pricing           BookPricing  `json:"pricing"            binding:"required"`
	Category          BookCategory `json:"category"`
	Images            []BookImage  `json:"images"`
	Series            BookSeries   `json:"series"`
	Authors           []BookAuthor `json:"authors"            binding:"required,min=1"`
	Tags              []BookTag    `json:"tags"`
	StockQuantity     int          `json:"stock_quantity"     binding:"required,min=0"`
}

type UpdateBookRequest struct {
	Name              string        `json:"name"`
	ShortDescription  string        `json:"short_description"`
	DetailDescription string        `json:"detail_description"`
	ProductStatus     string        `json:"product_status"`
	Pricing           *BookPricing  `json:"pricing"`
	Category          *BookCategory `json:"category"`
	Images            []BookImage   `json:"images"`
	Series            *BookSeries   `json:"series"`
	Authors           []BookAuthor  `json:"authors"`
	Tags              []BookTag     `json:"tags"`
}

type UpdateStockRequest struct {
	StockQuantity int `json:"stock_quantity" binding:"required,min=0"`
}

// ─── Category DTOs ────────────────────────────────────────────────────────────

type CreateCategoryRequest struct {
	CategoryName   string `json:"category_name"   binding:"required"`
	Slug           string `json:"slug"            binding:"required"`
	ParentCategory string `json:"parent_category"`
}

type UpdateCategoryRequest struct {
	CategoryName   string `json:"category_name"`
	Slug           string `json:"slug"`
	ParentCategory string `json:"parent_category"`
}

type CategoryListResponse struct {
	Categories []*Category `json:"categories"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
}

// ─── Cart DTOs ────────────────────────────────────────────────────────────────

type AddToCartRequest struct {
	BookID   string `json:"book_id"  binding:"required"`
	Quantity int    `json:"quantity" binding:"required,min=1"`
}

type UpdateCartItemRequest struct {
	Quantity int `json:"quantity" binding:"required,min=1"`
}

type CartResponse struct {
	Items      []CartItem `json:"items"`
	TotalPrice float64    `json:"total_price"`
}

// ─── Order DTOs ───────────────────────────────────────────────────────────────

type CheckoutRequest struct {
	// AddressID is the alias_id UUID of the delivery address; resolved to the internal
	// int64 FK before the PostgreSQL transaction.
	AddressID *uuid.UUID `json:"address_id"`
	Note      string     `json:"note"`
	SessionID string     `json:"session_id"` // for Buy-Now flow
}

type BuyNowRequest struct {
	BookID   string `json:"book_id"  binding:"required"`
	Quantity int    `json:"quantity" binding:"required,min=1"`
}

type BuyNowResponse struct {
	SessionID string `json:"session_id"`
}

// OrderListResponse is the paginated response for order lists.
type OrderListResponse struct {
	Orders   []*Order `json:"orders"`
	Total    int64    `json:"total"`
	Page     int      `json:"page"`
	PageSize int      `json:"page_size"`
}

type UpdateOrderStatusRequest struct {
	Status OrderStatus `json:"status" binding:"required,oneof=pending confirmed packing shipping completed cancelled"`
	Note   string      `json:"note"`
}

// ─── Admin User DTOs ──────────────────────────────────────────────────────────

type UserListResponse struct {
	Users    []*UserInfo `json:"users"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
}

type DeactivateUserRequest struct {
	IsActive bool `json:"is_active"`
}

// ─── Recommendation DTOs ──────────────────────────────────────────────────────

type RecommendationResponse struct {
	SimilarBooks []SimilarBook `json:"similar_books"`
	SeriesBooks  []SeriesBook  `json:"series_books,omitempty"`
}

// ─── Analytics DTOs ───────────────────────────────────────────────────────────

type SalesSummary struct {
	TotalOrders  int64   `json:"total_orders"`
	TotalRevenue float64 `json:"total_revenue"`
	DateFrom     string  `json:"date_from"`
	DateTo       string  `json:"date_to"`
}

// ─── Shipment DTOs ────────────────────────────────────────────────────────────

type UpdateShipmentStatusRequest struct {
	Status ShipmentStatus `json:"status" binding:"required,oneof=pending shipped delivered"`
}

type UpdateShipmentDetailsRequest struct {
	Carrier    string `json:"carrier"     binding:"required"`
	TrackingNo string `json:"tracking_no"  binding:"required"`
}
