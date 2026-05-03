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
	categoryListPrefix = "books:categories:" // books:categories:{page}:{pageSize}
	categoryListTTL    = 30 * time.Minute
)

// categoryListPayload is the serialised value stored for each cache entry.
type categoryListPayload struct {
	Cats  []*domain.Category `json:"cats"`
	Total int64              `json:"total"`
}

// CategoryCacheRepository implements domain.CategoryCacheRepository using Redis Strings.
type CategoryCacheRepository struct {
	rdb *client
}

// NewCategoryCacheRepository creates a CategoryCacheRepository.
func NewCategoryCacheRepository(rdb *redis.Client) *CategoryCacheRepository {
	return &CategoryCacheRepository{rdb: rdb}
}

func categoryListKey(page, pageSize int) string {
	return fmt.Sprintf("%s%d:%d", categoryListPrefix, page, pageSize)
}

// SetCategoryList caches a paginated category list response.
func (r *CategoryCacheRepository) SetCategoryList(
	ctx context.Context,
	page, pageSize int,
	cats []*domain.Category, total int64,
) error {
	payload := categoryListPayload{Cats: cats, Total: total}
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal category list: %w", err)
	}
	return r.rdb.Set(ctx, categoryListKey(page, pageSize), redisutil.Encode(data), categoryListTTL).Err()
}

// GetCategoryList retrieves a cached category list page. Third return is true on a hit.
func (r *CategoryCacheRepository) GetCategoryList(
	ctx context.Context,
	page, pageSize int,
) ([]*domain.Category, int64, bool, error) {
	raw, err := r.rdb.Get(ctx, categoryListKey(page, pageSize)).Bytes()
	if err == redis.Nil {
		return nil, 0, false, nil
	}
	if err != nil {
		return nil, 0, false, fmt.Errorf("get category list cache: %w", err)
	}
	decoded, decErr := redisutil.Decode(raw)
	if decErr != nil {
		return nil, 0, false, decErr
	}
	var payload categoryListPayload
	if err := json.Unmarshal(decoded, &payload); err != nil {
		return nil, 0, false, fmt.Errorf("unmarshal category list: %w", err)
	}
	return payload.Cats, payload.Total, true, nil
}

// InvalidateCategoryList deletes all cached category pages using SCAN + DEL.
func (r *CategoryCacheRepository) InvalidateCategoryList(ctx context.Context) error {
	pattern := categoryListPrefix + "*"
	var cursor uint64
	for {
		keys, next, err := r.rdb.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return fmt.Errorf("scan category keys: %w", err)
		}
		if len(keys) > 0 {
			if err := r.rdb.Del(ctx, keys...).Err(); err != nil {
				return fmt.Errorf("del category keys: %w", err)
			}
		}
		cursor = next
		if cursor == 0 {
			break
		}
	}
	return nil
}
