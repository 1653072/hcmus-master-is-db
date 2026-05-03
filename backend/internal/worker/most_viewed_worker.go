package worker

import (
	"bookstore/backend/internal/domain"
	"context"
	"time"

	"github.com/robfig/cron/v3"
	"go.uber.org/zap"
)

// MostViewedWorker runs a daily cron job at 00:00 UTC that clears the daily
// most-viewed data so the new day starts from zero (NV-E3).
//
// The worker also pre-computes the 30-day most-viewed ranking from MongoDB
// view_event_logs and stores it in the "books:most_viewed:30d:data" Redis key.
//
// On-demand data refresh is handled by the API handler (GetTopDailyViewed),
// NOT by this worker — the worker's sole daily responsibility is to reset the
// count sorted set and re-aggregate the 30-day cache.
//
// Flow at 00:00 UTC:
//  1. Aggregate MongoDB view_event_logs for the past 30 days → write to "books:most_viewed:30d:data".
//  2. Clear both daily Redis keys ("books:most_viewed:daily:count" and "books:most_viewed:daily:data")
//     so the new day's counters start from zero.
type MostViewedWorker struct {
	eventLogRepository   domain.EventLogRepository
	mostViewedRepository domain.MostViewedRepository
	logger               *zap.Logger
	cron                 *cron.Cron
}

// NewMostViewedWorker creates a MostViewedWorker.
func NewMostViewedWorker(
	eventLogRepository domain.EventLogRepository,
	mostViewedRepository domain.MostViewedRepository,
	logger *zap.Logger,
) *MostViewedWorker {
	return &MostViewedWorker{
		eventLogRepository:   eventLogRepository,
		mostViewedRepository: mostViewedRepository,
		logger:               logger,
		cron:                 cron.New(cron.WithLocation(time.UTC)),
	}
}

// Start registers the daily 00:00 UTC schedule and fires an initial run on startup
// to populate the 30-day cache immediately.
func (w *MostViewedWorker) Start() {
	_, err := w.cron.AddFunc("0 0 * * *", func() {
		w.run()
	})
	if err != nil {
		w.logger.Error("register most viewed cron job", zap.Error(err))
		return
	}

	w.cron.Start()
	w.logger.Info("most viewed worker started (daily 00:00 UTC)")

	go w.run()
}

// Stop gracefully halts the cron scheduler.
func (w *MostViewedWorker) Stop() {
	cronStopContext := w.cron.Stop()
	<-cronStopContext.Done()
	w.logger.Info("most viewed worker stopped")
}

// run executes the nightly maintenance tasks:
//  1. Aggregates 30-day view counts from MongoDB and writes to Redis 30-day data cache.
//  2. Clears the daily count sorted set and daily data cache (new day starts from zero).
func (w *MostViewedWorker) run() {
	ctx, cancelFunc := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancelFunc()

	// Step 1: Aggregate 30-day view counts from MongoDB → 30-day data cache.
	cutoffDate := time.Now().UTC().AddDate(0, 0, -domain.MostViewedWindowDays)
	topViewedLast30Days, err := w.eventLogRepository.AggregateTopViewed(ctx, cutoffDate, domain.MostViewedTopN)
	if err != nil {
		w.logger.Error("most viewed worker: aggregate 30-day views from MongoDB failed", zap.Error(err))
	} else {
		if err := w.mostViewedRepository.Set30DaysTopViewedData(ctx, topViewedLast30Days); err != nil {
			w.logger.Error("most viewed worker: write 30-day cache to Redis failed", zap.Error(err))
		} else {
			w.logger.Info("most viewed worker: 30-day cache updated", zap.Int("books", len(topViewedLast30Days)))
		}
	}

	// Step 2: Clear both daily Redis keys so the new day starts from zero.
	// The API handler (GetTopDailyViewed) is responsible for populating the daily data
	// cache on demand when clients request the daily ranking.
	if err := w.mostViewedRepository.ResetDailyViewCountSet(ctx); err != nil {
		w.logger.Error("most viewed worker: reset daily count set failed", zap.Error(err))
		return
	}

	w.logger.Info("most viewed worker: daily count set and data cache cleared — new day starts from zero")
}
