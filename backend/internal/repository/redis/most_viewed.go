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
	// mostViewedDailyCountKey is the Redis sorted set that accumulates ZINCRBY view
	// increments throughout the current day.
	// TTL is set to 24 hours so the key expires at the same cadence as the daily reset.
	// If the worker fails, the key simply expires and new view events recreate it from zero.
	mostViewedDailyCountKey = "books:most_viewed:daily:count"

	// mostViewedDailyDataKey stores a Snappy-compressed JSON array of the enriched
	// top-N most-viewed books for the current day (with book titles from MongoDB).
	// It is refreshed on demand by the API handler whenever the live count set
	// diverges from the cached ranking.
	mostViewedDailyDataKey = "books:most_viewed:daily:data"

	// mostViewed30DaysDataKey stores the pre-computed 30-day top-N data,
	// aggregated from MongoDB view_event_logs and refreshed nightly by MostViewedWorker.
	mostViewed30DaysDataKey = "books:most_viewed:30d:data"

	// mostViewedDailyCountSetTTL is the TTL on the daily count sorted set.
	// 24 hours matches the natural daily reset cadence. If the worker fails,
	// the key expires on its own and new view events simply recreate it from zero.
	mostViewedDailyCountSetTTL = 24 * time.Hour

	mostViewedDailyDataTTL  = 24 * time.Hour
	mostViewed30DaysDataTTL = 24 * time.Hour
)

// MostViewedRepository implements domain.MostViewedRepository using Redis.
type MostViewedRepository struct {
	rdb *client
}

// NewMostViewedRepository creates a MostViewedRepository.
func NewMostViewedRepository(rdb *redis.Client) *MostViewedRepository {
	return &MostViewedRepository{rdb: rdb}
}

// IncrementDailyViewCount atomically increments the view counter for bookID in the
// daily count sorted set and sets a 25-hour TTL on first write of the day via EXPIRENV.
func (r *MostViewedRepository) IncrementDailyViewCount(ctx context.Context, bookID string) error {
	pipeline := r.rdb.Pipeline()
	pipeline.ZIncrBy(ctx, mostViewedDailyCountKey, 1, bookID)
	// EXPIRENV only sets the TTL when the key has no existing expiry,
	// so the clock is not reset on every view event.
	pipeline.ExpireNX(ctx, mostViewedDailyCountKey, mostViewedDailyCountSetTTL)
	_, err := pipeline.Exec(ctx)
	return err
}

// GetTopDailyViewedFromCountSet returns the top-N entries directly from the live daily count sorted set.
func (r *MostViewedRepository) GetTopDailyViewedFromCountSet(ctx context.Context, topN int) ([]domain.MostViewedBook, error) {
	if topN <= 0 {
		topN = domain.MostViewedTopN
	}
	entries, err := r.rdb.ZRevRangeWithScores(ctx, mostViewedDailyCountKey, 0, int64(topN-1)).Result()
	if err != nil {
		return nil, fmt.Errorf("get top daily viewed from count set: %w", err)
	}

	books := make([]domain.MostViewedBook, 0, len(entries))
	for _, entry := range entries {
		books = append(books, domain.MostViewedBook{
			BookID:    fmt.Sprint(entry.Member),
			ViewCount: entry.Score,
		})
	}
	return books, nil
}

// ResetDailyViewCountSet deletes both the daily count sorted set and the daily data cache.
// Called by MostViewedWorker at 00:00 UTC so the new day starts from zero.
func (r *MostViewedRepository) ResetDailyViewCountSet(ctx context.Context) error {
	return r.rdb.Del(ctx, mostViewedDailyCountKey, mostViewedDailyDataKey).Err()
}

// SetDailyTopViewedData stores the enriched top-N JSON in the daily data cache (TTL 1 day).
func (r *MostViewedRepository) SetDailyTopViewedData(ctx context.Context, books []domain.MostViewedBook) error {
	data, err := json.Marshal(books)
	if err != nil {
		return fmt.Errorf("marshal most viewed daily data: %w", err)
	}
	return r.rdb.Set(ctx, mostViewedDailyDataKey, redisutil.Encode(data), mostViewedDailyDataTTL).Err()
}

// GetDailyTopViewedData retrieves the cached daily top-N enriched data.
// The second return value is true on a cache hit.
func (r *MostViewedRepository) GetDailyTopViewedData(ctx context.Context) ([]domain.MostViewedBook, bool, error) {
	raw, err := r.rdb.Get(ctx, mostViewedDailyDataKey).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("get most viewed daily data cache: %w", err)
	}
	decoded, decodeErr := redisutil.Decode(raw)
	if decodeErr != nil {
		return nil, false, decodeErr
	}
	var books []domain.MostViewedBook
	if err := json.Unmarshal(decoded, &books); err != nil {
		return nil, false, fmt.Errorf("unmarshal most viewed daily data: %w", err)
	}
	return books, true, nil
}

// Set30DaysTopViewedData stores the pre-computed 30-day top-N JSON (TTL 1 day).
// Written by MostViewedWorker during its nightly run.
func (r *MostViewedRepository) Set30DaysTopViewedData(ctx context.Context, books []domain.MostViewedBook) error {
	data, err := json.Marshal(books)
	if err != nil {
		return fmt.Errorf("marshal most viewed 30 days data: %w", err)
	}
	return r.rdb.Set(ctx, mostViewed30DaysDataKey, redisutil.Encode(data), mostViewed30DaysDataTTL).Err()
}

// Get30DaysTopViewedData retrieves the cached 30-day top-N data.
// The second return value is true on a cache hit.
func (r *MostViewedRepository) Get30DaysTopViewedData(ctx context.Context) ([]domain.MostViewedBook, bool, error) {
	raw, err := r.rdb.Get(ctx, mostViewed30DaysDataKey).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("get most viewed 30 days data cache: %w", err)
	}
	decoded, decodeErr := redisutil.Decode(raw)
	if decodeErr != nil {
		return nil, false, decodeErr
	}
	var books []domain.MostViewedBook
	if err := json.Unmarshal(decoded, &books); err != nil {
		return nil, false, fmt.Errorf("unmarshal most viewed 30 days data: %w", err)
	}
	return books, true, nil
}
