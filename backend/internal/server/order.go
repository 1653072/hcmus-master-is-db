package server

import (
	"bookstore/backend/internal/domain"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Checkout handles POST /api/v1/orders/checkout (NV-D1).
//
// Cart source priority:
//  1. If session_id is provided → read items from the Redis Buy-Now session.
//  2. Otherwise → read from Redis cart cache; fall back to PostgreSQL cart_items.
//
// Single PostgreSQL transaction:
//  1. SELECT inventory FOR UPDATE per book (pessimistic lock prevents overselling).
//  2. DELETE cart items from PostgreSQL (normal checkout only).
//  3. INSERT order header (status = 'pending').
//  4. INSERT order_items (price snapshot at purchase time).
//  5. UPDATE stock_quantity per book (deduct purchased quantity).
//  6. INSERT order_status_histories (old_status = NULL, new_status = 'pending').
//
// After transaction: invalidate Redis cart cache, order-history cache, and stock cache.
//
// @Summary      Checkout
// @Description  Place an order from the cart or a Buy-Now session (Atomic Transaction)
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CheckoutRequest  true  "Checkout payload"
// @Success      201   {object}  domain.Order
// @Failure      400   {object}  errorResponse
// @Failure      409   {object}  errorResponse
// @Router       /orders/checkout [post]
func (s *Service) Checkout(c *gin.Context) {
	var checkoutRequest domain.CheckoutRequest
	if err := c.ShouldBindJSON(&checkoutRequest); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	userInternalID := mustUserInternalID(c)
	userAliasStr := mustUserAliasID(c).String()

	// ── Load cart items ───────────────────────────────────────────────────
	var cartItems []domain.CartItem

	if checkoutRequest.SessionID != "" {
		session, err := s.checkoutSession.GetSession(ctx, checkoutRequest.SessionID)
		if err != nil || session == nil {
			respondBadRequest(c, "checkout session not found or expired")
			return
		}
		cartItems = []domain.CartItem{{
			BookID:   session.BookID,
			Name:     session.BookName,
			Price:    session.Price,
			Quantity: session.Quantity,
		}}
	} else {
		items, hit, _ := s.cartCache.GetCart(ctx, userAliasStr)
		if hit {
			cartItems = items
		} else {
			cartItems = s.rebuildCartCache(ctx, userInternalID, userAliasStr)
		}
		if len(cartItems) == 0 {
			respondBadRequest(c, "cart is empty")
			return
		}
	}

	// ── Resolve address alias_id → internal int64 FK ──────────────────────
	var addressInternalID *int64
	if checkoutRequest.AddressID != nil {
		addr, err := s.pg.GetAddressByAliasID(ctx, *checkoutRequest.AddressID)
		if err != nil || addr == nil {
			respondBadRequest(c, "address not found")
			return
		}
		addressInternalID = &addr.ID
	}

	// ── PostgreSQL transaction ────────────────────────────────────────────
	var createdOrder *domain.Order

	transactionError := s.pg.Transaction(ctx, func(transaction domain.PostgresTransactor) error {
		var totalAmount float64
		orderLineItems := make([]domain.OrderItem, 0, len(cartItems))

		for _, cartItem := range cartItems {
			inventory, err := transaction.GetInventoryForUpdate(ctx, cartItem.BookID)
			if err != nil || inventory == nil {
				return fmt.Errorf("book %s not found in inventory", cartItem.BookID)
			}
			if inventory.StockQuantity < cartItem.Quantity {
				return fmt.Errorf("insufficient stock for book %s (available: %d, requested: %d)",
					cartItem.BookID, inventory.StockQuantity, cartItem.Quantity)
			}

			orderLineItems = append(orderLineItems, domain.OrderItem{
				MongoBookID: cartItem.BookID,
				Name:        cartItem.Name,
				Quantity:    cartItem.Quantity,
				UnitPrice:   cartItem.Price,
			})
			totalAmount += cartItem.Price * float64(cartItem.Quantity)

			if err := transaction.UpdateStock(ctx, cartItem.BookID, -cartItem.Quantity); err != nil {
				return fmt.Errorf("update stock for book %s: %w", cartItem.BookID, err)
			}
		}

		if checkoutRequest.SessionID == "" {
			if err := transaction.DeleteCartByUserID(ctx, userInternalID); err != nil {
				return fmt.Errorf("delete cart: %w", err)
			}
		}

		order := &domain.Order{
			UserID:      userInternalID,
			Status:      domain.OrderStatusPending,
			TotalAmount: totalAmount,
			AddressID:   addressInternalID,
			Note:        checkoutRequest.Note,
			Items:       orderLineItems,
		}

		if err := transaction.CreateOrder(ctx, order, transaction); err != nil {
			return fmt.Errorf("create order: %w", err)
		}
		createdOrder = order
		return nil
	})

	if transactionError != nil {
		s.logger.Warn("checkout transaction failed", zap.Error(transactionError))
		respondError(c, http.StatusConflict, transactionError.Error())
		return
	}

	// ── Post-transaction side effects ─────────────────────────────────────

	if checkoutRequest.SessionID != "" {
		if err := s.checkoutSession.DeleteSession(ctx, checkoutRequest.SessionID); err != nil {
			s.logger.Warn("failed to delete checkout session", zap.String("session_id", checkoutRequest.SessionID), zap.Error(err))
		}
	} else if s.features.RedisCartCache {
		if err := s.cartCache.InvalidateCart(ctx, userAliasStr); err != nil {
			s.logger.Warn("failed to invalidate cart cache", zap.String("user", userAliasStr), zap.Error(err))
		}
	}

	// Invalidate order-history cache keyed by internal user ID (Redis-internal key).
	if s.features.RedisOrderHistory {
		if err := s.orderCache.InvalidateOrderHistory(ctx, strconv.FormatInt(userInternalID, 10)); err != nil {
			s.logger.Warn("failed to invalidate order history cache", zap.Int64("user_id", userInternalID), zap.Error(err))
		}
	}

	if s.features.RedisBookCache {
		for _, cartItem := range cartItems {
			if err := s.bookCache.SetStock(ctx, cartItem.BookID, 0); err != nil {
				s.logger.Warn("failed to invalidate stock cache", zap.String("book_id", cartItem.BookID), zap.Error(err))
			}
		}
	}

	respondCreated(c, createdOrder)
}

// BuyNow handles POST /api/v1/orders/buy-now (RequireUser).
// Validates stock and creates a temporary Redis session for the buy-now checkout flow (TTL 15 min).
//
// @Summary      Buy Now
// @Description  Create a temporary 15-minute session for a single-book purchase
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.BuyNowRequest  true  "Buy Now payload"
// @Success      200   {object}  domain.BuyNowResponse
// @Failure      400   {object}  errorResponse
// @Router       /orders/buy-now [post]
func (s *Service) BuyNow(c *gin.Context) {
	var buyNowRequest domain.BuyNowRequest
	if err := c.ShouldBindJSON(&buyNowRequest); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	// Store the alias_id in the Buy-Now session (safe external identifier).
	userAliasStr := mustUserAliasID(c).String()

	// Stock check
	if err := s.checkStock(ctx, buyNowRequest.BookID, buyNowRequest.Quantity); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	book, err := s.bookRepo.GetBookByID(ctx, buyNowRequest.BookID)
	if err != nil {
		s.logger.Warn("failed to fetch book for buy-now", zap.String("book_id", buyNowRequest.BookID), zap.Error(err))
	}
	bookName := buyNowRequest.BookID
	price := 0.0
	if book != nil {
		bookName = book.Name
		price = book.Pricing.Price
	}

	sessionID := uuid.New().String()
	session := &domain.BuyNowSession{
		UserID:   userAliasStr,
		BookID:   buyNowRequest.BookID,
		Quantity: buyNowRequest.Quantity,
		Price:    price,
		BookName: bookName,
	}

	if err := s.checkoutSession.CreateSession(ctx, sessionID, session); err != nil {
		s.logger.Error("create buy-now session", zap.Error(err))
		respondInternalError(c, "could not create checkout session")
		return
	}

	respondOK(c, domain.BuyNowResponse{SessionID: sessionID})
}

// GetOrderHistory handles GET /api/v1/orders (NV-D2).
// Uses Redis order-history cache (TTL 30 min) when features.RedisOrderHistory is enabled.
// The cache key uses the internal user ID (int64 as string) — never exposed externally.
//
// @Summary      Get order history
// @Description  Return a paginated list of the current user's orders
// @Tags         orders
// @Security     BearerAuth
// @Produce      json
// @Param        page       query     int  false  "Page number (default 1)"
// @Param        page_size  query     int  false  "Items per page (default 10)"
// @Success      200        {object}  domain.OrderListResponse
// @Router       /orders [get]
func (s *Service) GetOrderHistory(c *gin.Context) {
	userInternalID := mustUserInternalID(c)
	cacheKey := strconv.FormatInt(userInternalID, 10)
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 10)
	ctx := c.Request.Context()

	if s.features.RedisOrderHistory {
		if orders, total, hit, _ := s.orderCache.GetOrderHistory(ctx, cacheKey, page, pageSize); hit {
			respondPaginated(c, orders, total, page, pageSize)
			return
		}
	}

	orders, total, err := s.pg.ListOrdersByUser(ctx, userInternalID, page, pageSize)
	if err != nil {
		s.logger.Error("list orders", zap.Error(err))
		respondInternalError(c, "could not fetch orders")
		return
	}

	if s.features.RedisOrderHistory {
		if err := s.orderCache.SetOrderHistory(ctx, cacheKey, page, pageSize, orders, total); err != nil {
			s.logger.Warn("failed to cache order history", zap.String("user", cacheKey), zap.Error(err))
		}
	}

	respondPaginated(c, orders, total, page, pageSize)
}

// GetOrderDetail handles GET /api/v1/orders/:id (NV-D3).
// The :id parameter is the order's alias_id UUID.
//
// @Summary      Get order detail
// @Description  Return full order details including line items
// @Tags         orders
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Order Alias ID (UUID)"
// @Success      200  {object}  domain.Order
// @Failure      403  {object}  errorResponse
// @Failure      404  {object}  errorResponse
// @Router       /orders/{id} [get]
func (s *Service) GetOrderDetail(c *gin.Context) {
	orderAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	userInternalID := mustUserInternalID(c)
	order, err := s.pg.GetOrderByAliasID(c.Request.Context(), orderAliasID)
	if err != nil || order == nil {
		respondNotFound(c, "order not found")
		return
	}

	// Compare internal int64 user IDs — never compare alias_ids, which are only for external use.
	if order.UserID != userInternalID {
		respondForbidden(c, "access denied due to invalid order owner")
		return
	}

	respondOK(c, order)
}
