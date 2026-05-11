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
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
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

	// Try as ObjectId first (seeded data uses ObjectId), then fall back to string.
	filter := bson.M{"_id": id}
	if oid, err := primitive.ObjectIDFromHex(id); err == nil {
		filter = bson.M{"_id": oid}
	}

	err := r.col.FindOne(ctx, filter).Decode(&book)
	if err == mongo.ErrNoDocuments {
		// Retry with the other type in case the first attempt used the wrong one.
		altFilter := bson.M{"_id": id}
		if _, ok := filter["_id"].(primitive.ObjectID); ok {
			altFilter = bson.M{"_id": id} // retry as plain string
		} else {
			if oid, convErr := primitive.ObjectIDFromHex(id); convErr == nil {
				altFilter = bson.M{"_id": oid}
			} else {
				return nil, nil
			}
		}
		err = r.col.FindOne(ctx, altFilter).Decode(&book)
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
	}
	return &book, err
}

// toObjectIDs converts a slice of hex strings to ObjectIDs where possible.
func toObjectIDs(ids []string) []interface{} {
	out := make([]interface{}, 0, len(ids))
	for _, id := range ids {
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			out = append(out, oid)
		} else {
			out = append(out, id)
		}
	}
	return out
}

func (r *BookRepository) GetBooksByIDs(ctx context.Context, ids []string) ([]*domain.Book, error) {
	// Build a mixed filter that includes both ObjectId and string representations.
	mixedIDs := toObjectIDs(ids)
	// Also include raw strings so we match regardless of how _id was stored.
	for _, id := range ids {
		mixedIDs = append(mixedIDs, id)
	}

	cur, err := r.col.Find(ctx, bson.M{"_id": bson.M{"$in": mixedIDs}})
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

// GetNewestBooks returns the most recently created books.
func (r *BookRepository) GetNewestBooks(ctx context.Context, limit int) ([]*domain.Book, error) {
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
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
	book.CreatedAt = time.Now()

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

// bookIDFilter returns a bson filter that tries ObjectId first, falling back to string.
func bookIDFilter(id string) bson.M {
	if oid, err := primitive.ObjectIDFromHex(id); err == nil {
		return bson.M{"_id": oid}
	}
	return bson.M{"_id": id}
}

func (r *BookRepository) UpdateBook(ctx context.Context, id string, book *domain.Book) error {
	update := bson.M{"$set": book}
	_, err := r.col.UpdateOne(ctx, bookIDFilter(id), update)
	return err
}

func (r *BookRepository) DeleteBook(ctx context.Context, id string) error {
	_, err := r.col.DeleteOne(ctx, bookIDFilter(id))
	return err
}
