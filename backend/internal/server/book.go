package server

import (
	"bookstore/backend/internal/domain"
	"context"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// SearchBooks handles GET /api/v1/books (NV-B1).
// Supports query params: search, author, publisher, year, min_price, max_price, page, page_size.
//
// @Summary      Search books
// @Description  Full-text and filter-based search across the book catalog
// @Tags         books
// @Produce      json
// @Param        search     query     string   false  "Full-text search term"
// @Param        author     query     string   false  "Filter by author name"
// @Param        publisher  query     string   false  "Filter by publisher"
// @Param        year       query     int      false  "Filter by publish year"
// @Param        min_price  query     number   false  "Minimum price"
// @Param        max_price  query     number   false  "Maximum price"
// @Param        page       query     int      false  "Page number"       default(1)
// @Param        page_size  query     int      false  "Results per page"  default(20)
// @Success      200        {object}  paginatedResponse
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
//
// @Summary      Get book detail
// @Description  Fetch full catalog detail and live stock for a book
// @Tags         books
// @Produce      json
// @Param        id   path      string  true  "MongoDB book ID"
// @Success      200  {object}  successResponse
// @Failure      404  {object}  errorResponse
// @Router       /books/{id} [get]
func (s *Service) GetBookDetail(c *gin.Context) {
	bookID := c.Param("id")
	ctx := c.Request.Context()

	if cached, hit, _ := s.bookCache.GetDetail(ctx, bookID); hit {
		respondOK(c, cached)
		return
	}

	book, err := s.bookRepo.GetBookByID(ctx, bookID)
	if err != nil || book == nil {
		respondNotFound(c, "book not found")
		return
	}

	inv, _ := s.pg.GetInventory(ctx, bookID)
	detail := domain.BookDetail{Book: *book}
	if inv != nil {
		detail.StockQuantity = inv.StockQuantity
	}
	if book.Pricing.Price > 0 {
		detail.Price = book.Pricing.Price
	}

	_ = s.bookCache.SetDetail(ctx, bookID, &detail)

	respondOK(c, detail)
}

// GetNewBooks handles GET /api/v1/books/new (NV-B3).
//
// @Summary      New arrivals
// @Description  Return the most recently imported books
// @Tags         books
// @Produce      json
// @Param        limit  query     int  false  "Max books to return"  default(20)
// @Success      200    {object}  successResponse
// @Router       /books/new [get]
func (s *Service) GetNewBooks(c *gin.Context) {
	limit := queryInt(c, "limit", 20)
	ctx := c.Request.Context()

	if cached, hit, _ := s.bookCache.GetNewest(ctx); hit {
		respondOK(c, s.enrichBooks(ctx, cached))
		return
	}

	books, err := s.bookRepo.GetNewestBooks(ctx, limit)
	if err != nil {
		s.logger.Error("get newest books", zap.Error(err))
		respondInternalError(c, "could not fetch new books")
		return
	}

	_ = s.bookCache.SetNewest(ctx, books)
	respondOK(c, s.enrichBooks(ctx, books))
}

// ViewBook handles POST /api/v1/books/:id/view (RequireUser).
// Records a VIEWED relationship in Neo4j.
//
// @Summary      Record book view
// @Description  Record that the authenticated user viewed a book (used by recommendation engine)
// @Tags         books
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "MongoDB book ID"
// @Success      200  {object}  successResponse
// @Router       /books/{id}/view [post]
func (s *Service) ViewBook(c *gin.Context) {
	bookID := c.Param("id")
	userID := mustUserID(c).String()
	ctx := c.Request.Context()

	if err := s.recRepo.RecordViewed(ctx, userID, bookID); err != nil {
		s.logger.Warn("record viewed", zap.Error(err))
	}

	respondOK(c, gin.H{"message": "view recorded"})
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// enrichBooks fetches inventory data from PostgreSQL and merges it with book data.
func (s *Service) enrichBooks(ctx context.Context, books []*domain.Book) []domain.BookDetail {
	details := make([]domain.BookDetail, 0, len(books))
	for _, b := range books {
		detail := domain.BookDetail{Book: *b, Price: b.Pricing.Price}
		if inv, err := s.pg.GetInventory(ctx, b.ID); err == nil && inv != nil {
			detail.StockQuantity = inv.StockQuantity
		}
		details = append(details, detail)
	}
	return details
}

// queryInt reads a query parameter as int, falling back to the provided default.
func queryInt(c *gin.Context, key string, fallback int) int {
	v, err := strconv.Atoi(c.Query(key))
	if err != nil || v < 1 {
		return fallback
	}
	return v
}
