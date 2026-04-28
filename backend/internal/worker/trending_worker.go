package worker

import (
	"bookstore/backend/internal/domain"
	"context"
	"time"

	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// trendingRow is the result of the PSQL aggregate query.
type trendingRow struct {
	MongoBookID string
	TotalSold   float64
}

// TrendingWorker runs a daily cron job (00:00 UTC) that computes the top-N
// bestselling books over the past 30 days and writes the result to Redis.
type TrendingWorker struct {
	db        *gorm.DB
	trendRepo domain.TrendingRepository
	logger    *zap.Logger
	cron      *cron.Cron
}

// NewTrendingWorker creates a TrendingWorker.
func NewTrendingWorker(db *gorm.DB, trendRepo domain.TrendingRepository, logger *zap.Logger) *TrendingWorker {
	return &TrendingWorker{
		db:        db,
		trendRepo: trendRepo,
		logger:    logger,
		cron:      cron.New(cron.WithLocation(time.UTC)),
	}
}

// Start registers the cron schedule and launches the scheduler.
// The job runs at 00:00 UTC daily and also executes once on startup.
func (w *TrendingWorker) Start() {
	_, err := w.cron.AddFunc("0 0 * * *", func() {
		w.run()
	})
	if err != nil {
		w.logger.Error("register trending cron job", zap.Error(err))
		return
	}

	w.cron.Start()
	w.logger.Info("trending worker started (daily 00:00 UTC)")

	// Run immediately on startup so Redis is pre-populated.
	go w.run()
}

// Stop gracefully stops the cron scheduler.
func (w *TrendingWorker) Stop() {
	ctx := w.cron.Stop()
	<-ctx.Done()
	w.logger.Info("trending worker stopped")
}

// run queries PostgreSQL and writes the top-N result to Redis.
func (w *TrendingWorker) run() {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cutoff := time.Now().UTC().AddDate(0, 0, -domain.TrendingWindowDays)

	rows := make([]trendingRow, 0, domain.TrendingTopN)
	err := w.db.WithContext(ctx).Raw(`
		SELECT oi.mongo_book_id, SUM(oi.quantity) AS total_sold
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		WHERE o.created_at >= ?
		  AND o.status != 'cancelled'
		GROUP BY oi.mongo_book_id
		ORDER BY total_sold DESC
		LIMIT ?
	`, cutoff, domain.TrendingTopN).Scan(&rows).Error

	if err != nil {
		w.logger.Error("trending worker query failed", zap.Error(err))
		return
	}

	books := make([]domain.TrendingBook, 0, len(rows))
	for _, r := range rows {
		books = append(books, domain.TrendingBook{
			BookID: r.MongoBookID,
			Score:  r.TotalSold,
		})
	}

	if err := w.trendRepo.SetTop(ctx, books); err != nil {
		w.logger.Error("trending worker write to redis failed", zap.Error(err))
		return
	}

	w.logger.Info("trending worker completed", zap.Int("books", len(books)))
}
