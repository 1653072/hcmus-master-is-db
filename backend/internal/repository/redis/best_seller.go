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
	// bestSellerCacheKey holds a Snappy-compressed JSON array of BestSellerBook entries.
	// It is a plain Redis STRING key (no sorted set) refreshed daily by BestSellerWorker.
	bestSellerCacheKey = "books:best_sellers"

	bestSellerCacheTTL = 24 * time.Hour
)

// BestSellerRepository implements domain.BestSellerRepository using Redis.
// Data is stored exclusively as a JSON string (no sorted set);
// the daily aggregate is computed from PostgreSQL by BestSellerWorker.
type BestSellerRepository struct {
	rdb *client
}

// NewBestSellerRepository creates a BestSellerRepository.
func NewBestSellerRepository(rdb *redis.Client) *BestSellerRepository {
	return &BestSellerRepository{rdb: rdb}
}

// GetTopBestSellers reads the pre-computed bestseller list from the cache.
// Returns an empty slice when the cache has not been populated yet.
func (r *BestSellerRepository) GetTopBestSellers(ctx context.Context, topN int) ([]domain.BestSellerBook, error) {
	raw, err := r.rdb.Get(ctx, bestSellerCacheKey).Bytes()
	if err == redis.Nil {
		return []domain.BestSellerBook{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get best sellers cache: %w", err)
	}

	decoded, decodeErr := redisutil.Decode(raw)
	if decodeErr != nil {
		return nil, decodeErr
	}

	var books []domain.BestSellerBook
	if jsonErr := json.Unmarshal(decoded, &books); jsonErr != nil {
		return nil, fmt.Errorf("unmarshal best sellers: %w", jsonErr)
	}

	if topN > 0 && topN < len(books) {
		books = books[:topN]
	}
	return books, nil
}

// SetTopBestSellers stores the pre-computed bestseller list with a 1-day TTL.
// Called exclusively by BestSellerWorker at 17:00 UTC (00:00 GMT+7).
func (r *BestSellerRepository) SetTopBestSellers(ctx context.Context, books []domain.BestSellerBook) error {
	data, err := json.Marshal(books)
	if err != nil {
		return fmt.Errorf("marshal best sellers: %w", err)
	}
	return r.rdb.Set(ctx, bestSellerCacheKey, redisutil.Encode(data), bestSellerCacheTTL).Err()
}
