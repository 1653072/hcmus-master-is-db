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
	orderHistoryPrefix = "users:orders:" // users:orders:{userID}:{page}:{pageSize}
	orderHistoryTTL    = 30 * time.Minute
)

// orderHistoryPayload is the serialised value stored for each cache entry.
type orderHistoryPayload struct {
	Orders []*domain.Order `json:"orders"`
	Total  int64           `json:"total"`
}

// OrderCacheRepository implements domain.OrderCacheRepository using Redis Strings.
type OrderCacheRepository struct {
	rdb *client
}

// NewOrderCacheRepository creates an OrderCacheRepository.
func NewOrderCacheRepository(rdb *redis.Client) *OrderCacheRepository {
	return &OrderCacheRepository{rdb: rdb}
}

func orderHistoryKey(userID string, page, pageSize int) string {
	return fmt.Sprintf("%s%s:%d:%d", orderHistoryPrefix, userID, page, pageSize)
}

// SetOrderHistory caches a paginated order history response.
func (r *OrderCacheRepository) SetOrderHistory(
	ctx context.Context,
	userID string, page, pageSize int,
	orders []*domain.Order, total int64,
) error {
	payload := orderHistoryPayload{Orders: orders, Total: total}
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal order history: %w", err)
	}
	key := orderHistoryKey(userID, page, pageSize)
	return r.rdb.Set(ctx, key, redisutil.Encode(data), orderHistoryTTL).Err()
}

// GetOrderHistory retrieves a cached order history page. Third return is true on a hit.
func (r *OrderCacheRepository) GetOrderHistory(
	ctx context.Context,
	userID string, page, pageSize int,
) ([]*domain.Order, int64, bool, error) {
	raw, err := r.rdb.Get(ctx, orderHistoryKey(userID, page, pageSize)).Bytes()
	if err == redis.Nil {
		return nil, 0, false, nil
	}
	if err != nil {
		return nil, 0, false, fmt.Errorf("get order history cache: %w", err)
	}
	decoded, decErr := redisutil.Decode(raw)
	if decErr != nil {
		return nil, 0, false, decErr
	}
	var payload orderHistoryPayload
	if err := json.Unmarshal(decoded, &payload); err != nil {
		return nil, 0, false, fmt.Errorf("unmarshal order history: %w", err)
	}
	return payload.Orders, payload.Total, true, nil
}

// InvalidateOrderHistory deletes all cached pages for a user using SCAN + DEL.
func (r *OrderCacheRepository) InvalidateOrderHistory(ctx context.Context, userID string) error {
	pattern := orderHistoryPrefix + userID + ":*"
	var cursor uint64
	for {
		keys, next, err := r.rdb.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("scan order history keys: %w", err)
		}
		if len(keys) > 0 {
			if err := r.rdb.Del(ctx, keys...).Err(); err != nil {
				return fmt.Errorf("del order history keys: %w", err)
			}
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return nil
}
