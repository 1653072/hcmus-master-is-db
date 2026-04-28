package server

import (
	"bookstore/backend/internal/domain"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminListBooks handles GET /api/v1/admin/books.
func (s *Service) AdminListBooks(c *gin.Context) {
	filter := domain.BookFilter{
		Search:    c.Query("search"),
		Author:    c.Query("author"),
		Publisher: c.Query("publisher"),
		Page:      queryInt(c, "page", 1),
		PageSize:  queryInt(c, "page_size", 20),
	}

	ctx := c.Request.Context()
	books, total, err := s.bookRepo.SearchBooks(ctx, filter)
	if err != nil {
		s.logger.Error("admin list books", zap.Error(err))
		respondInternalError(c, "could not list books")
		return
	}

	details := s.enrichBooks(ctx, books)
	respondPaginated(c, details, total, filter.Page, filter.PageSize)
}

// AdminCreateBook handles POST /api/v1/admin/books.
// Writes to MongoDB (catalog), PostgreSQL (books_ref + inventory), and Neo4j.
func (s *Service) AdminCreateBook(c *gin.Context) {
	var req domain.CreateBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()

	// 1. Insert catalog document into MongoDB
	book := &domain.Book{
		Name:              req.Name,
		ShortDescription:  req.ShortDescription,
		DetailDescription: req.DetailDescription,
		ProductStatus:     req.ProductStatus,
		Pricing:           req.Pricing,
		Category:          req.Category,
		Images:            req.Images,
		Series:            req.Series,
		Authors:           req.Authors,
		Tags:              req.Tags,
	}

	mongoID, err := s.bookRepo.CreateBook(ctx, book)
	if err != nil {
		s.logger.Error("create book in mongo", zap.Error(err))
		respondInternalError(c, "could not create book")
		return
	}

	// 2. Insert bridge row into PostgreSQL
	ref := &domain.BookRef{MongoID: mongoID, IsActive: true}
	if err := s.pg.CreateBookRef(ctx, ref); err != nil {
		s.logger.Error("create book ref in postgres", zap.Error(err))
		_ = s.bookRepo.DeleteBook(ctx, mongoID)
		respondInternalError(c, "could not create book reference")
		return
	}

	// 3. Insert inventory row
	inv := &domain.Inventory{BookID: mongoID, StockQuantity: req.StockQuantity}
	if err := s.pg.CreateInventory(ctx, inv); err != nil {
		s.logger.Error("create inventory", zap.Error(err))
	}

	// 4. Upsert Book node in Neo4j
	authorNames := make([]string, 0, len(req.Authors))
	for _, a := range req.Authors {
		authorNames = append(authorNames, a.AuthorName)
	}
	tagNames := make([]string, 0, len(req.Tags))
	for _, t := range req.Tags {
		tagNames = append(tagNames, t.TagName)
	}
	node := domain.BookNode{
		MongoID:    mongoID,
		Title:      req.Name,
		Authors:    authorNames,
		Categories: []string{req.Category.CategoryID},
		Publisher:  "",
		Tags:       tagNames,
		SeriesName: req.Series.SeriesName,
		SequenceNo: req.Series.SequenceNo,
		IsActive:   true,
	}
	if err := s.recRepo.UpsertBookNode(ctx, node); err != nil {
		s.logger.Warn("upsert neo4j node (non-fatal)", zap.Error(err))
	}

	book.ID = mongoID
	respondCreated(c, domain.BookDetail{
		Book:          *book,
		StockQuantity: req.StockQuantity,
		Price:         req.Pricing.Price,
	})
}

// AdminUpdateBook handles PUT /api/v1/admin/books/:id.
func (s *Service) AdminUpdateBook(c *gin.Context) {
	bookID := c.Param("id")
	var req domain.UpdateBookRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()

	existing, err := s.bookRepo.GetBookByID(ctx, bookID)
	if err != nil || existing == nil {
		respondNotFound(c, "book not found")
		return
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.ShortDescription != "" {
		existing.ShortDescription = req.ShortDescription
	}
	if req.DetailDescription != "" {
		existing.DetailDescription = req.DetailDescription
	}
	if req.ProductStatus != "" {
		existing.ProductStatus = req.ProductStatus
	}
	if req.Pricing != nil {
		existing.Pricing = *req.Pricing
	}
	if req.Category != nil {
		existing.Category = *req.Category
	}
	if len(req.Images) > 0 {
		existing.Images = req.Images
	}
	if req.Series != nil {
		existing.Series = *req.Series
	}
	if len(req.Authors) > 0 {
		existing.Authors = req.Authors
	}
	if len(req.Tags) > 0 {
		existing.Tags = req.Tags
	}

	if err := s.bookRepo.UpdateBook(ctx, bookID, existing); err != nil {
		s.logger.Error("update book", zap.Error(err))
		respondInternalError(c, "could not update book")
		return
	}

	// Invalidate book detail cache
	_ = s.bookCache.SetDetail(ctx, bookID, nil)

	// Keep Neo4j node in sync
	authorNames := make([]string, 0, len(existing.Authors))
	for _, a := range existing.Authors {
		authorNames = append(authorNames, a.AuthorName)
	}
	_ = s.recRepo.UpsertBookNode(ctx, domain.BookNode{
		MongoID:    bookID,
		Title:      existing.Name,
		Authors:    authorNames,
		Categories: []string{existing.Category.CategoryID},
		IsActive:   true,
	})

	respondOK(c, gin.H{"message": "book updated"})
}

// AdminDeleteBook handles DELETE /api/v1/admin/books/:id.
// Soft-delete: marks is_active=false in PostgreSQL and Neo4j.
func (s *Service) AdminDeleteBook(c *gin.Context) {
	bookID := c.Param("id")
	ctx := c.Request.Context()

	ref, err := s.pg.GetBookRef(ctx, bookID)
	if err != nil || ref == nil {
		respondNotFound(c, "book not found")
		return
	}

	ref.IsActive = false
	if err := s.pg.UpdateBookRef(ctx, ref); err != nil {
		s.logger.Error("soft delete book ref", zap.Error(err))
		respondInternalError(c, "could not delete book")
		return
	}

	_ = s.recRepo.DeleteBookNode(ctx, bookID)
	_ = s.bookCache.SetDetail(ctx, bookID, nil)

	respondOK(c, gin.H{"message": "book deactivated"})
}

// AdminUpdateStock handles PATCH /api/v1/admin/books/:id/stock.
func (s *Service) AdminUpdateStock(c *gin.Context) {
	bookID := c.Param("id")
	var req domain.UpdateStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()

	inv, err := s.pg.GetInventory(ctx, bookID)
	if err != nil || inv == nil {
		respondNotFound(c, "book inventory not found")
		return
	}

	delta := req.StockQuantity - inv.StockQuantity
	if err := s.pg.UpdateStock(ctx, bookID, delta); err != nil {
		s.logger.Error("update stock", zap.Error(err))
		respondInternalError(c, "could not update stock")
		return
	}

	_ = s.bookCache.SetStock(ctx, bookID, req.StockQuantity)
	respondOK(c, gin.H{"stock_quantity": req.StockQuantity})
}
