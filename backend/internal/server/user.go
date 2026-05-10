package server

import (
	"bookstore/backend/internal/domain"
	"bookstore/backend/internal/middleware"
	"bookstore/backend/utils/password"
	"bookstore/backend/utils/token"
	"bookstore/backend/utils/validator"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Register creates a new customer account (NV-A1).
//
// @Summary      Register
// @Description  Create a new customer account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.RegisterRequest  true  "Registration payload"
// @Success      201   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Failure      409   {object}  errorResponse
// @Router       /auth/register [post]
func (s *Service) Register(c *gin.Context) {
	var req domain.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	if !validator.IsValidPhone(req.Phone) {
		respondError(c, http.StatusBadRequest, "invalid phone number format")
		return
	}

	ctx := c.Request.Context()

	existing, _ := s.pg.GetUserByEmail(ctx, req.Email)
	if existing != nil {
		respondError(c, http.StatusConflict, "email already registered")
		return
	}

	hash, err := password.HashPassword(req.Password)
	if err != nil {
		s.logger.Error("hash password", zap.Error(err))
		respondInternalError(c, "could not create account")
		return
	}

	user := &domain.User{
		FullName:     req.FullName,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: hash,
		Role:         domain.RoleUser,
		IsActive:     true,
	}

	if err := s.pg.CreateUser(ctx, user); err != nil {
		s.logger.Error("create user", zap.Error(err))
		respondInternalError(c, "could not create account")
		return
	}

	respondCreated(c, toUserInfo(user))
}

// Login authenticates a user and returns a JWT (NV-A2).
//
// @Summary      Login
// @Description  Authenticate and receive a JWT access token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.LoginRequest   true  "Login credentials"
// @Success      200   {object}  successResponse
// @Failure      401   {object}  errorResponse
// @Router       /auth/login [post]
func (s *Service) Login(c *gin.Context) {
	var req domain.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()

	user, err := s.pg.GetUserByEmail(ctx, req.Email)
	if err != nil || user == nil {
		respondUnauthorized(c, "invalid email or password")
		return
	}

	if !user.IsActive {
		respondForbidden(c, "account has been deactivated")
		return
	}

	if err := password.CheckPassword(req.Password, user.PasswordHash); err != nil {
		respondUnauthorized(c, "invalid email or password")
		return
	}

	accessToken, err := s.generateToken(user)
	if err != nil {
		s.logger.Error("generate token", zap.Error(err))
		respondInternalError(c, "could not generate token")
		return
	}

	respondOK(c, domain.LoginResponse{
		AccessToken: accessToken,
		User:        toUserInfo(user),
	})
}

// Logout revokes the caller's JWT (NV-A3).
//
// @Summary      Logout
// @Description  Revoke the current JWT token
// @Tags         auth
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  successResponse
// @Router       /auth/logout [post]
func (s *Service) Logout(c *gin.Context) {
	rawToken, _ := c.Get(middleware.CtxToken)
	tokenStr, _ := rawToken.(string)

	if tokenStr != "" {
		if err := s.sessionRepo.BlacklistToken(c.Request.Context(), tokenStr); err != nil {
			s.logger.Warn("blacklist token", zap.Error(err))
		}
	}

	respondOK(c, gin.H{"message": "logged out successfully"})
}

// GetProfile returns the authenticated user's profile (NV-A4).
//
// @Summary      Get profile
// @Description  Return the current user's profile
// @Tags         users
// @Security     BearerAuth
// @Produce      json
// @Success      200  {object}  successResponse
// @Failure      404  {object}  errorResponse
// @Router       /users/me [get]
func (s *Service) GetProfile(c *gin.Context) {
	userInternalID := mustUserInternalID(c)
	user, err := s.pg.GetUserByID(c.Request.Context(), userInternalID)
	if err != nil || user == nil {
		respondNotFound(c, "user not found")
		return
	}
	respondOK(c, toUserInfo(user))
}

// UpdateProfile saves changes to name, phone, and default address (NV-A4).
//
// @Summary      Update profile
// @Description  Update the current user's profile fields
// @Tags         users
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.UpdateProfileRequest  true  "Profile update"
// @Success      200   {object}  successResponse
// @Failure      400   {object}  errorResponse
// @Router       /users/me [put]
func (s *Service) UpdateProfile(c *gin.Context) {
	var req domain.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	userInternalID := mustUserInternalID(c)
	ctx := c.Request.Context()

	user, err := s.pg.GetUserByID(ctx, userInternalID)
	if err != nil || user == nil {
		respondNotFound(c, "user not found")
		return
	}

	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Phone != "" {
		if !validator.IsValidPhone(req.Phone) {
			respondError(c, http.StatusBadRequest, "invalid phone number format")
			return
		}
		user.Phone = req.Phone
	}
	if req.DefaultAddr != "" {
		user.DefaultAddr = req.DefaultAddr
	}

	if err := s.pg.UpdateUser(ctx, user); err != nil {
		s.logger.Error("update user", zap.Error(err))
		respondInternalError(c, "could not update profile")
		return
	}

	respondOK(c, toUserInfo(user))
}

// ─── helpers ──────────────────────────────────────────────────────────────────

func toUserInfo(u *domain.User) domain.UserInfo {
	return domain.UserInfo{
		AliasID:  u.AliasID,
		FullName: u.FullName,
		Email:    u.Email,
		Phone:    u.Phone,
		Role:     u.Role,
	}
}

// mustUserAliasID returns the authenticated user's external UUID alias from the
// Gin context. Used for Redis cache keys and external identifiers in responses.
func mustUserAliasID(c *gin.Context) uuid.UUID {
	raw, _ := c.Get(middleware.CtxUserAliasID)
	id, _ := uuid.Parse(raw.(string))
	return id
}

// mustUserInternalID returns the authenticated user's internal BIGSERIAL int64
// from the Gin context. Used exclusively for PostgreSQL FK operations.
func mustUserInternalID(c *gin.Context) int64 {
	raw, _ := c.Get(middleware.CtxUserInternalID)
	id, _ := raw.(int64)
	return id
}

func (s *Service) generateToken(user *domain.User) (string, error) {
	return token.GenerateToken(user.AliasID, user.ID, user.Email, user.Role, s.jwtCfg)
}
