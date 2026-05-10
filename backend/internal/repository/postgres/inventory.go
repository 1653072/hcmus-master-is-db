package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// GetInventory fetches the inventory record for a book without acquiring a lock.
func (q *Queries) GetInventory(ctx context.Context, bookID string) (*domain.Inventory, error) {
	var inventory domain.Inventory
	err := q.db.WithContext(ctx).Table("inventory").First(&inventory, "book_id = ?", bookID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &inventory, err
}

// GetInventoryForUpdate fetches the inventory row with a pessimistic row-level lock
// (SELECT … FOR UPDATE). Must always be called inside a Transaction block to ensure
// ACID correctness when multiple concurrent requests (purchases, admin restocks, or
// order cancellations) modify the same stock counter simultaneously.
func (q *Queries) GetInventoryForUpdate(ctx context.Context, bookID string) (*domain.Inventory, error) {
	var inventory domain.Inventory
	err := q.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Table("inventory").
		First(&inventory, "book_id = ?", bookID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &inventory, err
}

// CreateInventory inserts a new inventory row for a book.
func (q *Queries) CreateInventory(ctx context.Context, inv *domain.Inventory) error {
	return q.db.WithContext(ctx).Table("inventory").Create(inv).Error
}

// UpdateStock adjusts stock_quantity by delta (positive = restock, negative = deduct).
// A CHECK constraint in the database prevents stock_quantity from going below zero.
// Must be called inside a Transaction after GetInventoryForUpdate to prevent race conditions.
func (q *Queries) UpdateStock(ctx context.Context, bookID string, delta int) error {
	return q.db.WithContext(ctx).
		Table("inventory").
		Where("book_id = ?", bookID).
		UpdateColumn("stock_quantity", gorm.Expr("stock_quantity + ?", delta)).Error
}
