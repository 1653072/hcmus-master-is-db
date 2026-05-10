package worker

import (
	"bookstore/backend/internal/domain"
	"context"
	"time"

	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// bestSellerQueryRow is the raw result of the PostgreSQL aggregate query
// used by BestSellerWorker.
type bestSellerQueryRow struct {
	MongoBookID string
	TotalSold   float64
}

// BestSellerWorker runs a daily cron job at 00:00 UTC that computes the top-N
// bestselling books over the past 30 days by querying PostgreSQL order_items,
// then stores the result as a JSON string in the Redis key "books:best_sellers"
// with a 1-day TTL (NV-E2).
//
// No Redis sorted set is used for best sellers — the authoritative data source
// is always the PostgreSQL order_items table.
type BestSellerWorker struct {
	postgresDatabase     *gorm.DB
	bestSellerRepository domain.BestSellerRepository
	bookRepository       domain.BookRepository
	logger               *zap.Logger
	cron                 *cron.Cron
}

// NewBestSellerWorker creates a BestSellerWorker.
func NewBestSellerWorker(postgresDatabase *gorm.DB, bestSellerRepository domain.BestSellerRepository, bookRepository domain.BookRepository, logger *zap.Logger) *BestSellerWorker {
	return &BestSellerWorker{
		postgresDatabase:     postgresDatabase,
		bestSellerRepository: bestSellerRepository,
		bookRepository:       bookRepository,
		logger:               logger,
		cron:                 cron.New(cron.WithLocation(time.UTC)),
	}
}

// Start registers the daily 00:00 UTC cron schedule, starts the scheduler,
// and fires an initial run immediately so Redis is pre-populated on startup.
func (w *BestSellerWorker) Start() {
	_, err := w.cron.AddFunc("0 0 * * *", func() {
		w.Run()
	})
	if err != nil {
		w.logger.Error("register best seller cron job", zap.Error(err))
		return
	}

	w.cron.Start()
	w.logger.Info("best seller worker started (daily 00:00 UTC)")

	go w.Run()
}

// Stop gracefully stops the cron scheduler.
func (w *BestSellerWorker) Stop() {
	cronStopContext := w.cron.Stop()
	<-cronStopContext.Done()
	w.logger.Info("best seller worker stopped")
}

// Run aggregates the top-N most sold books over the past BestSellerWindowDays days
// from PostgreSQL and writes the result into the Redis best sellers cache.
func (w *BestSellerWorker) Run() {
	ctx, cancelFunc := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelFunc()

	w.logger.Info("best seller worker: starting aggregation...")

	queryRows := make([]bestSellerQueryRow, 0, domain.BestSellerTopN)
	err := w.postgresDatabase.WithContext(ctx).Raw(`
		SELECT oi.mongo_book_id, SUM(oi.quantity) AS total_sold
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.created_at >= ?
		  AND o.status != 'cancelled'
		GROUP BY oi.mongo_book_id
		ORDER BY total_sold DESC
		LIMIT ?
	`, cutoffDate, domain.BestSellerTopN).Scan(&queryRows).Error

	if err != nil {
		w.logger.Error("best seller worker: PostgreSQL query failed", zap.Error(err))
		return
	}

	bestSellerBooks := make([]domain.BestSellerBook, 0, len(queryRows))
	if len(queryRows) > 0 {
		var ids []string
		for _, row := range queryRows {
			ids = append(ids, row.MongoBookID)
		}

		books, err := w.bookRepository.GetBooksByIDs(ctx, ids)
		if err != nil {
			w.logger.Error("best seller worker: fetch books from Mongo failed", zap.Error(err))
		}
		w.logger.Info("best seller worker fetched books", zap.Int("books_count", len(books)))

		titleMap := make(map[string]string)
		for _, b := range books {
			titleMap[b.ID] = b.Name
		}

		for _, row := range queryRows {
			title := "Unknown title"
			if t, ok := titleMap[row.MongoBookID]; ok {
				title = t
			}
			bestSellerBooks = append(bestSellerBooks, domain.BestSellerBook{
				BookID:    row.MongoBookID,
				Title:     title,
				TotalSold: row.TotalSold,
			})
		}
	}

	if err := w.bestSellerRepository.SetTopBestSellers(ctx, bestSellerBooks); err != nil {
		w.logger.Error("best seller worker: write to Redis cache failed", zap.Error(err))
		return
	}

	w.logger.Info("best seller worker completed", zap.Int("books", len(bestSellerBooks)))
}
