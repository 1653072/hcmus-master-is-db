package database

import (
	"bookstore/backend/config"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

// ConnectMongo opens a MongoDB client and verifies connectivity with a ping.
func ConnectMongo(ctx context.Context, cfg config.MongoConfig) (*mongo.Client, error) {
	opts := options.Client().
		ApplyURI(cfg.URI).
		SetConnectTimeout(10 * time.Second).
		SetServerSelectionTimeout(10 * time.Second)

	client, err := mongo.Connect(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("mongo connect: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx, readpref.Primary()); err != nil {
		return nil, fmt.Errorf("ping mongo: %w", err)
	}

	return client, nil
}

// MongoIndexConfig represents the structure of the indexes JSON file.
type MongoIndexConfig struct {
	Collection string `json:"collection"`
	Indexes    []struct {
		Name    string                 `json:"name"`
		Keys    json.RawMessage        `json:"keys"`
		Options map[string]interface{} `json:"options"`
	} `json:"indexes"`
}

// EnsureMongoIndexes reads the provided JSON configuration and creates indexes in MongoDB.
func EnsureMongoIndexes(ctx context.Context, client *mongo.Client, dbName string, configData []byte) error {
	var configs []MongoIndexConfig
	if err := json.Unmarshal(configData, &configs); err != nil {
		return fmt.Errorf("unmarshal index config: %w", err)
	}

	db := client.Database(dbName)

	for _, cfg := range configs {
		coll := db.Collection(cfg.Collection)

		for _, idx := range cfg.Indexes {
			var keysBson bson.D
			if err := bson.UnmarshalExtJSON(idx.Keys, true, &keysBson); err != nil {
				return fmt.Errorf("unmarshal keys for %s: %w", idx.Name, err)
			}

			opts := options.Index().SetName(idx.Name)
			if idx.Options != nil {
				if unique, ok := idx.Options["unique"].(bool); ok && unique {
					opts.SetUnique(true)
				}
				if sparse, ok := idx.Options["sparse"].(bool); ok && sparse {
					opts.SetSparse(true)
				}
				if weights, ok := idx.Options["weights"].(map[string]interface{}); ok {
					opts.SetWeights(weights)
				}
				if lang, ok := idx.Options["default_language"].(string); ok {
					opts.SetDefaultLanguage(lang)
				}
			}

			model := mongo.IndexModel{
				Keys:    keysBson,
				Options: opts,
			}
			if _, err := coll.Indexes().CreateOne(ctx, model); err != nil {
				if isIndexConflict(err) {
					if _, dropErr := coll.Indexes().DropOne(ctx, idx.Name); dropErr != nil {
						return fmt.Errorf("drop conflicting index %s for %s: %w", idx.Name, cfg.Collection, dropErr)
					}
					if _, createErr := coll.Indexes().CreateOne(ctx, model); createErr != nil {
						return fmt.Errorf("recreate index %s for %s: %w", idx.Name, cfg.Collection, createErr)
					}
					continue
				}
				return fmt.Errorf("create index %s for %s: %w", idx.Name, cfg.Collection, err)
			}
		}
	}

	return nil
}

func isIndexConflict(err error) bool {
	var cmdErr mongo.CommandError
	if !errors.As(err, &cmdErr) {
		return false
	}
	return cmdErr.HasErrorCode(85) || cmdErr.HasErrorCode(86)
}
