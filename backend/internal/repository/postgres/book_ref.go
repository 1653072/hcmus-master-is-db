package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"

	"gorm.io/gorm"
)

// ── BookRef ───────────────────────────────────────────────────────────────────

// GetBookRef fetches the active-status reference row for a MongoDB book ID.
func (q *Queries) GetBookRef(ctx context.Context, mongoID string) (*domain.BookRef, error) {
	var ref domain.BookRef
	err := q.db.WithContext(ctx).First(&ref, "mongo_id = ?", mongoID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &ref, err
}

// CreateBookRef inserts a new bridge row linking a MongoDB book ID to PostgreSQL.
func (q *Queries) CreateBookRef(ctx context.Context, ref *domain.BookRef) error {
	return q.db.WithContext(ctx).Create(ref).Error
}

// UpdateBookRef persists changes to is_active.
func (q *Queries) UpdateBookRef(ctx context.Context, ref *domain.BookRef) error {
	return q.db.WithContext(ctx).Model(ref).
		Select("is_active").
		Updates(ref).Error
}
