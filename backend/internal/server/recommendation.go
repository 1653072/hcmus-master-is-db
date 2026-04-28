package server

import (
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GetSimilarBooks handles GET /api/v1/books/:id/similar (NV-E1).
// Traverses the Neo4j graph scored by Category(×0.50), Author(×0.33), Publisher(×0.17).
func (s *Service) GetSimilarBooks(c *gin.Context) {
	bookID := c.Param("id")
	limit := queryInt(c, "limit", 10)

	books, err := s.recRepo.GetSimilarBooks(c.Request.Context(), bookID, limit)
	if err != nil {
		s.logger.Error("get similar books", zap.Error(err))
		respondInternalError(c, "could not fetch recommendations")
		return
	}

	respondOK(c, books)
}

// GetSeriesBooks handles GET /api/v1/books/:id/series (NV-E2).
func (s *Service) GetSeriesBooks(c *gin.Context) {
	bookID := c.Param("id")
	ctx := c.Request.Context()

	book, err := s.bookRepo.GetBookByID(ctx, bookID)
	if err != nil || book == nil {
		respondNotFound(c, "book not found")
		return
	}
	if book.Series.SeriesName == "" {
		respondOK(c, []any{})
		return
	}

	seriesBooks, err := s.recRepo.GetSeriesBooks(ctx, book.Series.SeriesName)
	if err != nil {
		s.logger.Error("get series books", zap.Error(err))
		respondInternalError(c, "could not fetch series")
		return
	}

	respondOK(c, seriesBooks)
}

// GetTrending handles GET /api/v1/trending (NV-E3).
// Returns the top-10 bestselling books from the Redis Sorted Set cache.
func (s *Service) GetTrending(c *gin.Context) {
	n := queryInt(c, "limit", 10)
	books, err := s.trendRepo.GetTop(c.Request.Context(), n)
	if err != nil {
		s.logger.Error("get trending", zap.Error(err))
		respondInternalError(c, "could not fetch trending books")
		return
	}

	respondOK(c, books)
}
