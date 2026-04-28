package server

import (
	"bookstore/backend/internal/domain"
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AddToCart handles POST /api/v1/cart (NV-C1).
//
// @Summary      Add to cart
// @Description  Add or update a book in the shopping cart (PSQL source of truth, Redis cache)
// @Tags         cart
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.AddToCartRequest  true  "Cart item"
// @Success      200   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Router       /cart [post]
func (s *Service) AddToCart(c *gin.Context) {
	var req domain.AddToCartRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	userID := mustUserID(c)

	// Check stock via cache first, then DB
	stockQty, hit, _ := s.bookCache.GetStock(ctx, req.BookID)
	if !hit {
		if inv, err := s.pg.GetInventory(ctx, req.BookID); err == nil && inv != nil {
			stockQty = inv.StockQuantity
			_ = s.bookCache.SetStock(ctx, req.BookID, stockQty)
		}
	}
	if stockQty < req.Quantity {
		respondBadRequest(c, "insufficient stock")
		return
	}

	// Step 1: invalidate Redis cache (must succeed before modifying PSQL)
	if err := s.cartCache.InvalidateCart(ctx, userID.String()); err != nil {
		s.logger.Error("invalidate cart before upsert", zap.Error(err))
		respondInternalError(c, "could not update cart")
		return
	}

	// Step 2: upsert in PSQL (must succeed)
	item := &domain.PersistentCartItem{
		UserID:    userID,
		BookID:    req.BookID,
		Quantity:  req.Quantity,
		UpdatedAt: time.Now(),
	}
	if err := s.pg.UpsertCartItem(ctx, item); err != nil {
		s.logger.Error("upsert cart item", zap.Error(err))
		respondInternalError(c, "could not add item to cart")
		return
	}

	// Step 3: re-populate Redis cache (best-effort)
	s.rebuildCartCache(ctx, userID.String())

	respondOK(c, gin.H{"message": "item added to cart"})
}

// GetCart handles GET /api/v1/cart (NV-C2).
//
// @Summary      Get cart
// @Description  Return current user's cart (Redis cache with PSQL fallback)
// @Tags         cart
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  successResponse
// @Router       /cart [get]
func (s *Service) GetCart(c *gin.Context) {
	ctx := c.Request.Context()
	userID := mustUserID(c)

	items, hit, _ := s.cartCache.GetCart(ctx, userID.String())
	if !hit {
		items = s.rebuildCartCache(ctx, userID.String())
	}

	var total float64
	for _, it := range items {
		total += it.Price * float64(it.Quantity)
	}

	respondOK(c, domain.CartResponse{Items: items, TotalPrice: total})
}

// UpdateCartItem handles PUT /api/v1/cart/:bookId.
func (s *Service) UpdateCartItem(c *gin.Context) {
	var req domain.UpdateCartItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	bookID := c.Param("bookId")
	userID := mustUserID(c)

	_ = s.cartCache.InvalidateCart(ctx, userID.String())

	item := &domain.PersistentCartItem{
		UserID:    userID,
		BookID:    bookID,
		Quantity:  req.Quantity,
		UpdatedAt: time.Now(),
	}
	if err := s.pg.UpsertCartItem(ctx, item); err != nil {
		s.logger.Error("update cart item", zap.Error(err))
		respondInternalError(c, "could not update cart item")
		return
	}

	s.rebuildCartCache(ctx, userID.String())
	respondOK(c, gin.H{"message": "cart item updated"})
}

// RemoveCartItem handles DELETE /api/v1/cart/:bookId.
func (s *Service) RemoveCartItem(c *gin.Context) {
	ctx := c.Request.Context()
	bookID := c.Param("bookId")
	userID := mustUserID(c)

	_ = s.cartCache.InvalidateCart(ctx, userID.String())

	if err := s.pg.DeleteCartItem(ctx, userID, bookID); err != nil {
		s.logger.Error("remove cart item", zap.Error(err))
		respondInternalError(c, "could not remove cart item")
		return
	}

	s.rebuildCartCache(ctx, userID.String())
	respondOK(c, gin.H{"message": "item removed from cart"})
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// rebuildCartCache loads the cart from PSQL, enriches with book prices, and writes to Redis.
// Returns the freshly loaded items (or empty slice on error).
func (s *Service) rebuildCartCache(ctx context.Context, userIDStr string) []domain.CartItem {
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil
	}

	rows, err := s.pg.GetCartByUser(ctx, userID)
	if err != nil {
		s.logger.Warn("get cart from psql", zap.Error(err))
		return nil
	}

	items := make([]domain.CartItem, 0, len(rows))
	for _, row := range rows {
		ci := domain.CartItem{BookID: row.BookID, Quantity: row.Quantity}
		if book, err := s.bookRepo.GetBookByID(ctx, row.BookID); err == nil && book != nil {
			ci.Name = book.Name
			ci.Price = book.Pricing.Price
		}
		items = append(items, ci)
	}

	_ = s.cartCache.SetCart(ctx, userIDStr, items)
	return items
}
