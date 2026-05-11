package redis

import (
	"bookstore/backend/internal/domain"
	redisutil "bookstore/backend/utils/redis"
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	bookDetailPrefix = "books:details:" // books:details:{bookID}
	bookNewestKey    = "books:newest"   // books:newest
	bookStockPrefix  = "books:stocks:"  // books:stocks:{bookID}

	bookDetailTTL = 60 * time.Minute
	bookStockTTL  = 30 * time.Minute
	bookNewestTTL = 60 * time.Minute
)

// BookCacheRepository implements domain.BookCacheRepository using Redis Strings.
type BookCacheRepository struct {
	rdb *client
}

// NewBookCacheRepository creates a BookCacheRepository.
func NewBookCacheRepository(rdb *redis.Client) *BookCacheRepository {
	return &BookCacheRepository{rdb: rdb}
}

// SetDetail caches a BookDetail (Snappy-compressed JSON).
func (r *BookCacheRepository) SetDetail(ctx context.Context, bookID string, book *domain.BookDetail) error {
	data, err := json.Marshal(book)
	if err != nil {
		return fmt.Errorf("marshal book detail: %w", err)
	}
	return r.rdb.Set(ctx, bookDetailPrefix+bookID, redisutil.Encode(data), bookDetailTTL).Err()
}

// GetDetail retrieves a cached BookDetail. Second return value is true on a hit.
func (r *BookCacheRepository) GetDetail(ctx context.Context, bookID string) (*domain.BookDetail, bool, error) {
	raw, err := r.rdb.Get(ctx, bookDetailPrefix+bookID).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("get book detail cache: %w", err)
	}
	decoded, err := redisutil.Decode(raw)
	if err != nil {
		return nil, false, err
	}
	var book domain.BookDetail
	if err := json.Unmarshal(decoded, &book); err != nil {
		return nil, false, fmt.Errorf("unmarshal book detail: %w", err)
	}
	return &book, true, nil
}

// SetNewest caches the newest books list.
func (r *BookCacheRepository) SetNewest(ctx context.Context, books []*domain.Book) error {
	data, err := json.Marshal(books)
	if err != nil {
		return fmt.Errorf("marshal newest books: %w", err)
	}
	return r.rdb.Set(ctx, bookNewestKey, redisutil.Encode(data), bookNewestTTL).Err()
}

// GetNewest retrieves the cached newest books list. Second return is true on a hit.
func (r *BookCacheRepository) GetNewest(ctx context.Context) ([]*domain.Book, bool, error) {
	raw, err := r.rdb.Get(ctx, bookNewestKey).Bytes()
	if err == redis.Nil {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, fmt.Errorf("get newest cache: %w", err)
	}
	decoded, err := redisutil.Decode(raw)
	if err != nil {
		return nil, false, err
	}
	var books []*domain.Book
	if err := json.Unmarshal(decoded, &books); err != nil {
		return nil, false, fmt.Errorf("unmarshal newest books: %w", err)
	}
	return books, true, nil
}

// SetStock caches the stock quantity for a book as a plain integer string.
func (r *BookCacheRepository) SetStock(ctx context.Context, bookID string, qty int) error {
	return r.rdb.Set(ctx, bookStockPrefix+bookID, strconv.Itoa(qty), bookStockTTL).Err()
}

// GetStock retrieves the cached stock quantity. Second return is true on a hit.
func (r *BookCacheRepository) GetStock(ctx context.Context, bookID string) (int, bool, error) {
	val, err := r.rdb.Get(ctx, bookStockPrefix+bookID).Result()
	if err == redis.Nil {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, fmt.Errorf("get stock cache: %w", err)
	}
	qty, err := strconv.Atoi(val)
	if err != nil {
		return 0, false, fmt.Errorf("parse stock cache: %w", err)
	}
	return qty, true, nil
}
