package server

import (
	"bookstore/backend/internal/domain"
	"errors"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminListBooks handles GET /api/v1/admin/books.
//
// @Summary      Admin: List books
// @Description  Return a paginated list of all books with stock info
// @Tags         admin-books
// @Security     BearerAuth
// @Produce      json
// @Param        search     query     string  false  "Search query"
// @Param        author     query     string  false  "Filter by author"
// @Param        publisher  query     string  false  "Filter by publisher"
// @Param        page       query     int     false  "Page number"
// @Param        page_size  query     int     false  "Items per page"
// @Success      200        {object}  domain.BookListResponse
// @Router       /admin/books [get]
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
// Writes to MongoDB (book catalog), PostgreSQL (books_ref + inventory), and Neo4j
// (Book node + structural relationships + SIMILARITY_TO edges).
//
// @Summary      Admin: Create book
// @Description  Create a new book across MongoDB, PostgreSQL, and Neo4j
// @Tags         admin-books
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CreateBookRequest  true  "Book payload"
// @Success      201   {object}  domain.BookDetail
// @Failure      400   {object}  errorResponse
// @Router       /admin/books [post]
func (s *Service) AdminCreateBook(c *gin.Context) {
	var createRequest domain.CreateBookRequest
	if err := c.ShouldBindJSON(&createRequest); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()

	// Step 1: Insert the catalog document into MongoDB.
	book := &domain.Book{
		Name:              createRequest.Name,
		ShortDescription:  createRequest.ShortDescription,
		DetailDescription: createRequest.DetailDescription,
		ProductStatus:     createRequest.ProductStatus,
		Pricing:           createRequest.Pricing,
		Category:          createRequest.Category,
		Images:            createRequest.Images,
		Series:            createRequest.Series,
		Authors:           createRequest.Authors,
		Tags:              createRequest.Tags,
	}

	mongoID, err := s.bookRepo.CreateBook(ctx, book)
	if err != nil {
		s.logger.Error("create book in MongoDB", zap.Error(err))
		respondInternalError(c, "could not create book")
		return
	}

	// Step 2: Insert the bridge row into PostgreSQL.
	bookReference := &domain.BookRef{MongoID: mongoID, IsActive: true}
	if err := s.pg.CreateBookRef(ctx, bookReference); err != nil {
		s.logger.Error("create book reference in PostgreSQL", zap.Error(err))
		_ = s.bookRepo.DeleteBook(ctx, mongoID)
		respondInternalError(c, "could not create book reference")
		return
	}

	// Step 3: Insert the inventory row.
	inventory := &domain.Inventory{BookID: mongoID, StockQuantity: createRequest.StockQuantity}
	if err := s.pg.CreateInventory(ctx, inventory); err != nil {
		s.logger.Error("create inventory in PostgreSQL", zap.Error(err))
	}

	// Step 4: Upsert the Book node in Neo4j (also computes SIMILARITY_TO edges).
	authorNames := make([]string, 0, len(createRequest.Authors))
	for _, author := range createRequest.Authors {
		authorNames = append(authorNames, author.AuthorName)
	}
	tagNames := make([]string, 0, len(createRequest.Tags))
	for _, tag := range createRequest.Tags {
		tagNames = append(tagNames, tag.TagName)
	}
	bookNode := domain.BookNode{
		MongoID:    mongoID,
		Title:      createRequest.Name,
		Authors:    authorNames,
		Categories: []string{createRequest.Category.CategoryID},
		Tags:       tagNames,
		SeriesName: createRequest.Series.SeriesName,
		SequenceNo: createRequest.Series.SequenceNo,
		IsActive:   true,
	}
	if err := s.recRepo.UpsertBookNode(ctx, bookNode); err != nil {
		s.logger.Warn("upsert Neo4j book node (non-fatal)", zap.Error(err))
	}

	book.ID = mongoID
	respondCreated(c, domain.BookDetail{
		Book:          *book,
		StockQuantity: createRequest.StockQuantity,
		Price:         createRequest.Pricing.Price,
	})
}

// AdminUpdateBook handles PUT /api/v1/admin/books/:id.
// Updates MongoDB, invalidates Redis book-detail cache, and re-syncs the Neo4j node.
//
// @Summary      Admin: Update book
// @Description  Update book metadata and re-sync Neo4j graph
// @Tags         admin-books
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                    true  "Book MongoDB ID"
// @Param        body  body      domain.UpdateBookRequest  true  "Update payload"
// @Success      200   {object}  successResponse
// @Router       /admin/books/{id} [put]
func (s *Service) AdminUpdateBook(c *gin.Context) {
	bookID := c.Param("id")
	var updateRequest domain.UpdateBookRequest
	if err := c.ShouldBindJSON(&updateRequest); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()

	existingBook, err := s.bookRepo.GetBookByID(ctx, bookID)
	if err != nil || existingBook == nil {
		respondNotFound(c, "book not found")
		return
	}

	if updateRequest.Name != "" {
		existingBook.Name = updateRequest.Name
	}
	if updateRequest.ShortDescription != "" {
		existingBook.ShortDescription = updateRequest.ShortDescription
	}
	if updateRequest.DetailDescription != "" {
		existingBook.DetailDescription = updateRequest.DetailDescription
	}
	if updateRequest.ProductStatus != "" {
		existingBook.ProductStatus = updateRequest.ProductStatus
	}
	if updateRequest.Pricing != nil {
		existingBook.Pricing = *updateRequest.Pricing
	}
	if updateRequest.Category != nil {
		existingBook.Category = *updateRequest.Category
	}
	if len(updateRequest.Images) > 0 {
		existingBook.Images = updateRequest.Images
	}
	if updateRequest.Series != nil {
		existingBook.Series = *updateRequest.Series
	}
	if len(updateRequest.Authors) > 0 {
		existingBook.Authors = updateRequest.Authors
	}
	if len(updateRequest.Tags) > 0 {
		existingBook.Tags = updateRequest.Tags
	}

	if err := s.bookRepo.UpdateBook(ctx, bookID, existingBook); err != nil {
		s.logger.Error("update book in MongoDB", zap.Error(err))
		respondInternalError(c, "could not update book")
		return
	}

	// Invalidate Redis book-detail cache.
	_ = s.bookCache.SetDetail(ctx, bookID, nil)

	// Re-sync Neo4j Book node and SIMILARITY_TO edges.
	authorNames := make([]string, 0, len(existingBook.Authors))
	for _, author := range existingBook.Authors {
		authorNames = append(authorNames, author.AuthorName)
	}
	_ = s.recRepo.UpsertBookNode(ctx, domain.BookNode{
		MongoID:    bookID,
		Title:      existingBook.Name,
		Authors:    authorNames,
		Categories: []string{existingBook.Category.CategoryID},
		IsActive:   true,
	})

	respondOK(c, gin.H{"message": "book updated"})
}

// AdminDeleteBook handles DELETE /api/v1/admin/books/:id.
// Soft-delete: marks is_active = false in both PostgreSQL and Neo4j.
//
// @Summary      Admin: Delete book
// @Description  Soft-delete a book by marking it inactive in PostgreSQL and Neo4j
// @Tags         admin-books
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Book MongoDB ID"
// @Success      200  {object}  successResponse
// @Router       /admin/books/{id} [delete]
func (s *Service) AdminDeleteBook(c *gin.Context) {
	bookID := c.Param("id")
	ctx := c.Request.Context()

	bookReference, err := s.pg.GetBookRef(ctx, bookID)
	if err != nil || bookReference == nil {
		respondNotFound(c, "book not found")
		return
	}

	bookReference.IsActive = false
	if err := s.pg.UpdateBookRef(ctx, bookReference); err != nil {
		s.logger.Error("soft delete book reference in PostgreSQL", zap.Error(err))
		respondInternalError(c, "could not delete book")
		return
	}

	_ = s.recRepo.DeleteBookNode(ctx, bookID)
	_ = s.bookCache.SetDetail(ctx, bookID, nil)

	respondOK(c, gin.H{"message": "book deactivated"})
}

// AdminUpdateStock handles PATCH /api/v1/admin/books/:id/stock.
//
// ACID guarantee: the read-modify-write is wrapped in a PostgreSQL transaction with
// a SELECT FOR UPDATE lock so that concurrent checkout requests and parallel admin
// stock adjustments cannot produce negative or incorrect stock counts.
//
// @Summary      Admin: Update stock
// @Description  Set absolute stock quantity for a book (Atomic Transaction)
// @Tags         admin-books
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                     true  "Book MongoDB ID"
// @Param        body  body      domain.UpdateStockRequest  true  "New stock quantity"
// @Success      200   {object}  successResponse
// @Router       /admin/books/{id}/stock [patch]
func (s *Service) AdminUpdateStock(c *gin.Context) {
	bookID := c.Param("id")
	var updateStockRequest domain.UpdateStockRequest
	if err := c.ShouldBindJSON(&updateStockRequest); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	var newStockQuantity int

	transactionError := s.pg.Transaction(ctx, func(transaction domain.PostgresTransactor) error {
		// Acquire a row-level lock to prevent concurrent modifications.
		inventory, err := transaction.GetInventoryForUpdate(ctx, bookID)
		if err != nil {
			return err
		}
		if inventory == nil {
			return errors.New("book inventory not found")
		}
		delta := updateStockRequest.StockQuantity - inventory.StockQuantity
		newStockQuantity = updateStockRequest.StockQuantity
		return transaction.UpdateStock(ctx, bookID, delta)
	})

	if transactionError != nil {
		s.logger.Error("update stock in transaction", zap.Error(transactionError))
		respondInternalError(c, "could not update stock")
		return
	}

	// Refresh the Redis stock cache with the new quantity.
	if s.features.RedisBookCache {
		_ = s.bookCache.SetStock(ctx, bookID, newStockQuantity)
	}
	respondOK(c, gin.H{"stock_quantity": newStockQuantity})
}
