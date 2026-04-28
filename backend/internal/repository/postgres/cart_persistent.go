package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"time"

	"github.com/google/uuid"
)

// UpsertCartItem inserts or updates a cart item for a user.
func (q *Queries) UpsertCartItem(ctx context.Context, item *domain.PersistentCartItem) error {
	item.UpdatedAt = time.Now()
	return q.db.WithContext(ctx).
		Save(item).Error
}

// GetCartByUser returns all cart items for a user.
func (q *Queries) GetCartByUser(ctx context.Context, userID uuid.UUID) ([]*domain.PersistentCartItem, error) {
	var items []*domain.PersistentCartItem
	err := q.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Find(&items).Error
	return items, err
}

// DeleteCartItem removes a single item from the user's cart.
func (q *Queries) DeleteCartItem(ctx context.Context, userID uuid.UUID, bookID string) error {
	return q.db.WithContext(ctx).
		Where("user_id = ? AND book_id = ?", userID, bookID).
		Delete(&domain.PersistentCartItem{}).Error
}

// DeleteCartByUser removes all items from a user's cart (called inside checkout TX).
func (q *Queries) DeleteCartByUser(ctx context.Context, userID uuid.UUID) error {
	return q.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Delete(&domain.PersistentCartItem{}).Error
}
