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

const collBooks = "books"

// BookRepository implements domain.BookRepository against MongoDB.
type BookRepository struct {
	col *mongo.Collection
}

// NewBookRepository creates a BookRepository that operates on the "books" collection.
func NewBookRepository(client *mongo.Client, dbName string) *BookRepository {
	return &BookRepository{col: client.Database(dbName).Collection(collBooks)}
}

// SearchBooks performs a full-text or filter-based search on the books collection.
func (r *BookRepository) SearchBooks(ctx context.Context, filter domain.BookFilter) ([]*domain.Book, int64, error) {
	query := bson.D{}

	if filter.Search != "" {
		query = append(query, bson.E{Key: "$text", Value: bson.D{{Key: "$search", Value: filter.Search}}})
	}
	if filter.Author != "" {
		query = append(query, bson.E{Key: "authors.authorName", Value: filter.Author})
	}
	if filter.Publisher != "" {
		query = append(query, bson.E{Key: "publisher", Value: filter.Publisher})
	}
	if filter.Year > 0 {
		query = append(query, bson.E{Key: "publishYear", Value: filter.Year})
	}

	total, err := r.col.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, fmt.Errorf("count books: %w", err)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 20
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "importedAt", Value: -1}}).
		SetSkip(int64((page - 1) * pageSize)).
		SetLimit(int64(pageSize))

	cur, err := r.col.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("find books: %w", err)
	}
	defer cur.Close(ctx)

	var books []*domain.Book
	if err := cur.All(ctx, &books); err != nil {
		return nil, 0, fmt.Errorf("decode books: %w", err)
	}

	return books, total, nil
}

func (r *BookRepository) GetBookByID(ctx context.Context, id string) (*domain.Book, error) {
	var book domain.Book
	err := r.col.FindOne(ctx, bson.M{"_id": id}).Decode(&book)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	return &book, err
}

func (r *BookRepository) GetBooksByIDs(ctx context.Context, ids []string) ([]*domain.Book, error) {
	cur, err := r.col.Find(ctx, bson.M{"_id": bson.M{"$in": ids}})
	if err != nil {
		return nil, fmt.Errorf("find books by ids: %w", err)
	}
	defer cur.Close(ctx)

	var books []*domain.Book
	if err := cur.All(ctx, &books); err != nil {
		return nil, fmt.Errorf("decode books: %w", err)
	}
	return books, nil
}

// GetNewestBooks returns the most recently imported books.
func (r *BookRepository) GetNewestBooks(ctx context.Context, limit int) ([]*domain.Book, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "importedAt", Value: -1}}).
		SetLimit(int64(limit))

	cur, err := r.col.Find(ctx, bson.D{}, opts)
	if err != nil {
		return nil, fmt.Errorf("find newest books: %w", err)
	}
	defer cur.Close(ctx)

	var books []*domain.Book
	if err := cur.All(ctx, &books); err != nil {
		return nil, fmt.Errorf("decode books: %w", err)
	}
	return books, nil
}

// CreateBook inserts a new book document and returns its generated MongoDB ID.
func (r *BookRepository) CreateBook(ctx context.Context, book *domain.Book) (string, error) {
	now := time.Now()
	book.CreatedAt = now
	book.ImportedAt = now

	res, err := r.col.InsertOne(ctx, book)
	if err != nil {
		return "", fmt.Errorf("insert book: %w", err)
	}

	oid, ok := res.InsertedID.(primitive.ObjectID)
	if !ok {
		return "", fmt.Errorf("unexpected inserted id type")
	}
	return oid.Hex(), nil
}

func (r *BookRepository) UpdateBook(ctx context.Context, id string, book *domain.Book) error {
	update := bson.M{"$set": book}
	_, err := r.col.UpdateOne(ctx, bson.M{"_id": id}, update)
	return err
}

func (r *BookRepository) DeleteBook(ctx context.Context, id string) error {
	_, err := r.col.DeleteOne(ctx, bson.M{"_id": id})
	return err
}
