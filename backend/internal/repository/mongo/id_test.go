package mongo

import (
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestMongoIDFilterMatchesStringAndObjectID(t *testing.T) {
	id := primitive.NewObjectID().Hex()

	filter := mongoIDFilter(id)
	inner, ok := filter["_id"].(bson.M)
	if !ok {
		t.Fatalf("expected _id $in filter, got %#v", filter["_id"])
	}

	values, ok := inner["$in"].(bson.A)
	if !ok {
		t.Fatalf("expected $in bson.A, got %#v", inner["$in"])
	}
	if len(values) != 2 {
		t.Fatalf("expected 2 candidate ids, got %d", len(values))
	}
	if _, ok := values[0].(primitive.ObjectID); !ok {
		t.Fatalf("expected first value to be ObjectID, got %T", values[0])
	}
	if values[1] != id {
		t.Fatalf("expected second value to be raw string id, got %#v", values[1])
	}
}

func TestMongoIDFilterFallsBackToString(t *testing.T) {
	id := "category-fiction"

	filter := mongoIDFilter(id)
	if filter["_id"] != id {
		t.Fatalf("expected string-only id filter, got %#v", filter)
	}
}

func TestMongoIDStringNormalizesObjectID(t *testing.T) {
	oid := primitive.NewObjectID()

	if got := mongoIDString(oid); got != oid.Hex() {
		t.Fatalf("expected ObjectID hex %q, got %q", oid.Hex(), got)
	}
}
