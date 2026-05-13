package postgres

import (
	"bookstore/backend/internal/domain"
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type stubOrderHistoryRepository struct {
	gotOrderID int64
}

func (s *stubOrderHistoryRepository) CreateHistory(_ context.Context, history *domain.OrderStatusHistory) error {
	s.gotOrderID = history.OrderID
	return nil
}

func (s *stubOrderHistoryRepository) ListByOrder(context.Context, int64) ([]*domain.OrderStatusHistory, error) {
	return nil, nil
}

func TestCreateOrderInsertsItemsWithCreatedOrderID(t *testing.T) {
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("create sql mock: %v", err)
	}
	defer sqlDB.Close() //nolint:errcheck

	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{
		SkipDefaultTransaction: true,
	})
	if err != nil {
		t.Fatalf("open gorm db: %v", err)
	}

	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "orders"`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(123))
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "order_items"`)).
		WithArgs(int64(123), "book-1", "Clean Code", 2, 19.95).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(456))

	order := &domain.Order{
		UserID:      42,
		Status:      domain.OrderStatusPending,
		TotalAmount: 39.90,
		Items: []domain.OrderItem{{
			MongoBookID: "book-1",
			Name:        "Clean Code",
			Quantity:    2,
			UnitPrice:   19.95,
		}},
	}
	historyRepo := &stubOrderHistoryRepository{}

	err = New(db).CreateOrder(context.Background(), order, historyRepo)
	if err != nil {
		t.Fatalf("create order: %v", err)
	}
	if order.ID != 123 {
		t.Fatalf("expected created order ID to be set, got %d", order.ID)
	}
	if order.Items[0].OrderID != 123 {
		t.Fatalf("expected order item to use created order ID, got %d", order.Items[0].OrderID)
	}
	if historyRepo.gotOrderID != 123 {
		t.Fatalf("expected history to use created order ID, got %d", historyRepo.gotOrderID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet sql expectations: %v", err)
	}
}
