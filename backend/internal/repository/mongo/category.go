package mongo

import (
	"bookstore/backend/internal/domain"
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const collCategories = "categories"

// CategoryRepository implements domain.CategoryRepository against MongoDB.
type CategoryRepository struct {
	col *mongo.Collection
}

// NewCategoryRepository creates a CategoryRepository that operates on the "categories" collection.
func NewCategoryRepository(client *mongo.Client, dbName string) *CategoryRepository {
	return &CategoryRepository{col: client.Database(dbName).Collection(collCategories)}
}

// CreateCategory inserts a new category document and returns its MongoDB ID.
func (r *CategoryRepository) CreateCategory(ctx context.Context, cat *domain.Category) (string, error) {
	now := time.Now()
	cat.CreatedAt = now
	cat.UpdatedAt = now

	res, err := r.col.InsertOne(ctx, cat)
	if err != nil {
		return "", fmt.Errorf("insert category: %w", err)
	}
	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		return "", fmt.Errorf("unexpected inserted id type")
	}
	return oid.Hex(), nil
}

func (r *CategoryRepository) GetCategoryByID(ctx context.Context, id string) (*domain.Category, error) {
	var cat domain.Category
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&cat)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &cat, err
}

// ListCategories returns a paginated list of categories.
func (r *CategoryRepository) ListCategories(ctx context.Context, page, pageSize int) ([]*domain.Category, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}

	total, err := r.col.CountDocuments(ctx, bson.D{})
	if err != nil {
		return nil, 0, fmt.Errorf("count categories: %w", err)
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "category_name", Value: 1}}).
		SetSkip(int64((page - 1) * pageSize)).
		SetLimit(int64(pageSize))

	cur, err := r.col.Find(ctx, bson.D{}, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("find categories: %w", err)
	}
	defer cur.Close(ctx)

	var cats []*domain.Category
	if err := cur.All(ctx, &cats); err != nil {
		return nil, 0, fmt.Errorf("decode categories: %w", err)
	}
	return cats, total, nil
}

func (r *CategoryRepository) UpdateCategory(ctx context.Context, id string, cat *domain.Category) error {
	cat.UpdatedAt = time.Now()
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, bson.M{"$set": cat})
	return err
}

func (r *CategoryRepository) DeleteCategory(ctx context.Context, id string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
