package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateShipment inserts a new shipment record.
func (q *Queries) CreateShipment(ctx context.Context, shipment *domain.Shipment) error {
	return q.db.WithContext(ctx).Create(shipment).Error
}

// GetShipmentByAliasID fetches a shipment by its external UUID alias.
func (q *Queries) GetShipmentByAliasID(ctx context.Context, aliasID uuid.UUID) (*domain.Shipment, error) {
	var shipment domain.Shipment
	err := q.db.WithContext(ctx).First(&shipment, "alias_id = ?", aliasID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &shipment, err
}

// GetShipmentByOrderAliasID fetches the shipment record for a specific order using its UUID alias.
func (q *Queries) GetShipmentByOrderAliasID(ctx context.Context, orderAliasID uuid.UUID) (*domain.Shipment, error) {
	var shipment domain.Shipment
	err := q.db.WithContext(ctx).
		Joins("JOIN orders ON orders.id = shipments.order_id").
		Where("orders.alias_id = ?", orderAliasID).
		First(&shipment).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &shipment, err
}

// UpdateShipmentStatus updates the status of a shipment and sets timestamps accordingly.
func (q *Queries) UpdateShipmentStatus(ctx context.Context, id int64, status domain.ShipmentStatus) error {
	updates := map[string]interface{}{
		"status": status,
	}

	now := time.Now()
	if status == domain.ShipmentStatusShipped {
		updates["shipped_at"] = &now
	} else if status == domain.ShipmentStatusDelivered {
		updates["delivered_at"] = &now
	}

	return q.db.WithContext(ctx).Model(&domain.Shipment{}).Where("id = ?", id).Updates(updates).Error
}

// UpdateShipmentDetails updates carrier and tracking number.
func (q *Queries) UpdateShipmentDetails(ctx context.Context, id int64, carrier, trackingNo string) error {
	return q.db.WithContext(ctx).Model(&domain.Shipment{}).Where("id = ?", id).Updates(map[string]interface{}{
		"carrier":     carrier,
		"tracking_no": trackingNo,
	}).Error
}
