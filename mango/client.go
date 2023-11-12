package mango

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/mongo"
)

var MangoClient *mongo.Client

const MANGO_DATABASE = "imperials"

func GetClient() (*mongo.Client, error) {
	if MangoClient != nil {
		return MangoClient, nil
	}

	clientOptions, err := GetConfig()

	if err != nil {
		return nil, err
	}

	client, err := mongo.Connect(context.TODO(), clientOptions)

	if err != nil {
		log.Fatal(err)
	}

	// Check the connection
	err = client.Ping(context.TODO(), nil)

	if err != nil {
		log.Fatal(err)
	}

	log.Println("Connected to MongoDB!")
	MangoClient = client
	return MangoClient, nil
}

func GetDatabase() *mongo.Database {
	client, err := GetClient()
	if err != nil {
		log.Fatal(err)
	}
	return client.Database(MANGO_DATABASE)
}

func Disconnect() {
	if MangoClient != nil {
		err := MangoClient.Disconnect(context.TODO())
		if err != nil {
			log.Println(err)
			return
		}
		log.Println("Connection to MongoDB closed.")
	}
}
