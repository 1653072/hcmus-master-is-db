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

const collEventLogs = "view_event_logs"

// eventLogDoc is the internal BSON representation of an event log entry.
type eventLogDoc struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	UserID    string             `bson:"userId,omitempty"`
	BookID    string             `bson:"bookId"`
	EventType string             `bson:"eventType"`
	CreatedAt time.Time          `bson:"createdAt"`
}

// viewCountResult is the output shape of the AggregateTopViewed pipeline.
type viewCountResult struct {
	BookID    string `bson:"_id"`
	ViewCount int64  `bson:"viewCount"`
	BookDocs  []struct {
		Name string `bson:"name"`
	} `bson:"bookDocs"`
}

// EventLogRepository implements domain.EventLogRepository against MongoDB.
type EventLogRepository struct {
	col *mongo.Collection
}

// NewEventLogRepository creates an EventLogRepository that operates on the "event_logs" collection.
func NewEventLogRepository(client *mongo.Client, dbName string) *EventLogRepository {
	return &EventLogRepository{col: client.Database(dbName).Collection(collEventLogs)}
}

// InsertEventLog appends a new behaviour event to the event_logs collection.
func (r *EventLogRepository) InsertEventLog(ctx context.Context, log *domain.EventLog) error {
	doc := eventLogDoc{
		UserID:    log.UserID,
		BookID:    log.BookID,
		EventType: log.EventType,
		CreatedAt: log.CreatedAt,
	}
	_, err := r.col.InsertOne(ctx, doc)
	if err != nil {
		return fmt.Errorf("insert event log: %w", err)
	}
	return nil
}

// AggregateTopViewed queries the event_logs collection for VIEWED events since `from`,
// groups by bookId, counts occurrences, and returns the top-N most-viewed books.
func (r *EventLogRepository) AggregateTopViewed(ctx context.Context, from time.Time, limit int) ([]domain.MostViewedBook, error) {
	pipeline := mongo.Pipeline{
		{
			{Key: "$match", Value: bson.D{
				{Key: "eventType", Value: domain.EventTypeViewed},
				{Key: "createdAt", Value: bson.D{{Key: "$gte", Value: from}}},
			}},
		},
		{
			{Key: "$group", Value: bson.D{
				{Key: "_id", Value: "$bookId"},
				{Key: "viewCount", Value: bson.D{{Key: "$sum", Value: 1}}},
			}},
		},
		{
			{Key: "$sort", Value: bson.D{{Key: "viewCount", Value: -1}}},
		},
		{
			{Key: "$limit", Value: int64(limit)},
		},
		{
			{Key: "$lookup", Value: bson.D{
				{Key: "from", Value: "books"},
				{Key: "let", Value: bson.D{{Key: "bookIdStr", Value: "$_id"}}},
				{Key: "pipeline", Value: mongo.Pipeline{
					{
						{Key: "$match", Value: bson.D{
							{Key: "$expr", Value: bson.D{
								{Key: "$eq", Value: bson.A{
									"$_id",
									bson.D{{Key: "$toObjectId", Value: "$$bookIdStr"}},
								}},
							}},
						}},
					},
					{
						{Key: "$project", Value: bson.D{{Key: "name", Value: 1}}},
					},
				}},
				{Key: "as", Value: "bookDocs"},
			}},
		},
	}

	cur, err := r.col.Aggregate(ctx, pipeline, options.Aggregate())
	if err != nil {
		return nil, fmt.Errorf("aggregate top viewed: %w", err)
	}
	defer cur.Close(ctx)

	var rows []viewCountResult
	if err := cur.All(ctx, &rows); err != nil {
		return nil, fmt.Errorf("decode top viewed: %w", err)
	}

	result := make([]domain.MostViewedBook, 0, len(rows))
	for _, row := range rows {
		title := "Unknown title"
		if len(row.BookDocs) > 0 && row.BookDocs[0].Name != "" {
			title = row.BookDocs[0].Name
		}
		result = append(result, domain.MostViewedBook{
			BookID:    row.BookID,
			Title:     title,
			ViewCount: float64(row.ViewCount),
		})
	}
	return result, nil
}
