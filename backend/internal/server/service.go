package server

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/domain"
	neo4jdriver "github.com/neo4j/neo4j-go-driver/v5/neo4j" // Híu bổ sung import driver for Neo4J
	"go.uber.org/zap"
)

// Service holds all repository dependencies and is shared by every HTTP handler.
type Service struct {
	neo4jDriver 	neo4jdriver.DriverWithContext  // Híu bổ sung cái này
	pg              domain.PostgresTransactor
	bookRepo        domain.BookRepository
	categoryRepo    domain.CategoryRepository
	recRepo         domain.RecommendationRepository
	eventLogRepo    domain.EventLogRepository
	sessionRepo     domain.SessionRepository
	cartCache       domain.CartCacheRepository
	checkoutSession domain.CheckoutSessionRepository
	bestSellerRepo  domain.BestSellerRepository
	mostViewedRepo  domain.MostViewedRepository
	bookCache       domain.BookCacheRepository
	orderCache      domain.OrderCacheRepository
	categoryCache   domain.CategoryCacheRepository
	jwtCfg          config.JWTConfig
	features        config.FeaturesConfig
	logger          *zap.Logger
}

// NewService creates a Service with all dependencies injected.
func NewService(

	pg domain.PostgresTransactor,
	bookRepo domain.BookRepository,
	categoryRepo domain.CategoryRepository,
	recRepo domain.RecommendationRepository,
	eventLogRepo domain.EventLogRepository,
	sessionRepo domain.SessionRepository,
	cartCache domain.CartCacheRepository,
	checkoutSession domain.CheckoutSessionRepository,
	bestSellerRepo domain.BestSellerRepository,
	mostViewedRepo domain.MostViewedRepository,
	bookCache domain.BookCacheRepository,
	orderCache domain.OrderCacheRepository,
	categoryCache domain.CategoryCacheRepository,
	jwtCfg config.JWTConfig,
	features config.FeaturesConfig,
	logger *zap.Logger,
) *Service {
	return &Service{
		pg:              pg,
		bookRepo:        bookRepo,
		categoryRepo:    categoryRepo,
		recRepo:         recRepo,
		eventLogRepo:    eventLogRepo,
		sessionRepo:     sessionRepo,
		cartCache:       cartCache,
		checkoutSession: checkoutSession,
		bestSellerRepo:  bestSellerRepo,
		mostViewedRepo:  mostViewedRepo,
		bookCache:       bookCache,
		orderCache:      orderCache,
		categoryCache:   categoryCache,
		jwtCfg:          jwtCfg,
		features:        features,
		logger:          logger,
	}
}
