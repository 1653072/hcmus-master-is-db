package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateAddress inserts a new delivery address for a user.
func (q *Queries) CreateAddress(ctx context.Context, addr *domain.Address) error {
	return q.db.WithContext(ctx).Create(addr).Error
}

// GetAddressByID fetches a single address by its ID.
func (q *Queries) GetAddressByID(ctx context.Context, id uuid.UUID) (*domain.Address, error) {
	var addr domain.Address
	err := q.db.WithContext(ctx).First(&addr, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &addr, err
}

// ListAddressesByUser returns all addresses belonging to a user.
func (q *Queries) ListAddressesByUser(ctx context.Context, userID uuid.UUID) ([]*domain.Address, error) {
	var addrs []*domain.Address
	err := q.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("is_default DESC, created_at ASC").
		Find(&addrs).Error
	return addrs, err
}

// UpdateAddress persists mutable fields of an address.
func (q *Queries) UpdateAddress(ctx context.Context, addr *domain.Address) error {
	return q.db.WithContext(ctx).Save(addr).Error
}

// DeleteAddress removes an address by ID.
func (q *Queries) DeleteAddress(ctx context.Context, id uuid.UUID) error {
	return q.db.WithContext(ctx).Delete(&domain.Address{}, "id = ?", id).Error
}

// SetDefault marks one address as the default and clears the flag on all others for the same user.
func (q *Queries) SetDefault(ctx context.Context, userID, addrID uuid.UUID) error {
	return q.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.Address{}).
			Where("user_id = ?", userID).
			Update("is_default", false).Error; err != nil {
			return err
		}
		return tx.Model(&domain.Address{}).
			Where("id = ? AND user_id = ?", addrID, userID).
			Update("is_default", true).Error
	})
}
