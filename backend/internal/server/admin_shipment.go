package server

import (
	"bookstore/backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AdminGetShipment handles GET /api/v1/admin/shipments/:id.
//
// @Summary      Admin: Get shipment
// @Description  Return full shipment details by its alias ID
// @Tags         admin-shipments
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Shipment Alias ID (UUID)"
// @Success      200  {object}  domain.Shipment
// @Router       /admin/shipments/{id} [get]
func (s *Service) AdminGetShipment(c *gin.Context) {
	aliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid shipment id")
		return
	}

	shipment, err := s.pg.GetShipmentByAliasID(c.Request.Context(), aliasID)
	if err != nil || shipment == nil {
		respondNotFound(c, "shipment not found")
		return
	}

	respondOK(c, shipment)
}

// AdminGetShipmentByOrder handles GET /api/v1/admin/orders/:id/shipment.
//
// @Summary      Admin: Get shipment by order
// @Description  Return shipment details for a specific order
// @Tags         admin-shipments
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Order Alias ID (UUID)"
// @Success      200  {object}  domain.Shipment
// @Router       /admin/orders/{id}/shipment [get]
func (s *Service) AdminGetShipmentByOrder(c *gin.Context) {
	orderAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid order id")
		return
	}

	shipment, err := s.pg.GetShipmentByOrderAliasID(c.Request.Context(), orderAliasID)
	if err != nil || shipment == nil {
		respondNotFound(c, "shipment not found for this order")
		return
	}

	respondOK(c, shipment)
}

// AdminUpdateShipmentStatus handles PATCH /api/v1/admin/shipments/:id/status.
//
// @Summary      Admin: Update shipment status
// @Description  Transition a shipment to a new state
// @Tags         admin-shipments
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                            true  "Shipment Alias ID (UUID)"
// @Param        body  body      domain.UpdateShipmentStatusRequest  true  "Status update payload"
// @Success      200   {object}  successResponse
// @Router       /admin/shipments/{id}/status [patch]
func (s *Service) AdminUpdateShipmentStatus(c *gin.Context) {
	aliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid shipment id")
		return
	}

	var req domain.UpdateShipmentStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	shipment, err := s.pg.GetShipmentByAliasID(ctx, aliasID)
	if err != nil || shipment == nil {
		respondNotFound(c, "shipment not found")
		return
	}

	if err := s.pg.UpdateShipmentStatus(ctx, shipment.ID, req.Status); err != nil {
		s.logger.Error("update shipment status", zap.Error(err))
		respondInternalError(c, "could not update shipment status")
		return
	}

	respondOK(c, gin.H{"status": string(req.Status)})
}

// AdminUpdateShipmentDetails handles PUT /api/v1/admin/shipments/:id.
//
// @Summary      Admin: Update shipment details
// @Description  Update carrier and tracking number for a shipment
// @Tags         admin-shipments
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                             true  "Shipment Alias ID (UUID)"
// @Param        body  body      domain.UpdateShipmentDetailsRequest  true  "Details update payload"
// @Success      200   {object}  successResponse
// @Router       /admin/shipments/{id} [put]
func (s *Service) AdminUpdateShipmentDetails(c *gin.Context) {
	aliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid shipment id")
		return
	}

	var req domain.UpdateShipmentDetailsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	shipment, err := s.pg.GetShipmentByAliasID(ctx, aliasID)
	if err != nil || shipment == nil {
		respondNotFound(c, "shipment not found")
		return
	}

	if err := s.pg.UpdateShipmentDetails(ctx, shipment.ID, req.Carrier, req.TrackingNo); err != nil {
		s.logger.Error("update shipment details", zap.Error(err))
		respondInternalError(c, "could not update shipment details")
		return
	}

	respondOK(c, gin.H{"message": "shipment details updated"})
}
