package mongo

import (
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func mongoIDString(value any) string {
	switch v := value.(type) {
	case nil:
		return ""
	case string:
		return v
	case primitive.ObjectID:
		return v.Hex()
	case fmt.Stringer:
		return v.String()
	default:
		return fmt.Sprintf("%v", v)
	}
}

func mongoIDFilter(id string) bson.M {
	if oid, err := primitive.ObjectIDFromHex(id); err == nil {
		return bson.M{"_id": bson.M{"$in": bson.A{oid, id}}}
	}
	return bson.M{"_id": id}
}

func mongoIDs(ids []string) bson.A {
	values := make(bson.A, 0, len(ids)*2)
	seen := make(map[string]struct{}, len(ids)*2)
	for _, id := range ids {
		if _, ok := seen[id]; !ok {
			values = append(values, id)
			seen[id] = struct{}{}
		}
		if oid, err := primitive.ObjectIDFromHex(id); err == nil {
			oidKey := oid.Hex() + ":objectid"
			if _, ok := seen[oidKey]; !ok {
				values = append(values, oid)
				seen[oidKey] = struct{}{}
			}
		}
	}
	return values
}
