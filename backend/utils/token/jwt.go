package token

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/domain"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Claims is the JWT payload.
//
// Both the external alias_id UUID and the internal int64 user ID are embedded so
// that middleware can (a) expose the safe UUID to callers and (b) perform
// PostgreSQL operations by integer PK — all without an extra database lookup per
// request.  Role is embedded so authorisation decisions can be made without a
// round-trip to the database.
type Claims struct {
	// UserAliasID is the external UUID alias returned in all API responses.
	// It is safe to share with frontend clients.
	UserAliasID string `json:"alias_id"`
	// UserInternalID is the BIGSERIAL primary key used for PostgreSQL FK operations.
	// It is never sent to frontend clients; it only travels inside the signed JWT.
	UserInternalID int64           `json:"uid"`
	Email          string          `json:"email"`
	Role           domain.UserRole `json:"role"`
	jwt.RegisteredClaims
}

// GenerateToken mints a signed JWT for the given user.
func GenerateToken(aliasID uuid.UUID, internalID int64, email string, role domain.UserRole, cfg config.JWTConfig) (string, error) {
	now := time.Now()
	claims := Claims{
		UserAliasID:    aliasID.String(),
		UserInternalID: internalID,
		Email:          email,
		Role:           role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(cfg.AccessTTL)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.Secret))
}

// ParseToken validates a JWT string and returns its claims.
// Returns an error if the token is malformed, expired, or has an invalid signature.
func ParseToken(tokenStr string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
