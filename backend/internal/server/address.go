package server

import (
	"bookstore/backend/internal/domain"
	"bookstore/backend/utils/validator"
	"go.uber.org/zap"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// ─── Addresses ────────────────────────────────────────────────────────────────

// CreateAddress adds a new delivery address for the user.
//
// @Summary      Create address
// @Description  Add a new delivery address to the user's profile
// @Tags         addresses
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CreateAddressRequest  true  "Address details"
// @Success      201   {object}  domain.Address
// @Failure      400   {object}  errorResponse
// @Router       /users/addresses [post]
func (s *Service) CreateAddress(c *gin.Context) {
	var req domain.CreateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	if !validator.IsValidPhone(req.Phone) {
		respondError(c, http.StatusBadRequest, "invalid phone number format")
		return
	}

	userInternalID := mustUserInternalID(c)
	addr := &domain.Address{
		AliasID:      uuid.New(),
		UserID:       userInternalID,
		ReceiverName: req.ReceiverName,
		Phone:        req.Phone,
		AddressLine:  req.AddressLine,
		Ward:         req.Ward,
		District:     req.District,
		City:         req.City,
		IsDefault:    req.IsDefault,
	}

	if err := s.pg.Transaction(c.Request.Context(), func(tx domain.PostgresTransactor) error {
		if addr.IsDefault {
			if err := tx.SetDefault(c.Request.Context(), userInternalID, addr.AliasID); err != nil {
				return err
			}
		}
		return tx.CreateAddress(c.Request.Context(), addr)
	}); err != nil {
		s.logger.Error("create address", zap.Error(err))
		respondInternalError(c, "could not create address")
		return
	}

	respondCreated(c, addr)
}

// ListAddresses returns all delivery addresses for the user.
//
// @Summary      List addresses
// @Description  Return all active delivery addresses for the current user
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Success      200  {array}   domain.Address
// @Router       /users/addresses [get]
func (s *Service) ListAddresses(c *gin.Context) {
	userInternalID := mustUserInternalID(c)
	addrs, err := s.pg.ListAddressesByUser(c.Request.Context(), userInternalID)
	if err != nil {
		s.logger.Error("list addresses", zap.Error(err))
		respondInternalError(c, "could not list addresses")
		return
	}
	respondOK(c, addrs)
}

// UpdateAddress modifies an existing delivery address.
//
// @Summary      Update address
// @Description  Update fields of an existing delivery address
// @Tags         addresses
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                       true  "Address AliasID (UUID)"
// @Param        body  body      domain.UpdateAddressRequest  true  "Address update"
// @Success      200   {object}  domain.Address
// @Failure      400   {object}  errorResponse
// @Failure      404   {object}  errorResponse
// @Router       /users/addresses/{id} [put]
func (s *Service) UpdateAddress(c *gin.Context) {
	aliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid address id")
		return
	}

	var req domain.UpdateAddressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	userInternalID := mustUserInternalID(c)
	addr, err := s.pg.GetAddressByAliasID(c.Request.Context(), aliasID)
	if err != nil || addr == nil || addr.UserID != userInternalID {
		respondNotFound(c, "address not found")
		return
	}

	if req.ReceiverName != "" {
		addr.ReceiverName = req.ReceiverName
	}
	if req.Phone != "" {
		if !validator.IsValidPhone(req.Phone) {
			respondError(c, http.StatusBadRequest, "invalid phone number format")
			return
		}
		addr.Phone = req.Phone
	}
	if req.AddressLine != "" {
		addr.AddressLine = req.AddressLine
	}
	if req.Ward != "" {
		addr.Ward = req.Ward
	}
	if req.District != "" {
		addr.District = req.District
	}
	if req.City != "" {
		addr.City = req.City
	}

	if err := s.pg.Transaction(c.Request.Context(), func(tx domain.PostgresTransactor) error {
		if req.IsDefault != nil && *req.IsDefault {
			if err := tx.SetDefault(c.Request.Context(), userInternalID, addr.AliasID); err != nil {
				return err
			}
			addr.IsDefault = true
		} else if req.IsDefault != nil && !*req.IsDefault {
			addr.IsDefault = false
		}
		return tx.UpdateAddress(c.Request.Context(), addr)
	}); err != nil {
		s.logger.Error("update address", zap.Error(err))
		respondInternalError(c, "could not update address")
		return
	}

	respondOK(c, addr)
}

// DeleteAddress removes a delivery address (soft-delete).
//
// @Summary      Delete address
// @Description  Mark a delivery address as deleted
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Address AliasID (UUID)"
// @Success      200  {object}  successResponse
// @Failure      400  {object}  errorResponse
// @Router       /users/addresses/{id} [delete]
func (s *Service) DeleteAddress(c *gin.Context) {
	aliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid address id")
		return
	}

	userInternalID := mustUserInternalID(c)
	if err := s.pg.DeleteAddress(c.Request.Context(), userInternalID, aliasID); err != nil {
		s.logger.Error("delete address", zap.Error(err))
		respondInternalError(c, "could not delete address")
		return
	}

	respondOK(c, gin.H{"message": "address deleted successfully"})
}

// SetDefaultAddress marks an address as the default for the user.
//
// @Summary      Set default address
// @Description  Set an existing address as the default delivery address
// @Tags         addresses
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Address AliasID (UUID)"
// @Success      200  {object}  successResponse
// @Failure      400  {object}  errorResponse
// @Failure      404  {object}  errorResponse
// @Router       /users/addresses/{id}/default [patch]
func (s *Service) SetDefaultAddress(c *gin.Context) {
	aliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid address id")
		return
	}

	userInternalID := mustUserInternalID(c)
	addr, err := s.pg.GetAddressByAliasID(c.Request.Context(), aliasID)
	if err != nil || addr == nil || addr.UserID != userInternalID {
		respondNotFound(c, "address not found")
		return
	}

	if err := s.pg.SetDefault(c.Request.Context(), userInternalID, addr.AliasID); err != nil {
		s.logger.Error("set default address", zap.Error(err))
		respondInternalError(c, "could not set default address")
		return
	}

	respondOK(c, gin.H{"message": "default address updated successfully"})
}
