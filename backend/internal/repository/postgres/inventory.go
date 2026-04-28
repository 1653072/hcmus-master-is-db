package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"

	"gorm.io/gorm"
)

// GetInventory fetches the inventory record for a book.
func (q *Queries) GetInventory(ctx context.Context, bookID string) (*domain.Inventory, error) {
	var inv domain.Inventory
	err := q.db.WithContext(ctx).First(&inv, "book_id = ?", bookID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &inv, err
}

// GetInventoryForUpdate fetches the inventory row with a row-level lock (SELECT FOR UPDATE).
// Must be called inside a Transaction to be meaningful.
func (q *Queries) GetInventoryForUpdate(ctx context.Context, bookID string) (*domain.Inventory, error) {
	var inv domain.Inventory
	err := q.db.WithContext(ctx).
		Set("gorm:query_option", "FOR UPDATE").
		First(&inv, "book_id = ?", bookID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &inv, err
}

// CreateInventory inserts a new inventory row for a book.
func (q *Queries) CreateInventory(ctx context.Context, inv *domain.Inventory) error {
	return q.db.WithContext(ctx).Create(inv).Error
}

// UpdateStock adjusts stock_quantity by delta (positive = add, negative = deduct).
// The CHECK constraint in the DB ensures stock never goes below 0.
func (q *Queries) UpdateStock(ctx context.Context, bookID string, delta int) error {
	return q.db.WithContext(ctx).
		Model(&domain.Inventory{}).
		Where("book_id = ?", bookID).
		UpdateColumn("stock_quantity", gorm.Expr("stock_quantity + ?", delta)).Error
}
