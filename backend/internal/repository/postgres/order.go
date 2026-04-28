package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"errors"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CreateOrder inserts the order header, all its line items, and the initial
// order_status_history row (old_status = NULL, new_status = "pending") — all
// within the same database transaction.
func (q *Queries) CreateOrder(ctx context.Context, order *domain.Order, historyRepo domain.OrderStatusHistoryRepository) error {
	if err := q.db.WithContext(ctx).Omit("Items.*").Create(order).Error; err != nil {
		return err
	}
	for i := range order.Items {
		order.Items[i].OrderID = order.ID
		if err := q.db.WithContext(ctx).Create(&order.Items[i]).Error; err != nil {
			return err
		}
	}
	newStatus := string(domain.OrderStatusPending)
	history := &domain.OrderStatusHistory{
		OrderID:   order.ID,
		OldStatus: nil,
		NewStatus: newStatus,
	}
	return historyRepo.CreateHistory(ctx, history)
}

// GetOrderByID fetches an order together with its line items.
func (q *Queries) GetOrderByID(ctx context.Context, id uuid.UUID) (*domain.Order, error) {
	var order domain.Order
	err := q.db.WithContext(ctx).
		Preload("Items").
		First(&order, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	return &order, err
}

// ListOrdersByUser returns a paginated list of orders belonging to a single user.
func (q *Queries) ListOrdersByUser(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*domain.Order, int64, error) {
	var orders []*domain.Order
	var total int64

	q.db.WithContext(ctx).Model(&domain.Order{}).Where("user_id = ?", userID).Count(&total) //nolint:errcheck

	offset := (page - 1) * pageSize
	err := q.db.WithContext(ctx).
		Where("user_id = ?", userID).
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

	tx := q.db.WithContext(ctx).Model(&domain.Order{})
	if status != "" {
		tx = tx.Where("status = ?", status)
	}
	tx.Count(&total) //nolint:errcheck

	offset := (page - 1) * pageSize
	err := tx.Order("created_at DESC").Limit(pageSize).Offset(offset).Find(&orders).Error

	return orders, total, err
}

// UpdateOrderStatus updates the order's status and appends an audit row to
// order_status_history within the same call.  Pass adminID = nil for system updates.
func (q *Queries) UpdateOrderStatus(ctx context.Context, id uuid.UUID, status domain.OrderStatus, adminID *uuid.UUID, note string) error {
	order, err := q.GetOrderByID(ctx, id)
	if err != nil || order == nil {
		return err
	}

	oldStatus := string(order.Status)
	if err := q.db.WithContext(ctx).
		Model(&domain.Order{}).
		Where("id = ?", id).
		Update("status", string(status)).Error; err != nil {
		return err
	}

	newStatus := string(status)
	history := &domain.OrderStatusHistory{
		OrderID:          id,
		OldStatus:        &oldStatus,
		NewStatus:        newStatus,
		ChangedByAdminID: adminID,
		Note:             note,
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

// CreateBookRef inserts a new bridge row.
func (q *Queries) CreateBookRef(ctx context.Context, ref *domain.BookRef) error {
	return q.db.WithContext(ctx).Create(ref).Error
}

// UpdateBookRef persists changes to is_active.
func (q *Queries) UpdateBookRef(ctx context.Context, ref *domain.BookRef) error {
	return q.db.WithContext(ctx).Model(ref).
		Select("is_active").
		Updates(ref).Error
}
