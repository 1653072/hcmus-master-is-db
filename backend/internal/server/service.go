package server

import (
	"bookstore/backend/config"
	"bookstore/backend/internal/domain"

	"go.uber.org/zap"
)

// Service holds all repository dependencies and is shared by every handler.
type Service struct {
	pg              domain.PostgresTransactor
	bookRepo        domain.BookRepository
	categoryRepo    domain.CategoryRepository
	recRepo         domain.RecommendationRepository
	sessionRepo     domain.SessionRepository
	cartCache       domain.CartCacheRepository
	checkoutSession domain.CheckoutSessionRepository
	trendRepo       domain.TrendingRepository
	bookCache       domain.BookCacheRepository
	jwtCfg          config.JWTConfig
	logger          *zap.Logger
}

// NewService creates a Service with all dependencies injected.
func NewService(
	pg domain.PostgresTransactor,
	bookRepo domain.BookRepository,
	categoryRepo domain.CategoryRepository,
	recRepo domain.RecommendationRepository,
	sessionRepo domain.SessionRepository,
	cartCache domain.CartCacheRepository,
	checkoutSession domain.CheckoutSessionRepository,
	trendRepo domain.TrendingRepository,
	bookCache domain.BookCacheRepository,
	jwtCfg config.JWTConfig,
	logger *zap.Logger,
) *Service {
	return &Service{
		pg:              pg,
		bookRepo:        bookRepo,
		categoryRepo:    categoryRepo,
		recRepo:         recRepo,
		sessionRepo:     sessionRepo,
		cartCache:       cartCache,
		checkoutSession: checkoutSession,
		trendRepo:       trendRepo,
		bookCache:       bookCache,
		jwtCfg:          jwtCfg,
		logger:          logger,
	}
}
