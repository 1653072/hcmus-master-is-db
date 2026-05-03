package server

import (
	"bookstore/backend/internal/domain"
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AddToCart handles POST /api/v1/cart (NV-C1).
//
// @Summary      Add to cart
// @Description  Add a book to the user's persistent cart in PostgreSQL and sync to Redis cache
// @Tags         cart
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.AddToCartRequest  true  "Cart item payload"
// @Success      200   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Router       /cart [post]
func (s *Service) AddToCart(c *gin.Context) {
	var addRequest domain.AddToCartRequest
	if err := c.ShouldBindJSON(&addRequest); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	userInternalID := mustUserInternalID(c)
	userAliasStr := mustUserAliasID(c).String()

	// Stock check — use Redis cache when enabled, else query PostgreSQL directly.
	var stockQuantity int
	if s.features.RedisBookCache {
		if quantity, hit, _ := s.bookCache.GetStock(ctx, addRequest.BookID); hit {
			stockQuantity = quantity
		} else {
			if inventory, err := s.pg.GetInventory(ctx, addRequest.BookID); err == nil && inventory != nil {
				stockQuantity = inventory.StockQuantity
				_ = s.bookCache.SetStock(ctx, addRequest.BookID, stockQuantity)
			}
		}
	} else {
		if inventory, err := s.pg.GetInventory(ctx, addRequest.BookID); err == nil && inventory != nil {
			stockQuantity = inventory.StockQuantity
		}
	}
	if stockQuantity < addRequest.Quantity {
		respondBadRequest(c, "insufficient stock")
		return
	}

	// Invalidate the Redis cart cache before modifying PostgreSQL.
	// The cache key is keyed by alias_id UUID string to avoid exposing internal IDs.
	if s.features.RedisCartCache {
		if err := s.cartCache.InvalidateCart(ctx, userAliasStr); err != nil {
			s.logger.Error("invalidate cart cache before upsert", zap.Error(err))
			respondInternalError(c, "could not update cart")
			return
		}
	}

	// Find or create the user's cart header using the internal int64 ID for the FK.
	cart, err := s.pg.GetOrCreateCartByUserID(ctx, userInternalID)
	if err != nil {
		s.logger.Error("get or create cart", zap.Error(err))
		respondInternalError(c, "could not find or create cart")
		return
	}

	cartItem := &domain.CartItemRecord{
		CartID:    cart.ID,
		BookID:    addRequest.BookID,
		Quantity:  addRequest.Quantity,
		UpdatedAt: time.Now(),
	}
	if err := s.pg.UpsertCartItem(ctx, cart.ID, cartItem); err != nil {
		s.logger.Error("upsert cart item", zap.Error(err))
		respondInternalError(c, "could not add item to cart")
		return
	}

	// Re-populate Redis cache after modification.
	if s.features.RedisCartCache {
		s.rebuildCartCache(ctx, userInternalID, userAliasStr)
	}

	respondOK(c, gin.H{"message": "item added to cart"})
}

// GetCart handles GET /api/v1/cart (NV-C2).
//
// @Summary      Get cart
// @Description  Return the current user's cart items with enriched metadata
// @Tags         cart
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  domain.CartResponse
// @Router       /cart [get]
func (s *Service) GetCart(c *gin.Context) {
	ctx := c.Request.Context()
	userInternalID := mustUserInternalID(c)
	userAliasStr := mustUserAliasID(c).String()

	var cartItems []domain.CartItem
	if s.features.RedisCartCache {
		cached, hit, _ := s.cartCache.GetCart(ctx, userAliasStr)
		if hit {
			cartItems = cached
		} else {
			cartItems = s.rebuildCartCache(ctx, userInternalID, userAliasStr)
		}
	} else {
		cartItems = s.loadCartFromPostgres(ctx, userInternalID)
	}

	var totalPrice float64
	for _, item := range cartItems {
		totalPrice += item.Price * float64(item.Quantity)
	}

	respondOK(c, domain.CartResponse{Items: cartItems, TotalPrice: totalPrice})
}

// UpdateCartItem handles PUT /api/v1/cart/:bookId.
//
// @Summary      Update cart item
// @Description  Update the quantity of a book in the user's cart
// @Tags         cart
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        bookId  path      string                         true  "Book MongoDB ID"
// @Param        body    body      domain.UpdateCartItemRequest  true  "New quantity"
// @Success      200     {object}  successResponse
// @Failure      400     {object}  errorResponse
// @Router       /cart/{bookId} [put]
func (s *Service) UpdateCartItem(c *gin.Context) {
	var updateRequest domain.UpdateCartItemRequest
	if err := c.ShouldBindJSON(&updateRequest); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	bookID := c.Param("bookId")
	userInternalID := mustUserInternalID(c)
	userAliasStr := mustUserAliasID(c).String()

	if s.features.RedisCartCache {
		_ = s.cartCache.InvalidateCart(ctx, userAliasStr)
	}

	cart, err := s.pg.GetOrCreateCartByUserID(ctx, userInternalID)
	if err != nil {
		s.logger.Error("get or create cart for update", zap.Error(err))
		respondInternalError(c, "could not find cart")
		return
	}

	cartItem := &domain.CartItemRecord{
		CartID:    cart.ID,
		BookID:    bookID,
		Quantity:  updateRequest.Quantity,
		UpdatedAt: time.Now(),
	}
	if err := s.pg.UpsertCartItem(ctx, cart.ID, cartItem); err != nil {
		s.logger.Error("update cart item", zap.Error(err))
		respondInternalError(c, "could not update cart item")
		return
	}

	if s.features.RedisCartCache {
		s.rebuildCartCache(ctx, userInternalID, userAliasStr)
	}
	respondOK(c, gin.H{"message": "cart item updated"})
}

// RemoveCartItem handles DELETE /api/v1/cart/:bookId.
//
// @Summary      Remove cart item
// @Description  Delete a book from the user's cart
// @Tags         cart
// @Security     BearerAuth
// @Produce      json
// @Param        bookId  path      string  true  "Book MongoDB ID"
// @Success      200     {object}  successResponse
// @Router       /cart/{bookId} [delete]
func (s *Service) RemoveCartItem(c *gin.Context) {
	ctx := c.Request.Context()
	bookID := c.Param("bookId")
	userInternalID := mustUserInternalID(c)
	userAliasStr := mustUserAliasID(c).String()

	if s.features.RedisCartCache {
		_ = s.cartCache.InvalidateCart(ctx, userAliasStr)
	}

	cart, err := s.pg.GetOrCreateCartByUserID(ctx, userInternalID)
	if err != nil {
		s.logger.Error("get cart for remove item", zap.Error(err))
		respondInternalError(c, "could not find cart")
		return
	}

	if err := s.pg.DeleteCartItemByBookID(ctx, cart.ID, bookID); err != nil {
		s.logger.Error("remove cart item", zap.Error(err))
		respondInternalError(c, "could not remove cart item")
		return
	}

	if s.features.RedisCartCache {
		s.rebuildCartCache(ctx, userInternalID, userAliasStr)
	}
	respondOK(c, gin.H{"message": "item removed from cart"})
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// rebuildCartCache loads the cart from PostgreSQL, enriches each item with book
// metadata from MongoDB, writes the result to Redis (keyed by alias_id UUID string),
// and returns the enriched items.
func (s *Service) rebuildCartCache(ctx context.Context, userInternalID int64, userAliasStr string) []domain.CartItem {
	items := s.loadCartFromPostgres(ctx, userInternalID)
	_ = s.cartCache.SetCart(ctx, userAliasStr, items)
	return items
}

// loadCartFromPostgres reads cart items from PostgreSQL by the internal int64 user ID
// and enriches them with book titles and prices from MongoDB.
func (s *Service) loadCartFromPostgres(ctx context.Context, userInternalID int64) []domain.CartItem {
	cartItemRecords, err := s.pg.GetCartItemsByUserID(ctx, userInternalID)
	if err != nil {
		s.logger.Warn("get cart items from PostgreSQL", zap.Error(err))
		return nil
	}

	cartItems := make([]domain.CartItem, 0, len(cartItemRecords))
	for _, record := range cartItemRecords {
		cartItem := domain.CartItem{BookID: record.BookID, Quantity: record.Quantity}
		if book, err := s.bookRepo.GetBookByID(ctx, record.BookID); err == nil && book != nil {
			cartItem.Name = book.Name
			cartItem.Price = book.Pricing.Price
		}
		cartItems = append(cartItems, cartItem)
	}
	return cartItems
}
