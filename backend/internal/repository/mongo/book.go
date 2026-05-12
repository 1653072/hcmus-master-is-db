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

type bookDocument struct {
	ID                any                 `bson:"_id,omitempty"`
	Name              string              `bson:"name"`
	ShortDescription  string              `bson:"shortDescription"`
	DetailDescription string              `bson:"detailDescription"`
	ProductStatus     string              `bson:"productStatus"`
	Publisher         string              `bson:"publisher,omitempty"`
	PublishYear       int                 `bson:"publishYear,omitempty"`
	Pricing           domain.BookPricing  `bson:"pricing"`
	Category          domain.BookCategory `bson:"category"`
	Images            []domain.BookImage  `bson:"images"`
	Series            domain.BookSeries   `bson:"series,omitempty"`
	Authors           []domain.BookAuthor `bson:"authors"`
	Tags              []domain.BookTag    `bson:"tags"`
	CreatedAt         time.Time           `bson:"createdAt"`
}

type bookUpdateDocument struct {
	Name              string              `bson:"name"`
	ShortDescription  string              `bson:"shortDescription"`
	DetailDescription string              `bson:"detailDescription"`
	ProductStatus     string              `bson:"productStatus"`
	Publisher         string              `bson:"publisher,omitempty"`
	PublishYear       int                 `bson:"publishYear,omitempty"`
	Pricing           domain.BookPricing  `bson:"pricing"`
	Category          domain.BookCategory `bson:"category"`
	Images            []domain.BookImage  `bson:"images"`
	Series            domain.BookSeries   `bson:"series,omitempty"`
	Authors           []domain.BookAuthor `bson:"authors"`
	Tags              []domain.BookTag    `bson:"tags"`
	CreatedAt         time.Time           `bson:"createdAt"`
}

func bookDocumentFromDomain(book *domain.Book) bookDocument {
	if book.ID == "" {
		book.ID = primitive.NewObjectID().Hex()
	}
	return bookDocument{
		ID:                book.ID,
		Name:              book.Name,
		ShortDescription:  book.ShortDescription,
		DetailDescription: book.DetailDescription,
		ProductStatus:     book.ProductStatus,
		Publisher:         book.Publisher,
		PublishYear:       book.PublishYear,
		Pricing:           book.Pricing,
		Category:          book.Category,
		Images:            book.Images,
		Series:            book.Series,
		Authors:           book.Authors,
		Tags:              book.Tags,
		CreatedAt:         book.CreatedAt,
	}
}

func bookUpdateDocumentFromDomain(book *domain.Book) bookUpdateDocument {
	return bookUpdateDocument{
		Name:              book.Name,
		ShortDescription:  book.ShortDescription,
		DetailDescription: book.DetailDescription,
		ProductStatus:     book.ProductStatus,
		Publisher:         book.Publisher,
		PublishYear:       book.PublishYear,
		Pricing:           book.Pricing,
		Category:          book.Category,
		Images:            book.Images,
		Series:            book.Series,
		Authors:           book.Authors,
		Tags:              book.Tags,
		CreatedAt:         book.CreatedAt,
	}
}

func (doc bookDocument) toDomain() *domain.Book {
	return &domain.Book{
		ID:                mongoIDString(doc.ID),
		Name:              doc.Name,
		ShortDescription:  doc.ShortDescription,
		DetailDescription: doc.DetailDescription,
		ProductStatus:     doc.ProductStatus,
		Publisher:         doc.Publisher,
		PublishYear:       doc.PublishYear,
		Pricing:           doc.Pricing,
		Category:          doc.Category,
		Images:            doc.Images,
		Series:            doc.Series,
		Authors:           doc.Authors,
		Tags:              doc.Tags,
		CreatedAt:         doc.CreatedAt,
	}
}

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
	query := buildBookSearchQuery(filter)

	total, err := r.col.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, fmt.Errorf("count books: %w", err)
	}

	opts := buildBookFindOptions(filter)

	cur, err := r.col.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("find books: %w", err)
	}
	defer cur.Close(ctx)

	var docs []bookDocument
	if err := cur.All(ctx, &docs); err != nil {
		return nil, 0, fmt.Errorf("decode books: %w", err)
	}

	books := make([]*domain.Book, 0, len(docs))
	for _, doc := range docs {
		books = append(books, doc.toDomain())
	}
	return books, total, nil
}

