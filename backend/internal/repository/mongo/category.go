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

type categoryDocument struct {
	ID             any       `bson:"_id,omitempty"`
	CategoryName   string    `bson:"category_name"`
	Slug           string    `bson:"slug"`
	ParentCategory string    `bson:"parent_category,omitempty"`
	CreatedAt      time.Time `bson:"created_at"`
	UpdatedAt      time.Time `bson:"updated_at"`
}

type categoryUpdateDocument struct {
	CategoryName   string    `bson:"category_name"`
	Slug           string    `bson:"slug"`
	ParentCategory string    `bson:"parent_category,omitempty"`
	CreatedAt      time.Time `bson:"created_at"`
	UpdatedAt      time.Time `bson:"updated_at"`
}

func categoryDocumentFromDomain(cat *domain.Category) categoryDocument {
	if cat.ID == "" {
		cat.ID = primitive.NewObjectID().Hex()
	}
	return categoryDocument{
		ID:             cat.ID,
		CategoryName:   cat.CategoryName,
		Slug:           cat.Slug,
		ParentCategory: cat.ParentCategory,
		CreatedAt:      cat.CreatedAt,
		UpdatedAt:      cat.UpdatedAt,
	}
}

func categoryUpdateDocumentFromDomain(cat *domain.Category) categoryUpdateDocument {
	return categoryUpdateDocument{
		CategoryName:   cat.CategoryName,
		Slug:           cat.Slug,
		ParentCategory: cat.ParentCategory,
		CreatedAt:      cat.CreatedAt,
		UpdatedAt:      cat.UpdatedAt,
	}
}

func (doc categoryDocument) toDomain() *domain.Category {
	return &domain.Category{
		ID:             mongoIDString(doc.ID),
		CategoryName:   doc.CategoryName,
		Slug:           doc.Slug,
		ParentCategory: doc.ParentCategory,
		CreatedAt:      doc.CreatedAt,
		UpdatedAt:      doc.UpdatedAt,
	}
}

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

	doc := categoryDocumentFromDomain(cat)
	res, err := r.col.InsertOne(ctx, doc)
	if err != nil {
		return "", fmt.Errorf("insert category: %w", err)
	}
	return mongoIDString(res.InsertedID), nil
}

func (r *CategoryRepository) GetCategoryByID(ctx context.Context, id string) (*domain.Category, error) {
	var doc categoryDocument
	err := r.col.FindOne(ctx, mongoIDFilter(id)).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return doc.toDomain(), nil
}

func (r *CategoryRepository) GetCategoryBySlug(ctx context.Context, slug string) (*domain.Category, error) {
	var doc categoryDocument
	err := r.col.FindOne(ctx, bson.M{"slug": slug}).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return doc.toDomain(), nil
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

	var docs []categoryDocument
	if err := cur.All(ctx, &docs); err != nil {
		return nil, 0, fmt.Errorf("decode categories: %w", err)
	}
	cats := make([]*domain.Category, 0, len(docs))
	for _, doc := range docs {
		cats = append(cats, doc.toDomain())
	}
	return cats, total, nil
}

func (r *CategoryRepository) UpdateCategory(ctx context.Context, id string, cat *domain.Category) error {
	cat.UpdatedAt = time.Now()
	_, err := r.col.UpdateOne(ctx, mongoIDFilter(id), bson.M{"$set": categoryUpdateDocumentFromDomain(cat)})
	return err
}

func (r *CategoryRepository) DeleteCategory(ctx context.Context, id string) error {
	_, err := r.col.DeleteOne(ctx, mongoIDFilter(id))
	return err
}
