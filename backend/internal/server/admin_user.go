package server

import (
	"bookstore/backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AdminListUsers handles GET /api/v1/admin/users.
//
// @Summary      Admin: List users
// @Description  Return a paginated list of all registered users
// @Tags         admin-users
// @Security     BearerAuth
// @Produce      json
// @Param        page       query     int  false  "Page number"
// @Param        page_size  query     int  false  "Items per page"
// @Success      200        {object}  domain.UserListResponse
// @Router       /admin/users [get]
func (s *Service) AdminListUsers(c *gin.Context) {
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 20)

	users, total, err := s.pg.ListUsers(c.Request.Context(), page, pageSize)
	if err != nil {
		s.logger.Error("admin list users", zap.Error(err))
		respondInternalError(c, "could not list users")
		return
	}

	infos := make([]*domain.UserInfo, 0, len(users))
	for _, u := range users {
		info := toUserInfo(u)
		infos = append(infos, &info)
	}

	respondPaginated(c, infos, total, page, pageSize)
}

// AdminGetUser handles GET /api/v1/admin/users/:id.
// The :id parameter is the user's alias_id UUID.
//
// @Summary      Admin: Get user
// @Description  Return profile data for any user
// @Tags         admin-users
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "User Alias ID (UUID)"
// @Success      200  {object}  domain.UserInfo
// @Router       /admin/users/{id} [get]
func (s *Service) AdminGetUser(c *gin.Context) {
	userAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid user id")
		return
	}

	user, err := s.pg.GetUserByAliasID(c.Request.Context(), userAliasID)
	if err != nil || user == nil {
		respondNotFound(c, "user not found")
		return
	}

	respondOK(c, toUserInfo(user))
}

// AdminDeactivateUser handles PATCH /api/v1/admin/users/:id/deactivate.
// The :id parameter is the user's alias_id UUID.
// Toggles is_active; body: {"is_active": false} to deactivate, true to reactivate.
//
// @Summary      Admin: Deactivate user
// @Description  Toggle the is_active flag for a user account
// @Tags         admin-users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                         true  "User Alias ID (UUID)"
// @Param        body  body      domain.DeactivateUserRequest  true  "Activation status"
// @Success      200   {object}  successResponse
// @Router       /admin/users/{id}/deactivate [patch]
func (s *Service) AdminDeactivateUser(c *gin.Context) {
	userAliasID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid user id")
		return
	}

	var req domain.DeactivateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	if err := s.pg.DeactivateUser(c.Request.Context(), userAliasID, req.IsActive); err != nil {
		s.logger.Error("deactivate user", zap.Error(err))
		respondInternalError(c, "could not update user status")
		return
	}

	respondOK(c, gin.H{"is_active": req.IsActive})
}

// AdminGetBestSellers handles GET /api/v1/admin/analytics/best-sellers.
//
// @Summary      Admin: Best sellers analytics
// @Description  Return sales ranking data from Redis
// @Tags         admin-analytics
// @Security     BearerAuth
// @Produce      json
// @Param        limit  query     int  false  "Number of books"
// @Success      200    {array}   domain.BestSellerBook
// @Router       /admin/analytics/best-sellers [get]
func (s *Service) AdminGetBestSellers(c *gin.Context) {
	if !s.features.RedisBestSellers {
		respondOK(c, []any{})
		return
	}
	n := queryInt(c, "limit", 10)
	books, err := s.bestSellerRepo.GetTopBestSellers(c.Request.Context(), n)
	if err != nil {
		s.logger.Error("admin get best sellers", zap.Error(err))
		respondInternalError(c, "could not fetch best sellers data")
		return
	}
	respondOK(c, s.enrichBestSellerBooks(c.Request.Context(), books))
}

// AdminGetSales handles GET /api/v1/admin/analytics/sales?from=&to=.
//
// @Summary      Admin: Sales summary
// @Description  Return total revenue and order count for a date range
// @Tags         admin-analytics
// @Security     BearerAuth
// @Produce      json
// @Param        from  query     string  true  "Start date (YYYY-MM-DD)"
// @Param        to    query     string  true  "End date (YYYY-MM-DD)"
// @Success      200   {object}  domain.SalesSummary
// @Router       /admin/analytics/sales [get]
func (s *Service) AdminGetSales(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")

	if from == "" || to == "" {
		respondBadRequest(c, "query params 'from' and 'to' (YYYY-MM-DD) are required")
		return
	}

	totalOrders, totalRevenue, err := s.pg.GetSalesSummary(c.Request.Context(), from, to)
	if err != nil {
		s.logger.Error("admin get sales summary", zap.Error(err))
		respondInternalError(c, "could not compute sales data")
		return
	}

	respondOK(c, domain.SalesSummary{
		TotalOrders:  totalOrders,
		TotalRevenue: totalRevenue,
		DateFrom:     from,
		DateTo:       to,
	})
}
