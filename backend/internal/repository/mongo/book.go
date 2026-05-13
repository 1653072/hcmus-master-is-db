package mongo

import (
	"bookstore/backend/internal/domain"
	"context"
	"fmt"
	"regexp"
	"strings"
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

type flexibleBookCategory struct {
	CategoryID       string `bson:"categoryId"`
	CategoryIDLegacy string `bson:"category_id"`
}

type flexibleBookImage struct {
	IsPrimary       bool   `bson:"isPrimary"`
	IsPrimaryLegacy bool   `bson:"is_primary"`
	Alt             string `bson:"alt"`
	URL             string `bson:"url"`
}

type flexibleBookSeries struct {
	SeriesID         string `bson:"seriesId"`
	SeriesIDLegacy   string `bson:"series_id"`
	SeriesName       string `bson:"seriesName"`
	SeriesNameLegacy string `bson:"series_name"`
	SequenceNo       int    `bson:"sequenceNo"`
	SequenceNoLegacy int    `bson:"sequence_no"`
}

type flexibleBookAuthor struct {
	AuthorID         string `bson:"authorId"`
	AuthorIDLegacy   string `bson:"author_id"`
	Slug             string `bson:"slug"`
	AuthorName       string `bson:"authorName"`
	AuthorNameLegacy string `bson:"author_name"`
}

type flexibleBookTag struct {
	TagID         string `bson:"tagId"`
	TagIDLegacy   string `bson:"tag_id"`
	TagName       string `bson:"tagName"`
	TagNameLegacy string `bson:"tag_name"`
}

func (doc *bookDocument) UnmarshalBSON(data []byte) error {
	var raw struct {
		ID                      any                  `bson:"_id,omitempty"`
		Name                    string               `bson:"name"`
		ShortDescription        string               `bson:"shortDescription"`
		ShortDescriptionLegacy  string               `bson:"short_description"`
		DetailDescription       string               `bson:"detailDescription"`
		DetailDescriptionLegacy string               `bson:"detail_description"`
		ProductStatus           string               `bson:"productStatus"`
		ProductStatusLegacy     string               `bson:"product_status"`
		Publisher               string               `bson:"publisher,omitempty"`
		PublishYear             int                  `bson:"publishYear,omitempty"`
		PublishYearLegacy       int                  `bson:"publish_year,omitempty"`
		Pricing                 domain.BookPricing   `bson:"pricing"`
		Category                flexibleBookCategory `bson:"category"`
		Images                  []flexibleBookImage  `bson:"images"`
		Series                  flexibleBookSeries   `bson:"series,omitempty"`
		Authors                 []flexibleBookAuthor `bson:"authors"`
		Tags                    []flexibleBookTag    `bson:"tags"`
		CreatedAt               time.Time            `bson:"createdAt"`
		CreatedAtLegacy         any                  `bson:"created_at"`
	}
	if err := bson.Unmarshal(data, &raw); err != nil {
		return err
	}

	doc.ID = raw.ID
	doc.Name = raw.Name
	doc.ShortDescription = firstNonEmpty(raw.ShortDescription, raw.ShortDescriptionLegacy)
	doc.DetailDescription = firstNonEmpty(raw.DetailDescription, raw.DetailDescriptionLegacy)
	doc.ProductStatus = firstNonEmpty(raw.ProductStatus, raw.ProductStatusLegacy)
	doc.Publisher = raw.Publisher
	doc.PublishYear = firstNonZero(raw.PublishYear, raw.PublishYearLegacy)
	doc.Pricing = raw.Pricing
	doc.Category = raw.Category.toDomain()
	doc.Images = flexibleImagesToDomain(raw.Images)
	doc.Series = raw.Series.toDomain()
	doc.Authors = flexibleAuthorsToDomain(raw.Authors)
	doc.Tags = flexibleTagsToDomain(raw.Tags)
	doc.CreatedAt = firstTime(raw.CreatedAt, raw.CreatedAtLegacy)
	return nil
}

func (category flexibleBookCategory) toDomain() domain.BookCategory {
	return domain.BookCategory{CategoryID: firstNonEmpty(category.CategoryID, category.CategoryIDLegacy)}
}

func (image flexibleBookImage) toDomain() domain.BookImage {
	return domain.BookImage{
		IsPrimary: image.IsPrimary || image.IsPrimaryLegacy,
		Alt:       image.Alt,
		URL:       image.URL,
	}
}

func (series flexibleBookSeries) toDomain() domain.BookSeries {
	return domain.BookSeries{
		SeriesID:   firstNonEmpty(series.SeriesID, series.SeriesIDLegacy),
		SeriesName: firstNonEmpty(series.SeriesName, series.SeriesNameLegacy),
		SequenceNo: firstNonZero(series.SequenceNo, series.SequenceNoLegacy),
	}
}

func (author flexibleBookAuthor) toDomain() domain.BookAuthor {
	return domain.BookAuthor{
		AuthorID:   firstNonEmpty(author.AuthorID, author.AuthorIDLegacy),
		Slug:       author.Slug,
		AuthorName: firstNonEmpty(author.AuthorName, author.AuthorNameLegacy),
	}
}

func (tag flexibleBookTag) toDomain() domain.BookTag {
	return domain.BookTag{
		TagID:   firstNonEmpty(tag.TagID, tag.TagIDLegacy),
		TagName: firstNonEmpty(tag.TagName, tag.TagNameLegacy),
	}
}

func flexibleImagesToDomain(images []flexibleBookImage) []domain.BookImage {
	result := make([]domain.BookImage, 0, len(images))
	for _, image := range images {
		result = append(result, image.toDomain())
	}
	return result
}

func flexibleAuthorsToDomain(authors []flexibleBookAuthor) []domain.BookAuthor {
	result := make([]domain.BookAuthor, 0, len(authors))
	for _, author := range authors {
		result = append(result, author.toDomain())
	}
	return result
}

func flexibleTagsToDomain(tags []flexibleBookTag) []domain.BookTag {
	result := make([]domain.BookTag, 0, len(tags))
	for _, tag := range tags {
		result = append(result, tag.toDomain())
	}
	return result
}

func firstNonEmpty(primary, fallback string) string {
	if primary != "" {
		return primary
	}
	return fallback
}

func firstNonZero(primary, fallback int) int {
	if primary != 0 {
		return primary
	}
	return fallback
}

func firstTime(primary time.Time, fallback any) time.Time {
	if !primary.IsZero() {
		return primary
	}

	switch value := fallback.(type) {
	case time.Time:
		return value
	case primitive.DateTime:
		return value.Time()
	case string:
		for _, layout := range []string{time.RFC3339Nano, time.RFC3339, "2006-01-02T15:04:05.999999-07:00"} {
			parsed, err := time.Parse(layout, value)
			if err == nil {
				return parsed
			}
		}
	}
	return time.Time{}
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
	conditions := bson.A{}
	addCondition := func(condition bson.D) {
		if len(condition) > 0 {
			conditions = append(conditions, condition)
		}
	}

	if filter.Search != "" {
		addCondition(anyFieldContainsAllTerms(filter.Search,
			"name",
			"shortDescription",
			"short_description",
			"detailDescription",
			"detail_description",
			"publisher",
			"authors.authorName",
			"authors.author_name",
			"category.categoryName",
			"category.category_name",
			"series.seriesName",
			"series.series_name",
			"tags.tagName",
			"tags.tag_name",
		))
	}
	if filter.Author != "" {
		addCondition(anyFieldContains(filter.Author, "authors.authorName", "authors.author_name"))
	}
	if filter.Category != "" {
		addCondition(anyFieldEquals(filter.Category, "category.categoryId", "category.category_id"))
	}
	if filter.Publisher != "" {
		addCondition(anyFieldContains(filter.Publisher, "publisher"))
	}
	if filter.Year > 0 {
		addCondition(bson.D{{Key: "$or", Value: bson.A{
			bson.D{{Key: "publishYear", Value: filter.Year}},
			bson.D{{Key: "publish_year", Value: filter.Year}},
		}}})
	}
	if filter.MinPrice > 0 || filter.MaxPrice > 0 {
		priceQuery := bson.D{}
		if filter.MinPrice > 0 {
			priceQuery = append(priceQuery, bson.E{Key: "$gte", Value: filter.MinPrice})
		}
		if filter.MaxPrice > 0 {
			priceQuery = append(priceQuery, bson.E{Key: "$lte", Value: filter.MaxPrice})
		}
		addCondition(bson.D{{Key: "pricing.price", Value: priceQuery}})
	}

	if len(conditions) == 0 {
		return bson.D{}
	}
	if len(conditions) == 1 {
		if condition, ok := conditions[0].(bson.D); ok {
			return condition
		}
	}
	return bson.D{{Key: "$and", Value: conditions}}
}

func anyFieldEquals(value any, fields ...string) bson.D {
	if len(fields) == 1 {
		return bson.D{{Key: fields[0], Value: value}}
	}
	conditions := make(bson.A, 0, len(fields))
	for _, field := range fields {
		conditions = append(conditions, bson.D{{Key: field, Value: value}})
	}
	return bson.D{{Key: "$or", Value: conditions}}
}

func anyFieldContains(value string, fields ...string) bson.D {
	pattern := regexp.QuoteMeta(strings.TrimSpace(value))
	if pattern == "" {
		return bson.D{}
	}
	conditions := make(bson.A, 0, len(fields))
	for _, field := range fields {
		conditions = append(conditions, bson.D{{Key: field, Value: primitive.Regex{Pattern: pattern, Options: "i"}}})
	}
	if len(conditions) == 1 {
		return conditions[0].(bson.D)
	}
	return bson.D{{Key: "$or", Value: conditions}}
}

func anyFieldContainsAllTerms(value string, fields ...string) bson.D {
	terms := strings.Fields(value)
	if len(terms) == 0 {
		return bson.D{}
	}
	if len(terms) == 1 {
		return anyFieldContains(terms[0], fields...)
	}

	conditions := make(bson.A, 0, len(terms))
	for _, term := range terms {
		conditions = append(conditions, anyFieldContains(term, fields...))
	}
	return bson.D{{Key: "$and", Value: conditions}}
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
