package server

import (
	"bookstore/backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetShipmentByOrder handles GET /api/v1/orders/:id/shipment.
//
// @Summary      Customer: Get shipment by order
// @Description  Return shipment details for one of the customer's orders
// @Tags         orders
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Order Alias ID (UUID)"
// @Success      200  {object}  domain.Shipment
// @Router       /orders/{id}/shipment [get]
func (s *Service) GetShipmentByOrder(c *gin.Context) {
	orderAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	ctx := c.Request.Context()
	userID := mustUserInternalID(c)

	// Verify order belongs to user
	order, err := s.pg.GetOrderByAliasID(ctx, orderAliasID)
	if err != nil || order == nil {
		respondNotFound(c, "order not found")
		return
	}
	if order.UserID != userID {
		respondForbidden(c, "you do not have permission to view this shipment")
		return
	}

	var shipment *domain.Shipment
	shipment, err = s.pg.GetShipmentByOrderAliasID(ctx, orderAliasID)
	if err != nil || shipment == nil {
		respondNotFound(c, "shipment not found for this order")
		return
	}

	respondOK(c, shipment)
}
