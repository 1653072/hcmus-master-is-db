package server

import (
	"bookstore/backend/internal/domain"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// AdminListUsers handles GET /api/v1/admin/users.
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
func (s *Service) AdminGetUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid user id")
		return
	}

	user, err := s.pg.GetUserByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		respondNotFound(c, "user not found")
		return
	}

	respondOK(c, toUserInfo(user))
}

// AdminDeactivateUser handles PATCH /api/v1/admin/users/:id/deactivate.
// Toggles is_active; body: {"is_active": false} to deactivate, true to reactivate.
func (s *Service) AdminDeactivateUser(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		respondBadRequest(c, "invalid user id")
		return
	}

	var req domain.DeactivateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	if err := s.pg.DeactivateUser(c.Request.Context(), userID, req.IsActive); err != nil {
		s.logger.Error("deactivate user", zap.Error(err))
		respondInternalError(c, "could not update user status")
		return
	}

	respondOK(c, gin.H{"is_active": req.IsActive})
}

// AdminGetTrending handles GET /api/v1/admin/analytics/trending.
func (s *Service) AdminGetTrending(c *gin.Context) {
	n := queryInt(c, "limit", 10)
	books, err := s.trendRepo.GetTop(c.Request.Context(), n)
	if err != nil {
		s.logger.Error("admin get trending", zap.Error(err))
		respondInternalError(c, "could not fetch trending data")
		return
	}
	respondOK(c, books)
}

// AdminGetSales handles GET /api/v1/admin/analytics/sales?from=&to=.
func (s *Service) AdminGetSales(c *gin.Context) {
	from := c.Query("from")
	to := c.Query("to")

	if from == "" || to == "" {
		respondBadRequest(c, "query params 'from' and 'to' (YYYY-MM-DD) are required")
		return
	}

	// Count completed/non-cancelled orders in date range via PostgreSQL
	orders, _, err := s.pg.ListAllOrders(c.Request.Context(), "", 1, 10000)
	if err != nil {
		s.logger.Error("admin get sales", zap.Error(err))
		respondInternalError(c, "could not compute sales data")
		return
	}

	var totalRevenue float64
	var totalOrders int64
	for _, o := range orders {
		if o.Status == domain.OrderStatusCancelled {
			continue
		}
		totalRevenue += o.TotalAmount
		totalOrders++
	}

	respondOK(c, domain.SalesSummary{
		TotalOrders:  totalOrders,
		TotalRevenue: totalRevenue,
		DateFrom:     from,
		DateTo:       to,
	})
}
