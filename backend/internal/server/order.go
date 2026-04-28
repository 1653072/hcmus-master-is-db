package server

import (
	"bookstore/backend/internal/domain"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Checkout handles POST /api/v1/orders/checkout (NV-D1).
//
// @Summary      Checkout
// @Description  Create an order from the cart or a buy-now session (atomic PSQL TX)
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CheckoutRequest  true  "Checkout request"
// @Success      201   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Failure      409   {object}  errorResponse
// @Router       /orders/checkout [post]
//
// Cart source priority:
//  1. If session_id is provided → read items from Redis Buy-Now session
//  2. Otherwise → read from Redis cart cache, fall back to PSQL persistent_cart_items
//
// Single PG transaction:
//  1. SELECT inventory FOR UPDATE per book
//  2. DELETE cart items from PSQL
//  3. INSERT order header (status = 'pending')
//  4. INSERT order_items
//  5. DEDUCT stock_quantity per book
//  6. INSERT order_status_history (old_status=NULL, new_status='pending')
//
// After TX: DEL Redis cart + RecordPurchased in Neo4j + IncrScore in trending.
func (s *Service) Checkout(c *gin.Context) {
	var req domain.CheckoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	userID := mustUserID(c)

	// ── Load cart items ───────────────────────────────────────────────────
	var cartItems []domain.CartItem

	if req.SessionID != "" {
		// Buy-Now flow: load from Redis session
		sess, err := s.checkoutSession.GetSession(ctx, req.SessionID)
		if err != nil || sess == nil {
			respondBadRequest(c, "checkout session not found or expired")
			return
		}
		cartItems = []domain.CartItem{{
			BookID:   sess.BookID,
			Name:     sess.BookName,
			Price:    sess.Price,
			Quantity: sess.Quantity,
		}}
	} else {
		// Normal cart checkout
		items, hit, _ := s.cartCache.GetCart(ctx, userID.String())
		if hit {
			cartItems = items
		} else {
			cartItems = s.rebuildCartCache(ctx, userID.String())
		}
		if len(cartItems) == 0 {
			respondBadRequest(c, "cart is empty")
			return
		}
	}

	// ── PostgreSQL transaction ────────────────────────────────────────────
	var createdOrder *domain.Order

	txErr := s.pg.Transaction(ctx, func(tx domain.PostgresTransactor) error {
		var total float64
		items := make([]domain.OrderItem, 0, len(cartItems))

		for _, ci := range cartItems {
			inv, err := tx.GetInventoryForUpdate(ctx, ci.BookID)
			if err != nil || inv == nil {
				return fmt.Errorf("book %s not found in inventory", ci.BookID)
			}
			if inv.StockQuantity < ci.Quantity {
				return fmt.Errorf("insufficient stock for book %s (have %d, need %d)",
					ci.BookID, inv.StockQuantity, ci.Quantity)
			}

			items = append(items, domain.OrderItem{
				MongoBookID: ci.BookID,
				Name:        ci.Name,
				Quantity:    ci.Quantity,
				UnitPrice:   ci.Price,
			})
			total += ci.Price * float64(ci.Quantity)

			if err := tx.UpdateStock(ctx, ci.BookID, -ci.Quantity); err != nil {
				return fmt.Errorf("update stock for %s: %w", ci.BookID, err)
			}
		}

		// Delete from PSQL cart (only for normal checkout, not buy-now)
		if req.SessionID == "" {
			if err := tx.DeleteCartByUser(ctx, userID); err != nil {
				return fmt.Errorf("delete cart: %w", err)
			}
		}

		order := &domain.Order{
			UserID:      userID,
			Status:      domain.OrderStatusPending,
			TotalAmount: total,
			AddressID:   req.AddressID,
			Note:        req.Note,
			Items:       items,
		}

		// CreateOrder also inserts the initial order_status_history record within the TX
		if err := tx.CreateOrder(ctx, order, tx); err != nil {
			return fmt.Errorf("create order: %w", err)
		}
		createdOrder = order
		return nil
	})

	if txErr != nil {
		s.logger.Warn("checkout transaction failed", zap.Error(txErr))
		respondError(c, http.StatusConflict, txErr.Error())
		return
	}

	// ── After TX ──────────────────────────────────────────────────────────

	// Delete Redis cart cache (normal flow) or checkout session (buy-now)
	if req.SessionID != "" {
		_ = s.checkoutSession.DeleteSession(ctx, req.SessionID)
	} else {
		_ = s.cartCache.InvalidateCart(ctx, userID.String())
	}

	// Invalidate stock cache for all purchased books
	for _, ci := range cartItems {
		_ = s.bookCache.SetStock(ctx, ci.BookID, 0) // force next read to re-check DB
		if err := s.trendRepo.IncrScore(ctx, ci.BookID, float64(ci.Quantity)); err != nil {
			s.logger.Warn("incr trending score", zap.String("bookID", ci.BookID), zap.Error(err))
		}
		if err := s.recRepo.RecordPurchased(ctx, userID.String(), ci.BookID, createdOrder.ID.String(), ci.Quantity); err != nil {
			s.logger.Warn("record purchased in neo4j", zap.Error(err))
		}
	}

	respondCreated(c, createdOrder)
}

// BuyNow handles POST /api/v1/orders/buy-now (RequireUser).
//
// @Summary      Buy Now
// @Description  Create a temporary checkout session for a single book (15 min TTL)
// @Tags         orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.BuyNowRequest  true  "Buy-now request"
// @Success      200   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Router       /orders/buy-now [post]
// Validates stock and creates a temporary Redis session for the buy-now checkout flow.
func (s *Service) BuyNow(c *gin.Context) {
	var req domain.BuyNowRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	ctx := c.Request.Context()
	userID := mustUserID(c)

	inv, err := s.pg.GetInventory(ctx, req.BookID)
	if err != nil || inv == nil {
		respondNotFound(c, "book not found in inventory")
		return
	}
	if inv.StockQuantity < req.Quantity {
		respondBadRequest(c, "insufficient stock")
		return
	}

	book, _ := s.bookRepo.GetBookByID(ctx, req.BookID)
	bookName := req.BookID
	price := 0.0
	if book != nil {
		bookName = book.Name
		price = book.Pricing.Price
	}

	sessionID := uuid.New().String()
	sess := &domain.BuyNowSession{
		UserID:   userID.String(),
		BookID:   req.BookID,
		Quantity: req.Quantity,
		Price:    price,
		BookName: bookName,
	}

	if err := s.checkoutSession.CreateSession(ctx, sessionID, sess); err != nil {
		s.logger.Error("create buy-now session", zap.Error(err))
		respondInternalError(c, "could not create checkout session")
		return
	}

	respondOK(c, domain.BuyNowResponse{SessionID: sessionID})
}

// GetOrderHistory handles GET /api/v1/orders (NV-D2).
func (s *Service) GetOrderHistory(c *gin.Context) {
	userID := mustUserID(c)
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 10)

	orders, total, err := s.pg.ListOrdersByUser(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		s.logger.Error("list orders", zap.Error(err))
		respondInternalError(c, "could not fetch orders")
		return
	}

	respondPaginated(c, orders, total, page, pageSize)
}

// GetOrderDetail handles GET /api/v1/orders/:id (NV-D3).
func (s *Service) GetOrderDetail(c *gin.Context) {
	orderID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	userID := mustUserID(c)
	order, err := s.pg.GetOrderByID(c.Request.Context(), orderID)
	if err != nil || order == nil {
		respondNotFound(c, "order not found")
		return
	}

	if order.UserID != userID {
		respondForbidden(c, "access denied")
		return
	}

	respondOK(c, order)
}
