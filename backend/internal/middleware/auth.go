package middleware

import (
	"bookstore/backend/internal/domain"
	"bookstore/backend/utils/token"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RequireAuth validates the Bearer JWT, checks the Redis blacklist, and injects
// userID and role into the Gin context.  Both "user" and "admin" roles are accepted.
func RequireAuth(sessionRepo domain.SessionRepository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawToken := extractToken(c)
		if rawToken == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing or malformed Authorization header"})
			return
		}

		claims, err := token.ParseToken(rawToken, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		// Check Redis blacklist (populated on logout)
		blacklisted, err := sessionRepo.IsBlacklisted(c.Request.Context(), rawToken)
		if err != nil || blacklisted {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "token has been revoked"})
			return
		}

		c.Set(CtxUserAliasID, claims.UserAliasID)
		c.Set(CtxUserInternalID, claims.UserInternalID)
		c.Set(CtxUserRole, claims.Role)
		c.Set(CtxToken, rawToken)
		c.Next()
	}
}

// RequireUser enforces that the caller is a regular customer (role == "user").
// Admin accounts are explicitly blocked (403) from all shopping endpoints.
func RequireUser(sessionRepo domain.SessionRepository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		RequireAuth(sessionRepo, jwtSecret)(c)
		if c.IsAborted() {
			return
		}

		role, _ := c.Get(CtxUserRole)
		if role != domain.RoleUser {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin accounts cannot perform shopping actions"})
			return
		}
		c.Next()
	}
}

// RequireAdmin enforces that the caller has the "admin" role (403 for regular users).
func RequireAdmin(sessionRepo domain.SessionRepository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		RequireAuth(sessionRepo, jwtSecret)(c)
		if c.IsAborted() {
			return
		}

		role, _ := c.Get(CtxUserRole)
		if role != domain.RoleAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin access required"})
			return
		}
		c.Next()
	}
}

// extractToken strips the "Bearer " prefix from the Authorization header.
func extractToken(c *gin.Context) string {
	header := c.GetHeader(HeaderAuthorization)
	if !strings.HasPrefix(header, BearerPrefix) {
		return ""
	}
	return strings.TrimPrefix(header, BearerPrefix)
}
