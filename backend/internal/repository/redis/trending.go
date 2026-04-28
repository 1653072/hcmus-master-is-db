package redis

import (
	"bookstore/backend/internal/domain"
	redisutil "bookstore/backend/utils/redis"
	"context"
	"encoding/json"
	"fmt"

	"github.com/redis/go-redis/v9"
)

const (
	trendingZSet     = "books:trendings"       // ZSET: member=bookID, score=sales count
	trendingCacheKey = "books:trendings:cache"  // STRING: Snappy-compressed JSON array
)

// TrendingRepository implements domain.TrendingRepository using Redis Sorted Sets.
type TrendingRepository struct {
	rdb *client
}

// NewTrendingRepository creates a TrendingRepository.
func NewTrendingRepository(rdb *redis.Client) *TrendingRepository {
	return &TrendingRepository{rdb: rdb}
}

// IncrScore increments the sales score for a book by delta.
func (r *TrendingRepository) IncrScore(ctx context.Context, bookID string, delta float64) error {
	return r.rdb.ZIncrBy(ctx, trendingZSet, delta, bookID).Err()
}

// GetTop returns the top-N books from the pre-computed cache key.
// Falls back to computing directly from the ZSET if the cache is empty.
func (r *TrendingRepository) GetTop(ctx context.Context, n int) ([]domain.TrendingBook, error) {
	raw, err := r.rdb.Get(ctx, trendingCacheKey).Bytes()
	if err == nil {
		decoded, decErr := redisutil.Decode(raw)
		if decErr == nil {
			var books []domain.TrendingBook
			if jsonErr := json.Unmarshal(decoded, &books); jsonErr == nil {
				return books, nil
			}
		}
	}
	return r.computeTop(ctx, n)
}

// SetTop stores the pre-computed top-N list in the cache (for the background worker).
func (r *TrendingRepository) SetTop(ctx context.Context, books []domain.TrendingBook) error {
	data, err := json.Marshal(books)
	if err != nil {
		return fmt.Errorf("marshal trending: %w", err)
	}
	return r.rdb.Set(ctx, trendingCacheKey, redisutil.Encode(data), 0).Err()
}

// computeTop reads directly from the ZSET sorted by score descending.
func (r *TrendingRepository) computeTop(ctx context.Context, n int) ([]domain.TrendingBook, error) {
	if n <= 0 {
		n = domain.TrendingTopN
	}
	entries, err := r.rdb.ZRevRangeWithScores(ctx, trendingZSet, 0, int64(n-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("zrevrange trending: %w", err)
	}

	books := make([]domain.TrendingBook, 0, len(entries))
	for _, z := range entries {
		books = append(books, domain.TrendingBook{
			BookID: fmt.Sprint(z.Member),
			Score:  z.Score,
		})
	}
	return books, nil
}
