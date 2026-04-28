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
	cartKeyPrefix = "users:carts:" // users:carts:{userID} → Snappy-compressed JSON array
	cartTTL       = 3 * 24 * time.Hour
)

// CartCacheRepository implements domain.CartCacheRepository using Redis Strings.
// The source of truth for cart state is PostgreSQL; this is only a read cache.
type CartCacheRepository struct {
	rdb *client
}

// NewCartCacheRepository creates a CartCacheRepository.
func NewCartCacheRepository(rdb *redis.Client) *CartCacheRepository {
	return &CartCacheRepository{rdb: rdb}
}

func cartCacheKey(userID string) string { return cartKeyPrefix + userID }

// SetCart serializes the cart items as JSON, compresses with Snappy, and stores in Redis.
func (r *CartCacheRepository) SetCart(ctx context.Context, userID string, items []domain.CartItem) error {
	data, err := json.Marshal(items)
	if err != nil {
		return fmt.Errorf("marshal cart: %w", err)
	}
	return r.rdb.Set(ctx, cartCacheKey(userID), redisutil.Encode(data), cartTTL).Err()
}

// GetCart returns the cached cart. The second return value is true on a cache hit.
func (r *CartCacheRepository) GetCart(ctx context.Context, userID string) ([]domain.CartItem, bool, error) {
	raw, err := r.rdb.Get(ctx, cartCacheKey(userID)).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("get cart cache: %w", err)
	}
	decoded, err := redisutil.Decode(raw)
	if err != nil {
		return nil, false, err
	}
	var items []domain.CartItem
	if err := json.Unmarshal(decoded, &items); err != nil {
		return nil, false, fmt.Errorf("unmarshal cart: %w", err)
	}
	return items, true, nil
}

// InvalidateCart removes the cached cart for a user.
func (r *CartCacheRepository) InvalidateCart(ctx context.Context, userID string) error {
	return r.rdb.Del(ctx, cartCacheKey(userID)).Err()
}
