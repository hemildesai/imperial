package mango

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	ServersTable    = "servers"
	GamesTable      = "games"
	GameStatesTable = "game_states"
	UsersTable      = "users"
	MapsTable       = "maps"
)

const (
	GAME_EXPIRE_TIME = int32(24 * 60 * 60) // 1 day
)

func CreateServersTable() {
	db := GetDatabase()

	collection := db.Collection(ServersTable)

	unique := true
	url := mongo.IndexModel{
		Keys: bson.M{
			"url": 1,
		},
		Options: &options.IndexOptions{
			Unique: &unique,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), url)

	expiry := int32(60)
	collection.Indexes().CreateOne(context.TODO(), mongo.IndexModel{
		Keys: bson.M{
			"updatedAt": 1,
		},
		Options: &options.IndexOptions{
			ExpireAfterSeconds: &expiry,
		},
	})
	log.Println("Created table", ServersTable)
}

func CreateGamesTable() {
	db := GetDatabase()

	collection := db.Collection(GamesTable)

	unique := true

	collection.Indexes().CreateOne(context.TODO(), mongo.IndexModel{
		Keys: bson.M{
			"id": 1,
		},
		Options: &options.IndexOptions{
			Unique: &unique,
		},
	})

	collection.Indexes().CreateOne(context.TODO(), mongo.IndexModel{
		Keys: bson.M{
			"stage": 1,
		},
	})

	expiry := GAME_EXPIRE_TIME
	collection.Indexes().CreateOne(context.TODO(), mongo.IndexModel{
		Keys: bson.M{
			"updatedAt": 1,
		},
		Options: &options.IndexOptions{
			ExpireAfterSeconds: &expiry,
		},
	})

	log.Println("Created table", GamesTable)
}

func CreateGameStatesTable() {
	log.Println("Created table", GameStatesTable)
}

func CreateUsersTable() {
	db := GetDatabase()

	collection := db.Collection(UsersTable)

	unique := true
	username := mongo.IndexModel{
		Keys: bson.M{
			"username": 1,
		},
		Options: &options.IndexOptions{
			Unique: &unique,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), username)

	unique = true
	id := mongo.IndexModel{
		Keys: bson.M{
			"id": 1,
		},
		Options: &options.IndexOptions{
			Unique: &unique,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), id)

	email := mongo.IndexModel{
		Keys: bson.M{
			"email": 1,
		},
		Options: &options.IndexOptions{
			Unique: &unique,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), email)
	log.Println("Created table", UsersTable)
}

func CreateMapsTable() {
	db := GetDatabase()

	collection := db.Collection(MapsTable)

	unique := true
	name := mongo.IndexModel{
		Keys: bson.M{
			"name": 1,
		},
		Options: &options.IndexOptions{
			Unique: &unique,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), name)

	unique = true
	creator := mongo.IndexModel{
		Keys: bson.M{
			"creator": 1,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), creator)

	official := mongo.IndexModel{
		Keys: bson.M{
			"official": 1,
		},
	}
	collection.Indexes().CreateOne(context.TODO(), official)
	log.Println("Created table", MapsTable)
}
