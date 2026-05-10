package server

import (
	"bookstore/backend/internal/domain"
	"context"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SearchBooks handles GET /api/v1/books (NV-B1).
// Supports query params: search, author, publisher, year, min_price, max_price, page, page_size.
//
// @Summary      Search books
// @Description  Search and filter books from MongoDB catalog with live stock from PostgreSQL
// @Tags         books
// @Accept       json
// @Produce      json
// @Param        search     query     string  false  "Full-text search query"
// @Param        author     query     string  false  "Filter by author name"
// @Param        publisher  query     string  false  "Filter by publisher"
// @Param        year       query     int     false  "Filter by publish year"
// @Param        min_price  query     number  false  "Minimum price"
// @Param        max_price  query     number  false  "Maximum price"
// @Param        page       query     int     false  "Page number (default 1)"
// @Param        page_size  query     int     false  "Items per page (default 20)"
// @Success      200        {object}  domain.BookListResponse
// @Failure      500        {object}  errorResponse
// @Router       /books [get]
func (s *Service) SearchBooks(c *gin.Context) {
	minPrice, _ := strconv.ParseFloat(c.Query("min_price"), 64)
	maxPrice, _ := strconv.ParseFloat(c.Query("max_price"), 64)
	year, _ := strconv.Atoi(c.Query("year"))

	filter := domain.BookFilter{
		Search:    c.Query("search"),
		Author:    c.Query("author"),
		Publisher: c.Query("publisher"),
		Year:      year,
		MinPrice:  minPrice,
		MaxPrice:  maxPrice,
		Page:      queryInt(c, "page", 1),
		PageSize:  queryInt(c, "page_size", 20),
	}

	ctx := c.Request.Context()
	books, total, err := s.bookRepo.SearchBooks(ctx, filter)
	if err != nil {
		s.logger.Error("search books", zap.Error(err))
		respondInternalError(c, "could not search books")
		return
	}

	details := s.enrichBooks(ctx, books)
	respondPaginated(c, details, total, filter.Page, filter.PageSize)
}

// GetBookDetail handles GET /api/v1/books/:id (NV-B2).
// Uses Redis book-detail cache when features.RedisBookCache is enabled.
//
// @Summary      Get book detail
// @Description  Return full book metadata from MongoDB and stock from PostgreSQL
// @Tags         books
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "Book MongoDB ID"
// @Success      200  {object}  domain.BookDetail
// @Failure      404  {object}  errorResponse
// @Router       /books/{id} [get]
func (s *Service) GetBookDetail(c *gin.Context) {
	bookID := c.Param("id")
	ctx := c.Request.Context()

	if s.features.RedisBookCache {
		if cached, hit, _ := s.bookCache.GetDetail(ctx, bookID); hit {
			respondOK(c, cached)
			return
		}
	}

	book, err := s.bookRepo.GetBookByID(ctx, bookID)
	if err != nil || book == nil {
		respondNotFound(c, "book not found")
		return
	}

	inventory, _ := s.pg.GetInventory(ctx, bookID)
	detail := domain.BookDetail{Book: *book}
	if inventory != nil {
		detail.StockQuantity = inventory.StockQuantity
	}
	if book.Pricing.Price > 0 {
		detail.Price = book.Pricing.Price
	}

	if s.features.RedisBookCache {
		_ = s.bookCache.SetDetail(ctx, bookID, &detail)
	}

	respondOK(c, detail)
}

// GetNewBooks handles GET /api/v1/books/new (NV-B3).
// Uses Redis newest-books cache when features.RedisBookCache is enabled.
//
// @Summary      Get newest books
// @Description  Return the most recently imported books
// @Tags         books
// @Accept       json
// @Produce      json
// @Param        limit  query     int  false  "Number of books to return (default 20)"
// @Success      200    {array}   domain.BookDetail
// @Failure      500    {object}  errorResponse
// @Router       /books/new [get]
func (s *Service) GetNewBooks(c *gin.Context) {
	limit := queryInt(c, "limit", 20)
	ctx := c.Request.Context()

	if s.features.RedisNewestBooksCache {
		if cached, hit, _ := s.bookCache.GetNewest(ctx); hit {
			respondOK(c, s.enrichBooks(ctx, cached))
			return
		}
	}

	books, err := s.bookRepo.GetNewestBooks(ctx, limit)
	if err != nil {
		s.logger.Error("get newest books", zap.Error(err))
		respondInternalError(c, "could not fetch new books")
		return
	}

	if s.features.RedisNewestBooksCache {
		_ = s.bookCache.SetNewest(ctx, books)
	}
	respondOK(c, s.enrichBooks(ctx, books))
}

// ViewBook handles POST /api/v1/books/:id/view (RequireUser, NV-E3).
//
// Records the view event in MongoDB view_event_logs (source of truth for 30-day aggregate)
// and increments the live daily Redis count sorted set (feature-flag guarded).
//
// Neo4j is NOT used for view recording; user behaviour is stored in MongoDB only.
//
// @Summary      Record book view
// @Description  Increment daily view counter in Redis and log event in MongoDB
// @Tags         books
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "Book MongoDB ID"
// @Success      200  {object}  successResponse
// @Router       /books/{id}/view [post]
func (s *Service) ViewBook(c *gin.Context) {
	bookID := c.Param("id")
	userID := mustUserAliasID(c).String()
	ctx := c.Request.Context()

	// Persist view event to MongoDB view_event_logs (source of truth for 30-day aggregate).
	_ = s.eventLogRepo.InsertEventLog(ctx, &domain.EventLog{
		UserID:    userID,
		BookID:    bookID,
		EventType: domain.EventTypeViewed,
		CreatedAt: time.Now().UTC(),
	})

	// Increment the live daily count sorted set (feature-flag guarded).
	if s.features.RedisMostViewedDaily {
		if err := s.mostViewedRepo.IncrementDailyViewCount(ctx, bookID); err != nil {
			s.logger.Warn("increment most viewed daily count", zap.String("bookID", bookID), zap.Error(err))
		}
	}

	respondOK(c, gin.H{"message": "view recorded"})
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// enrichBooks fetches inventory data from PostgreSQL and merges it with book data.
// Stock is read from Redis cache first when features.RedisBookCache is enabled.
func (s *Service) enrichBooks(ctx context.Context, books []*domain.Book) []domain.BookDetail {
	details := make([]domain.BookDetail, 0, len(books))
	for _, book := range books {
		detail := domain.BookDetail{Book: *book, Price: book.Pricing.Price}

		if s.features.RedisStockCache {
			if quantity, hit, _ := s.bookCache.GetStock(ctx, book.ID); hit {
				detail.StockQuantity = quantity
				details = append(details, detail)
				continue
			}
		}

		if inventory, err := s.pg.GetInventory(ctx, book.ID); err == nil && inventory != nil {
			detail.StockQuantity = inventory.StockQuantity
			if s.features.RedisStockCache {
				_ = s.bookCache.SetStock(ctx, book.ID, inventory.StockQuantity)
			}
		}
		details = append(details, detail)
	}
	return details
}

// queryInt reads a query parameter as int, falling back to the provided default.
func queryInt(c *gin.Context, key string, fallback int) int {
	value, err := strconv.Atoi(c.Query(key))
	if err != nil || value < 1 {
		return fallback
	}
	return value
}
