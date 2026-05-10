package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
)

// CreateHistory inserts a new order status history record.
func (q *Queries) CreateHistory(ctx context.Context, history *domain.OrderStatusHistory) error {
	return q.db.WithContext(ctx).Create(history).Error
}

// ListByOrder returns all status history records for an order, newest first.
// orderInternalID is the internal int64 BIGSERIAL PK of the order.
func (q *Queries) ListByOrder(ctx context.Context, orderInternalID int64) ([]*domain.OrderStatusHistory, error) {
	var history []*domain.OrderStatusHistory
	err := q.db.WithContext(ctx).
		Where("order_id = ?", orderInternalID).
		Order("changed_at DESC").
		Find(&history).Error
	return history, err
}
