package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	redisutil "bookstore/backend/utils/redis"

	"github.com/redis/go-redis/v9"
)

const (
	sessionPrefix   = "users:current_sessions:"  // users:current_sessions:{userID} → token
	blacklistPrefix = "users:blacklist_sessions:" // users:blacklist_sessions:{userID} → "1"
	sessionTTL      = 7 * 24 * time.Hour
	blacklistTTL    = 3 * 24 * time.Hour
)

// SessionRepository implements domain.SessionRepository against Redis.
type SessionRepository struct {
	rdb *client
}

// NewSessionRepository creates a SessionRepository.
func NewSessionRepository(rdb *redis.Client) *SessionRepository {
	return &SessionRepository{rdb: rdb}
}

// SetToken stores the JWT token for a user, Snappy-compressed, with a 7-day TTL.
func (r *SessionRepository) SetToken(ctx context.Context, userID string, token string) error {
	data, err := json.Marshal(token)
	if err != nil {
		return fmt.Errorf("marshal token: %w", err)
	}
	key := sessionPrefix + userID
	return r.rdb.Set(ctx, key, redisutil.Encode(data), sessionTTL).Err()
}

// GetToken retrieves the active token for a user.
func (r *SessionRepository) GetToken(ctx context.Context, userID string) (string, error) {
	key := sessionPrefix + userID
	raw, err := r.rdb.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("get token: %w", err)
	}
	decoded, err := redisutil.Decode(raw)
	if err != nil {
		return "", err
	}
	var token string
	if err := json.Unmarshal(decoded, &token); err != nil {
		return "", fmt.Errorf("unmarshal token: %w", err)
	}
	return token, nil
}

// BlacklistToken adds a token to the blacklist with a 3-day TTL.
func (r *SessionRepository) BlacklistToken(ctx context.Context, token string) error {
	key := blacklistPrefix + token
	return r.rdb.Set(ctx, key, redisutil.Encode([]byte("1")), blacklistTTL).Err()
}

// IsBlacklisted returns true if the given token has been revoked.
func (r *SessionRepository) IsBlacklisted(ctx context.Context, token string) (bool, error) {
	key := blacklistPrefix + token
	val, err := r.rdb.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return val > 0, nil
}
