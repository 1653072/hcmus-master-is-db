package server

import (
	"bookstore/backend/internal/domain"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// AdminListCategories handles GET /admin/categories.
// Data is sourced from MongoDB's "categories" collection.
func (s *Service) AdminListCategories(c *gin.Context) {
	page := queryInt(c, "page", 1)
	pageSize := queryInt(c, "page_size", 50)

	cats, total, err := s.categoryRepo.ListCategories(c.Request.Context(), page, pageSize)
	if err != nil {
		s.logger.Error("list categories", zap.Error(err))
		respondInternalError(c, "could not list categories")
		return
	}

	respondPaginated(c, cats, total, page, pageSize)
}

// AdminCreateCategory handles POST /admin/categories.
func (s *Service) AdminCreateCategory(c *gin.Context) {
	var req domain.CreateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
		return
	}

	cat := &domain.Category{
		CategoryName:   req.CategoryName,
		Slug:           req.Slug,
		ParentCategory: req.ParentCategory,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	id, err := s.categoryRepo.CreateCategory(c.Request.Context(), cat)
	if err != nil {
		s.logger.Error("create category", zap.Error(err))
		respondInternalError(c, "could not create category")
		return
	}

	cat.ID = id
	respondCreated(c, cat)
}

// AdminUpdateCategory handles PUT /admin/categories/:id.
func (s *Service) AdminUpdateCategory(c *gin.Context) {
	catID := c.Param("id")
	var req domain.UpdateCategoryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		respondBadRequest(c, err.Error())
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

	if err := s.categoryRepo.UpdateCategory(ctx, catID, existing); err != nil {
		s.logger.Error("update category", zap.Error(err))
		respondInternalError(c, "could not update category")
		return
	}

	respondOK(c, existing)
}

// AdminDeleteCategory handles DELETE /admin/categories/:id.
func (s *Service) AdminDeleteCategory(c *gin.Context) {
	catID := c.Param("id")

	if err := s.categoryRepo.DeleteCategory(c.Request.Context(), catID); err != nil {
		s.logger.Error("delete category", zap.Error(err))
		respondInternalError(c, "could not delete category")
		return
	}

	respondOK(c, gin.H{"message": "category deleted"})
}
