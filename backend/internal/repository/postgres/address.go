package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateAddress inserts a new delivery address for a user.
// addr.UserID must be set to the user's internal int64 BIGSERIAL ID before calling.
func (q *Queries) CreateAddress(ctx context.Context, addr *domain.Address) error {
	return q.db.WithContext(ctx).Create(addr).Error
}

// GetAddressByAliasID fetches a single address by its external UUID alias.
func (q *Queries) GetAddressByAliasID(ctx context.Context, aliasID uuid.UUID) (*domain.Address, error) {
	var addr domain.Address
	err := q.db.WithContext(ctx).First(&addr, "alias_id = ?", aliasID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &addr, err
}

// ListAddressesByUser returns all addresses belonging to a user (by internal int64 user ID).
func (q *Queries) ListAddressesByUser(ctx context.Context, userInternalID int64) ([]*domain.Address, error) {
	var addrs []*domain.Address
	err := q.db.WithContext(ctx).
		Where("user_id = ?", userInternalID).
		Order("is_default DESC, created_at ASC").
		Find(&addrs).Error
	return addrs, err
}

// UpdateAddress persists mutable fields of an address.
func (q *Queries) UpdateAddress(ctx context.Context, addr *domain.Address) error {
	return q.db.WithContext(ctx).Save(addr).Error
}

// DeleteAddress removes an address by its internal BIGSERIAL primary key.
func (q *Queries) DeleteAddress(ctx context.Context, id int64) error {
	return q.db.WithContext(ctx).Delete(&domain.Address{}, "id = ?", id).Error
}

// SetDefault marks one address as the default and clears the flag on all others for the same user.
// Both userInternalID and addrInternalID are BIGSERIAL int64 values.
func (q *Queries) SetDefault(ctx context.Context, userInternalID, addrInternalID int64) error {
	return q.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&domain.Address{}).
			Where("user_id = ?", userInternalID).
			Update("is_default", false).Error; err != nil {
			return err
		}
		return tx.Model(&domain.Address{}).
			Where("id = ? AND user_id = ?", addrInternalID, userInternalID).
			Update("is_default", true).Error
	})
}
