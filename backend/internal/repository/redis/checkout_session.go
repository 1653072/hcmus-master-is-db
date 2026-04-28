package redis

import (
	"bookstore/backend/internal/domain"
	redisutil "bookstore/backend/utils/redis"
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	checkoutSessionPrefix = "users:checkouts:" // users:checkouts:{sessionID}
	checkoutSessionTTL    = 15 * time.Minute
)

// CheckoutSessionRepository implements domain.CheckoutSessionRepository.
// It stores temporary Buy-Now sessions in Redis with a 15-minute TTL.
type CheckoutSessionRepository struct {
	rdb *client
}

// NewCheckoutSessionRepository creates a CheckoutSessionRepository.
func NewCheckoutSessionRepository(rdb *redis.Client) *CheckoutSessionRepository {
	return &CheckoutSessionRepository{rdb: rdb}
}

func checkoutKey(sessionID string) string { return checkoutSessionPrefix + sessionID }

// CreateSession stores a BuyNowSession under the given sessionID.
func (r *CheckoutSessionRepository) CreateSession(ctx context.Context, sessionID string, session *domain.BuyNowSession) error {
	data, err := json.Marshal(session)
	if err != nil {
		return fmt.Errorf("marshal checkout session: %w", err)
	}
	return r.rdb.Set(ctx, checkoutKey(sessionID), redisutil.Encode(data), checkoutSessionTTL).Err()
}

// GetSession retrieves a BuyNowSession. Returns nil, nil if not found.
func (r *CheckoutSessionRepository) GetSession(ctx context.Context, sessionID string) (*domain.BuyNowSession, error) {
	raw, err := r.rdb.Get(ctx, checkoutKey(sessionID)).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get checkout session: %w", err)
	}
	decoded, err := redisutil.Decode(raw)
	if err != nil {
		return nil, err
	}
	var session domain.BuyNowSession
	if err := json.Unmarshal(decoded, &session); err != nil {
		return nil, fmt.Errorf("unmarshal checkout session: %w", err)
	}
	return &session, nil
}

// DeleteSession removes a checkout session after use.
func (r *CheckoutSessionRepository) DeleteSession(ctx context.Context, sessionID string) error {
	return r.rdb.Del(ctx, checkoutKey(sessionID)).Err()
}
