package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
)

// GetOrCreateCartByUserID finds the cart belonging to userInternalID (int64 BIGSERIAL PK)
// or creates a new one.  Each user owns exactly one cart (user_id is unique in the carts table).
func (q *Queries) GetOrCreateCartByUserID(ctx context.Context, userInternalID int64) (*domain.Cart, error) {
	var cart domain.Cart
	err := q.db.WithContext(ctx).
		Where("user_id = ?", userInternalID).
		First(&cart).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		cart = domain.Cart{UserID: userInternalID}
		if createErr := q.db.WithContext(ctx).Create(&cart).Error; createErr != nil {
			return nil, createErr
		}
		return &cart, nil
	}
	if err != nil {
		return nil, err
	}
	return &cart, nil
}

// UpsertCartItem inserts or updates a single cart item row.
// cartID is the internal int64 BIGSERIAL PK of the cart header.
func (q *Queries) UpsertCartItem(ctx context.Context, cartID int64, item *domain.CartItemRecord) error {
	item.CartID = cartID
	item.UpdatedAt = time.Now()
	return q.db.WithContext(ctx).Save(item).Error
}

// GetCartItemsByUserID returns all line items belonging to the user's cart by joining
// the carts table.  userInternalID is the internal int64 BIGSERIAL PK of the user.
func (q *Queries) GetCartItemsByUserID(ctx context.Context, userInternalID int64) ([]*domain.CartItemRecord, error) {
	var items []*domain.CartItemRecord
	err := q.db.WithContext(ctx).
		Joins("JOIN carts ON carts.id = cart_items.cart_id").
		Where("carts.user_id = ?", userInternalID).
		Find(&items).Error
	return items, err
}

// DeleteCartItemByBookID removes a single book from the user's cart.
// cartID is the internal int64 BIGSERIAL PK of the cart header.
func (q *Queries) DeleteCartItemByBookID(ctx context.Context, cartID int64, bookID string) error {
	return q.db.WithContext(ctx).
		Where("cart_id = ? AND book_id = ?", cartID, bookID).
		Delete(&domain.CartItemRecord{}).Error
}

// DeleteCartByUserID removes all items from a user's cart and deletes the cart header.
// This is called inside a checkout transaction so the cascade happens atomically.
// userInternalID is the internal int64 BIGSERIAL PK of the user.
func (q *Queries) DeleteCartByUserID(ctx context.Context, userInternalID int64) error {
	return q.db.WithContext(ctx).
		Where("user_id = ?", userInternalID).
		Delete(&domain.Cart{}).Error
}