func buildBookSearchQuery(filter domain.BookFilter) bson.D {
	query := bson.D{}

	if filter.Search != "" {
		query = append(query, bson.E{Key: "$text", Value: bson.D{{Key: "$search", Value: filter.Search}}})
	}
	if filter.Author != "" {
		query = append(query, bson.E{Key: "authors.authorName", Value: filter.Author})
	}
	if filter.Category != "" {
		query = append(query, bson.E{Key: "category.categoryId", Value: filter.Category})
	}
	if filter.Publisher != "" {
		query = append(query, bson.E{Key: "publisher", Value: filter.Publisher})
	}
	if filter.Year > 0 {
		query = append(query, bson.E{Key: "publishYear", Value: filter.Year})
	}
	if filter.MinPrice > 0 || filter.MaxPrice > 0 {
		priceQuery := bson.D{}
		if filter.MinPrice > 0 {
			priceQuery = append(priceQuery, bson.E{Key: "$gte", Value: filter.MinPrice})
		}
		if filter.MaxPrice > 0 {
			priceQuery = append(priceQuery, bson.E{Key: "$lte", Value: filter.MaxPrice})
		}
		query = append(query, bson.E{Key: "pricing.price", Value: priceQuery})
	}

	return query
}

func buildBookFindOptions(filter domain.BookFilter) *options.FindOptions {
	page := filter.Page
	if page < 1 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize < 1 {
		pageSize = 20
	}

	opts := options.Find().
		SetSkip(int64((page - 1) * pageSize)).
		SetLimit(int64(pageSize))

	if filter.Search != "" {
		textScore := bson.D{{Key: "$meta", Value: "textScore"}}
		return opts.
			SetProjection(bson.D{{Key: "score", Value: textScore}}).
			SetSort(bson.D{{Key: "score", Value: textScore}, {Key: "createdAt", Value: -1}})
	}

	return opts.SetSort(bson.D{{Key: "createdAt", Value: -1}})
}

func (r *BookRepository) GetBookByID(ctx context.Context, id string) (*domain.Book, error) {
	var doc bookDocument
	err := r.col.FindOne(ctx, mongoIDFilter(id)).Decode(&doc)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return doc.toDomain(), nil
}

func (r *BookRepository) GetBooksByIDs(ctx context.Context, ids []string) ([]*domain.Book, error) {
	cur, err := r.col.Find(ctx, bson.M{"_id": bson.M{"$in": mongoIDs(ids)}})
	if err != nil {
		return nil, fmt.Errorf("find books by ids: %w", err)
	}
	defer cur.Close(ctx)

	var docs []bookDocument
	if err := cur.All(ctx, &docs); err != nil {
		return nil, fmt.Errorf("decode books: %w", err)
	}

	books := make([]*domain.Book, 0, len(docs))
	for _, doc := range docs {
		books = append(books, doc.toDomain())
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

	var docs []bookDocument
	if err := cur.All(ctx, &docs); err != nil {
		return nil, fmt.Errorf("decode books: %w", err)
	}
	books := make([]*domain.Book, 0, len(docs))
	for _, doc := range docs {
		books = append(books, doc.toDomain())
	}
	return books, nil
}

// CreateBook inserts a new book document and returns its generated MongoDB ID.
func (r *BookRepository) CreateBook(ctx context.Context, book *domain.Book) (string, error) {
	book.CreatedAt = time.Now()

	doc := bookDocumentFromDomain(book)
	res, err := r.col.InsertOne(ctx, doc)
	if err != nil {
		return "", fmt.Errorf("insert book: %w", err)
	}

	return mongoIDString(res.InsertedID), nil
}

func (r *BookRepository) UpdateBook(ctx context.Context, id string, book *domain.Book) error {
	update := bson.M{"$set": bookUpdateDocumentFromDomain(book)}
	_, err := r.col.UpdateOne(ctx, mongoIDFilter(id), update)
	return err
}

func (r *BookRepository) DeleteBook(ctx context.Context, id string) error {
	_, err := r.col.DeleteOne(ctx, mongoIDFilter(id))
	return err
}
