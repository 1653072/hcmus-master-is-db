package cmd

import (
	"bookstore/backend/config"
	mongorepo "bookstore/backend/internal/repository/mongo"
	"bookstore/backend/internal/repository/neo4j"
	"bookstore/backend/internal/repository/postgres"
	redisrepo "bookstore/backend/internal/repository/redis"
	"bookstore/backend/internal/server"
	"bookstore/backend/internal/worker"
	"bookstore/backend/utils/database"
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/spf13/cobra"
	"go.uber.org/zap"
)

func newServerCmd(cfg *config.Config, logger *zap.Logger) *cobra.Command {
	return &cobra.Command{
		Use:   "server",
		Short: "Start the HTTP API server",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runServer(cfg, logger)
		},
	}
}

func runServer(cfg *config.Config, logger *zap.Logger) error {
	ctx := context.Background()

	// ── PostgreSQL ────────────────────────────────────────────────────────
	gormDB, err := database.ConnectPostgres(cfg.Postgres)
	if err != nil {
		return fmt.Errorf("connect postgres: %w", err)
	}
	logger.Info("connected to PostgreSQL")

	// ── MongoDB ───────────────────────────────────────────────────────────
	mongoClient, err := database.ConnectMongo(ctx, cfg.Mongo)
	if err != nil {
		return fmt.Errorf("connect mongo: %w", err)
	}
	defer mongoClient.Disconnect(ctx) //nolint:errcheck
	logger.Info("connected to MongoDB")

	// ── Neo4j ─────────────────────────────────────────────────────────────
	neo4jDriver, err := database.ConnectNeo4j(cfg.Neo4j)
	if err != nil {
		return fmt.Errorf("connect neo4j: %w", err)
	}
	defer neo4jDriver.Close(ctx) //nolint:errcheck
	logger.Info("connected to Neo4j")

	// ── Redis ─────────────────────────────────────────────────────────────
	redisClient, err := database.ConnectRedis(ctx, cfg.Redis)
	if err != nil {
		return fmt.Errorf("connect redis: %w", err)
	}
	defer redisClient.Close() //nolint:errcheck
	logger.Info("connected to Redis")

	// ── Repositories ─────────────────────────────────────────────────────
	pgRepo      := postgres.New(gormDB)
	bookRepo    := mongorepo.NewBookRepository(mongoClient, cfg.Mongo.DB)
	categoryRepo := mongorepo.NewCategoryRepository(mongoClient, cfg.Mongo.DB)
	recRepo     := neo4j.NewRecommendationRepository(neo4jDriver)
	sessionRepo := redisrepo.NewSessionRepository(redisClient)
	cartCache   := redisrepo.NewCartCacheRepository(redisClient)
	checkoutSess := redisrepo.NewCheckoutSessionRepository(redisClient)
	trendRepo   := redisrepo.NewTrendingRepository(redisClient)
	bookCache   := redisrepo.NewBookCacheRepository(redisClient)

	// ── Background trending worker ────────────────────────────────────────
	trendWorker := worker.NewTrendingWorker(gormDB, trendRepo, logger)
	trendWorker.Start()
	defer trendWorker.Stop()

	// ── HTTP Server ───────────────────────────────────────────────────────
	svc := server.NewService(
		pgRepo, bookRepo, categoryRepo, recRepo,
		sessionRepo, cartCache, checkoutSess, trendRepo, bookCache,
		cfg.JWT, logger,
	)
	ginEngine := server.NewServer(svc, cfg, logger)

	httpServer := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      ginEngine,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// ── Graceful shutdown ─────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("server starting", zap.String("addr", httpServer.Addr))
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("server error", zap.Error(err))
		}
	}()

	<-quit
	logger.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("server shutdown: %w", err)
	}

	logger.Info("server stopped")
	return nil
}
