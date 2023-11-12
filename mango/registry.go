package mango

import (
	"context"
	"errors"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type (
	MangoRegistry struct{}
)

func (mr *MangoRegistry) Init() {}

func (mr *MangoRegistry) Register(url, region string) error {
	CreateServersTable()
	CreateUsersTable()
	CreateGamesTable()
	CreateGameStatesTable()
	CreateMapsTable()
	mr.Heartbeat(url)
	return nil
}

func (mr *MangoRegistry) Heartbeat(url string) error {
	db := GetDatabase()
	collection := db.Collection(ServersTable)

	upsert := true
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "url", Value: url}},
		bson.D{
			primitive.E{Key: "$set", Value: bson.M{
				"updatedAt": time.Now(),
			}},
			primitive.E{Key: "$setOnInsert", Value: bson.M{
				"url":       url,
				"createdAt": time.Now(),
			}},
		},
		&options.UpdateOptions{
			Upsert: &upsert,
		},
	)

	return err
}

func (mr *MangoRegistry) CreateUser(id, username string) error {
	return mr.CreateUserWithEmail(id, username, username+"@imperials.app")
}

func (mr *MangoRegistry) CreateUserWithEmail(id, username, email string) error {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	_, err := collection.InsertOne(
		context.TODO(),
		bson.M{
			"id":        id,
			"username":  username,
			"email":     email,
			"createdAt": time.Now(),
			"updatedAt": time.Now(),
			"games":     bson.A{},
			"started":   0,
			"finished":  0,
		},
		nil,
	)

	return err
}

func (mr *MangoRegistry) CheckIfUserExists(id string) (bool, error) {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	var result map[string]interface{}
	output := collection.FindOne(context.TODO(), bson.D{primitive.E{Key: "id", Value: id}}, &options.FindOneOptions{})
	if output == nil {
		return false, nil
	}

	err := output.Decode(&result)

	if err != nil {
		return false, err
	}

	return true, nil
}

func (mr *MangoRegistry) CheckIfUserEmailExists(email string) (map[string]interface{}, error) {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	var result map[string]interface{}
	output := collection.FindOne(context.TODO(), bson.D{primitive.E{Key: "email", Value: email}}, &options.FindOneOptions{})
	if output == nil {
		return nil, errors.New("email not found")
	}

	err := output.Decode(&result)
	if err != nil {
		return nil, err
	}

	return result, nil
}

func (mr *MangoRegistry) UpdateUsername(id, username string) error {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"username": username,
		}}},
		nil,
	)

	return err
}

func (mr *MangoRegistry) UpdateEmail(id, email string) error {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"email": email,
		}}},
		nil,
	)

	return err
}
