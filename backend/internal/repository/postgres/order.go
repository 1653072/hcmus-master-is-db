package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateOrder inserts the order header, all its line items, and the initial
// order_status_histories row (old_status = NULL, new_status = "pending") — all
// within the same database transaction.
func (q *Queries) CreateOrder(ctx context.Context, order *domain.Order, historyRepository domain.OrderStatusHistoryRepository) error {
	if err := q.db.WithContext(ctx).Omit("Items.*").Create(order).Error; err != nil {
		return err
	}
	for index := range order.Items {
		order.Items[index].OrderID = order.ID
		if err := q.db.WithContext(ctx).Create(&order.Items[index]).Error; err != nil {
			return err
		}
	}
	initialStatus := string(domain.OrderStatusPending)
	history := &domain.OrderStatusHistory{
		OrderID:   order.ID,
		OldStatus: nil,
		NewStatus: initialStatus,
	}
	return historyRepository.CreateHistory(ctx, history)
}

// GetOrderByAliasID fetches an order together with its line items using the external UUID alias.
func (q *Queries) GetOrderByAliasID(ctx context.Context, aliasID uuid.UUID) (*domain.Order, error) {
	var order domain.Order
	err := q.db.WithContext(ctx).
		Preload("Items").
		First(&order, "alias_id = ?", aliasID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &order, err
}

// ListOrdersByUser returns a paginated list of orders belonging to a single user.
// userInternalID is the internal int64 BIGSERIAL PK of the user.
func (q *Queries) ListOrdersByUser(ctx context.Context, userInternalID int64, page, pageSize int) ([]*domain.Order, int64, error) {
	var orders []*domain.Order
	var total int64

	q.db.WithContext(ctx).Model(&domain.Order{}).Where("user_id = ?", userInternalID).Count(&total) //nolint:errcheck

	offset := (page - 1) * pageSize
	err := q.db.WithContext(ctx).
		Where("user_id = ?", userInternalID).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&orders).Error

	return orders, total, err
}

// ListAllOrders returns a paginated list of all orders, optionally filtered by status.
func (q *Queries) ListAllOrders(ctx context.Context, status domain.OrderStatus, page, pageSize int) ([]*domain.Order, int64, error) {
	var orders []*domain.Order
	var total int64

	query := q.db.WithContext(ctx).Model(&domain.Order{})
	if status != "" {
		query = query.Where("status = ?", status)
	}
	query.Count(&total) //nolint:errcheck

	offset := (page - 1) * pageSize
	err := query.Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&orders).Error

	return orders, total, err
}

// isValidOrderStatusTransition enforces the order state machine:
//
//	pending   → confirmed | packing | cancelled
//	confirmed → packing   | cancelled
//	packing   → shipping  | cancelled
//	shipping  → completed | cancelled
//	completed → terminal  (no further transitions allowed)
//	cancelled → terminal  (no further transitions allowed)
//
// Any non-terminal status may always transition to "cancelled".
func isValidOrderStatusTransition(current, next domain.OrderStatus) bool {
	if current == domain.OrderStatusCompleted || current == domain.OrderStatusCancelled {
		return false
	}
	if next == domain.OrderStatusCancelled {
		return true
	}
	switch current {
	case domain.OrderStatusPending:
		return next == domain.OrderStatusConfirmed || next == domain.OrderStatusPacking
	case domain.OrderStatusConfirmed:
		return next == domain.OrderStatusPacking
	case domain.OrderStatusPacking:
		return next == domain.OrderStatusShipping
	case domain.OrderStatusShipping:
		return next == domain.OrderStatusCompleted
	}
	return false
}

// UpdateOrderStatus validates the state machine transition, updates the order status,
// and appends an audit row to order_status_histories — all within the same database call.
// id is the internal BIGSERIAL int64 PK; adminAliasID is the acting admin's alias_id UUID
// (stored directly in the history record — denormalised for zero-join serialisation).
// Pass adminAliasID = nil for system-initiated updates.
func (q *Queries) UpdateOrderStatus(ctx context.Context, id int64, newStatus domain.OrderStatus, adminAliasID *uuid.UUID, note string) error {
	var order domain.Order
	if err := q.db.WithContext(ctx).First(&order, "id = ?", id).Error; err != nil {
		return fmt.Errorf("order not found: %w", err)
	}

	if !isValidOrderStatusTransition(order.Status, newStatus) {
		return fmt.Errorf("invalid order status transition: %s → %s", order.Status, newStatus)
	}

	oldStatus := string(order.Status)
	if err := q.db.WithContext(ctx).
		Model(&domain.Order{}).
		Where("id = ?", id).
		Update("status", string(newStatus)).Error; err != nil {
		return err
	}

	nextStatus := string(newStatus)
	history := &domain.OrderStatusHistory{
		OrderID:               id,
		OldStatus:             &oldStatus,
		NewStatus:             nextStatus,
		ChangedByAdminAliasID: adminAliasID,
		Note:                  note,
	}
	return q.db.WithContext(ctx).Create(history).Error
}

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
