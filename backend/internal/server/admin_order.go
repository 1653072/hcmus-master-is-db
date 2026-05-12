package server

import (
	"bookstore/backend/internal/domain"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AdminListOrders handles GET /api/v1/admin/orders.
//
// @Summary      Admin: List orders
// @Description  Return a paginated list of all orders with optional status filter
// @Tags         admin-orders
// @Security     BearerAuth
// @Produce      json
// @Param        status     query     string  false  "Filter by order status"
// @Param        page       query     int     false  "Page number"
// @Param        page_size  query     int     false  "Items per page"
// @Success      200        {object}  domain.OrderListResponse
// @Router       /admin/orders [get]
func (s *Service) AdminListOrders(c *gin.Context) {
	status := domain.OrderStatus(c.Query("status"))
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 20)

	orders, total, err := s.pg.ListAllOrders(c.Request.Context(), status, page, pageSize)
	if err != nil {
		s.logger.Error("admin list orders", zap.Error(err))
		respondInternalError(c, "could not list orders")
		return
	}

	respondPaginated(c, orders, total, page, pageSize)
}

// AdminGetOrder handles GET /api/v1/admin/orders/:id.
// The :id parameter is the order's alias_id UUID.
//
// @Summary      Admin: Get order
// @Description  Return full order details for any order
// @Tags         admin-orders
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Order Alias ID (UUID)"
// @Success      200  {object}  domain.Order
// @Router       /admin/orders/{id} [get]
func (s *Service) AdminGetOrder(c *gin.Context) {
	orderAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	order, err := s.pg.GetOrderByAliasID(c.Request.Context(), orderAliasID)
	if err != nil || order == nil {
		respondNotFound(c, "order not found")
		return
	}

	respondOK(c, order)
}

// AdminUpdateOrderStatus handles PATCH /api/v1/admin/orders/:id/status.
//
// State machine rules (enforced in PostgreSQL repository):
//   - pending   → confirmed | packing | cancelled
//   - confirmed → packing   | cancelled
//   - packing   → shipping  | cancelled
//   - shipping  → completed | cancelled
//   - completed → terminal  (no further changes allowed)
//   - cancelled → terminal  (no further changes allowed)
//
// When an order is cancelled, the purchased stock quantities are restored to
// the inventory inside a transaction to preserve ACID consistency.
//
// @Summary      Admin: Update order status
// @Description  Transition an order to a new state and log audit trail
// @Tags         admin-orders
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                            true  "Order Alias ID (UUID)"
// @Param        body  body      domain.UpdateOrderStatusRequest  true  "Status update payload"
// @Success      200   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Router       /admin/orders/{id}/status [patch]
func (s *Service) AdminUpdateOrderStatus(c *gin.Context) {
	orderAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	var statusUpdateRequest domain.UpdateOrderStatusRequest
	if err := c.ShouldBindJSON(&statusUpdateRequest); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	// Admin's alias_id is stored in the history record (denormalised UUID — no DB join needed).
	adminAliasID := mustUserAliasID(c)

	// Resolve alias_id → full Order struct (includes internal int64 ID and pre-loaded Items).
	order, err := s.pg.GetOrderByAliasID(ctx, orderAliasID)
	if err != nil || order == nil {
		respondNotFound(c, "order not found")
		return
	}

	// Wrap the status update and optional stock restoration in a single transaction.
	restoredStockByBookID := make(map[string]int, len(order.Items))
	transactionError := s.pg.Transaction(ctx, func(transaction domain.PostgresTransactor) error {
		// UpdateOrderStatus uses the internal int64 PK for the WHERE clause.
		if err := transaction.UpdateOrderStatus(ctx, order.ID, statusUpdateRequest.Status, &adminAliasID, statusUpdateRequest.Note); err != nil {
			return err
		}

		// When an order is cancelled, restore the inventory for each line item.
		if statusUpdateRequest.Status == domain.OrderStatusCancelled {
			for _, lineItem := range order.Items {
				inventory, lockErr := transaction.GetInventoryForUpdate(ctx, lineItem.MongoBookID)
				if lockErr != nil {
					return lockErr
				}
				if inventory != nil {
					restoredStockByBookID[lineItem.MongoBookID] = inventory.StockQuantity + lineItem.Quantity
				}
				if restoreErr := transaction.UpdateStock(ctx, lineItem.MongoBookID, lineItem.Quantity); restoreErr != nil {
					return restoreErr
				}
			}
		}
		return nil
	})

	if transactionError != nil {
		s.logger.Error("update order status", zap.Error(transactionError))
		respondInternalError(c, transactionError.Error())
		return
	}

	// Invalidate order-history cache for the order owner (keyed by internal user ID).
	if s.features.RedisOrderHistory {
		if err := s.orderCache.InvalidateOrderHistory(ctx, strconv.FormatInt(order.UserID, 10)); err != nil {
			s.logger.Warn("failed to invalidate order history cache", zap.Error(err))
		}
	}

	// Invalidate stale stock cache entries when stock was restored after cancellation.
	if statusUpdateRequest.Status == domain.OrderStatusCancelled && s.features.RedisBookCache {
		for _, lineItem := range order.Items {
			if restoredStock, ok := restoredStockByBookID[lineItem.MongoBookID]; ok {
				if err := s.bookCache.SetStock(ctx, lineItem.MongoBookID, restoredStock); err != nil {
					s.logger.Warn("failed to update Redis stock cache", zap.String("book_id", lineItem.MongoBookID), zap.Error(err))
				}
			} else {
				if err := s.bookCache.InvalidateStock(ctx, lineItem.MongoBookID); err != nil {
					s.logger.Warn("failed to invalidate stock cache", zap.String("book_id", lineItem.MongoBookID), zap.Error(err))
				}
			}
		}
	}

	respondOK(c, gin.H{"status": string(statusUpdateRequest.Status)})
}

// AdminGetOrderHistory handles GET /api/v1/admin/orders/:id/history.
// The :id parameter is the order's alias_id UUID.
//
// @Summary      Admin: Get order audit trail
// @Description  Return the full history of status transitions for an order
// @Tags         admin-orders
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Order Alias ID (UUID)"
// @Success      200  {array}   domain.OrderStatusHistory
// @Router       /admin/orders/{id}/history [get]
func (s *Service) AdminGetOrderHistory(c *gin.Context) {
	orderAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	ctx := c.Request.Context()

	// Resolve alias_id to get the internal order ID needed for the history lookup.
	order, err := s.pg.GetOrderByAliasID(ctx, orderAliasID)
	if err != nil || order == nil {
		respondNotFound(c, "order not found")
		return
	}

	history, err := s.pg.ListByOrder(ctx, order.ID)
	if err != nil {
		s.logger.Error("list order history", zap.Error(err))
		respondInternalError(c, "could not fetch order history")
		return
	}

	respondOK(c, history)
}
