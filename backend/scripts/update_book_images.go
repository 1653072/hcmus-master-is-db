package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		if err := godotenv.Load(".env"); err != nil {
			log.Println("No .env file found")
		}
	}

	user := os.Getenv("MONGO_USER")
	if user == "" {
		user = "developer"
	}
	pass := os.Getenv("MONGO_PASSWORD")
	if pass == "" {
		pass = "devpassword"
	}
	host := os.Getenv("MONGO_HOST")
	if host == "" {
		host = "localhost"
	}
	port := os.Getenv("MONGO_PORT")
	if port == "" {
		port = "27017"
	}

	uri := fmt.Sprintf("mongodb://%s:%s@%s:%s", user, pass, host, port)
	dbName := os.Getenv("MONGO_DB")
	if dbName == "" {
		dbName = "bookstore"
	}

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(context.Background())

	coll := client.Database(dbName).Collection("books")

	cursor, err := coll.Find(context.Background(), bson.M{})
	if err != nil {
		log.Fatal(err)
	}
	defer cursor.Close(context.Background())

	count := 0
	for cursor.Next(context.Background()) {
		var doc bson.M
		if err := cursor.Decode(&doc); err != nil {
			log.Fatal(err)
		}

		id, ok := doc["_id"].(string)
		if !ok {
			continue
		}
		name, _ := doc["name"].(string)

		update := bson.M{
			"$set": bson.M{
				"images": []bson.M{
					{
						"isPrimary": true,
						"alt":       name,
						"url":       fmt.Sprintf("https://picsum.photos/seed/%s/400/600", id),
					},
				},
			},
		}

		_, err := coll.UpdateOne(context.Background(), bson.M{"_id": id}, update)
		if err != nil {
			log.Fatal(err)
		}
		count++
	}

	fmt.Printf("Successfully updated %d books with picsum images\n", count)
}
