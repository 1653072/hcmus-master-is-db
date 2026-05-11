package server

import (
	"bookstore/backend/internal/domain"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// GetCategories handles GET /api/v1/categories (public, NV-B1 filter support).
// Uses Redis category-list cache when features.RedisCategoryCache is enabled.
//
// @Summary      Get categories
// @Description  Return a paginated list of all categories
// @Tags         categories
// @Produce      json
// @Param        page       query     int  false  "Page number"
// @Param        page_size  query     int  false  "Items per page"
// @Success      200        {object}  domain.CategoryListResponse
// @Router       /categories [get]
func (s *Service) GetCategories(c *gin.Context) {
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 50)
	ctx := c.Request.Context()

	if s.features.RedisCategoryCache {
		if cats, total, hit, _ := s.categoryCache.GetCategoryList(ctx, page, pageSize); hit {
			respondPaginated(c, cats, total, page, pageSize)
			return
		}
	}

	cats, total, err := s.categoryRepo.ListCategories(ctx, page, pageSize)
	if err != nil {
		s.logger.Error("list categories (public)", zap.Error(err))
		respondInternalError(c, "could not list categories")
		return
	}

	if s.features.RedisCategoryCache {
		if err := s.categoryCache.SetCategoryList(ctx, page, pageSize, cats, total); err != nil {
			s.logger.Warn("failed to cache category list", zap.Error(err))
		}
	}

	respondPaginated(c, cats, total, page, pageSize)
}

// AdminListCategories handles GET /admin/categories.
// Data is sourced from MongoDB's "categories" collection, with Redis cache layer.
//
// @Summary      Admin: List categories
// @Description  Return a paginated list of categories for admin management
// @Tags         admin-categories
// @Security     BearerAuth
// @Produce      json
// @Param        page       query     int  false  "Page number"
// @Param        page_size  query     int  false  "Items per page"
// @Success      200        {object}  domain.CategoryListResponse
// @Router       /admin/categories [get]
func (s *Service) AdminListCategories(c *gin.Context) {
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 50)
	ctx := c.Request.Context()

	if s.features.RedisCategoryCache {
		if cats, total, hit, _ := s.categoryCache.GetCategoryList(ctx, page, pageSize); hit {
			respondPaginated(c, cats, total, page, pageSize)
			return
		}
	}

	cats, total, err := s.categoryRepo.ListCategories(ctx, page, pageSize)
	if err != nil {
		s.logger.Error("list categories", zap.Error(err))
		respondInternalError(c, "could not list categories")
		return
	}

	if s.features.RedisCategoryCache {
		if err := s.categoryCache.SetCategoryList(ctx, page, pageSize, cats, total); err != nil {
			s.logger.Warn("failed to cache category list", zap.Error(err))
		}
	}

	respondPaginated(c, cats, total, page, pageSize)
}

// AdminCreateCategory handles POST /admin/categories.
// After MongoDB insert: syncs to Neo4j and invalidates Redis category cache.
//
// @Summary      Admin: Create category
// @Description  Create a new category in MongoDB and sync to Neo4j graph
// @Tags         admin-categories
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        body  body      domain.CreateCategoryRequest  true  "Category payload"
// @Success      201   {object}  domain.Category
// @Router       /admin/categories [post]
func (s *Service) AdminCreateCategory(c *gin.Context) {
	var req domain.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	cat := &domain.Category{
		CategoryName:   req.CategoryName,
		Slug:           req.Slug,
		ParentCategory: req.ParentCategory,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	id, err := s.categoryRepo.CreateCategory(ctx, cat)
	if err != nil {
		s.logger.Error("create category", zap.Error(err))
		respondInternalError(c, "could not create category")
		return
	}
	cat.ID = id

	// Sync to Neo4j (Category node + PARENT_OF relationship)
	if err := s.recRepo.UpsertCategoryNode(ctx, cat); err != nil {
		s.logger.Warn("upsert category node in neo4j", zap.String("id", id), zap.Error(err))
	}

	// Invalidate Redis category cache
	if s.features.RedisCategoryCache {
		if err := s.categoryCache.InvalidateCategoryList(ctx); err != nil {
			s.logger.Warn("failed to invalidate category cache", zap.Error(err))
		}
	}

	respondCreated(c, cat)
}

// AdminUpdateCategory handles PUT /admin/categories/:id.
// After MongoDB update: re-syncs to Neo4j and invalidates Redis category cache.
//
// @Summary      Admin: Update category
// @Description  Update category metadata and re-sync Neo4j graph
// @Tags         admin-categories
// @Security     BearerAuth
// @Accept       json
// @Produce      json
// @Param        id    path      string                        true  "Category MongoDB ID"
// @Param        body  body      domain.UpdateCategoryRequest  true  "Update payload"
// @Success      200   {object}  domain.Category
// @Router       /admin/categories/{id} [put]
func (s *Service) AdminUpdateCategory(c *gin.Context) {
	catID := c.Param("id")
	var req domain.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondValidationError(c, err)
		return
	}

	ctx := c.Request.Context()
	existing, err := s.categoryRepo.GetCategoryByID(ctx, catID)
	if err != nil || existing == nil {
		respondNotFound(c, "category not found")
		return
	}

	if req.CategoryName != "" {
		existing.CategoryName = req.CategoryName
	}
	if req.Slug != "" {
		existing.Slug = req.Slug
	}
	if req.ParentCategory != "" {
		existing.ParentCategory = req.ParentCategory
	}
	existing.UpdatedAt = time.Now()

	if err := s.categoryRepo.UpdateCategory(ctx, catID, existing); err != nil {
		s.logger.Error("update category", zap.Error(err))
		respondInternalError(c, "could not update category")
		return
	}

	// Re-sync updated node to Neo4j
	if err := s.recRepo.UpsertCategoryNode(ctx, existing); err != nil {
		s.logger.Warn("re-upsert category node in neo4j", zap.String("id", catID), zap.Error(err))
	}

	// Invalidate Redis category cache
	if s.features.RedisCategoryCache {
		if err := s.categoryCache.InvalidateCategoryList(ctx); err != nil {
			s.logger.Warn("failed to invalidate category cache", zap.Error(err))
		}
	}

	respondOK(c, existing)
}

// AdminDeleteCategory handles DELETE /admin/categories/:id.
// After MongoDB delete: removes node from Neo4j and invalidates Redis category cache.
//
// @Summary      Admin: Delete category
// @Description  Delete a category from MongoDB and detach from Neo4j graph
// @Tags         admin-categories
// @Security     BearerAuth
// @Produce      json
// @Param        id   path      string  true  "Category MongoDB ID"
// @Success      200  {object}  successResponse
// @Router       /admin/categories/{id} [delete]
func (s *Service) AdminDeleteCategory(c *gin.Context) {
	catID := c.Param("id")
	ctx := c.Request.Context()

	if err := s.categoryRepo.DeleteCategory(ctx, catID); err != nil {
		s.logger.Error("delete category", zap.Error(err))
		respondInternalError(c, "could not delete category")
		return
	}

	// Remove Category node from Neo4j graph
	if err := s.recRepo.DeleteCategoryNode(ctx, catID); err != nil {
		s.logger.Warn("delete category node in neo4j", zap.String("id", catID), zap.Error(err))
	}

	// Invalidate Redis category cache
	if s.features.RedisCategoryCache {
		if err := s.categoryCache.InvalidateCategoryList(ctx); err != nil {
			s.logger.Warn("failed to invalidate category cache", zap.Error(err))
		}
	}

	respondOK(c, gin.H{"message": "category deleted"})
}
