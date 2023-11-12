package mango

import (
	"context"
	"encoding/json"
	"errors"
	"imperials/entities"
	"os"
	"time"

	"github.com/mitchellh/mapstructure"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type (
	MangoStore struct {
	}
)

func (ds *MangoStore) Init(id string) error {
	return ds.CreateGameIfNotExists(id)
}

func (ds *MangoStore) CreateGameIfNotExists(id string) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)

	upsert := true
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{
			Key: "$setOnInsert",
			Value: bson.M{
				"id":             id,
				"createdAt":      time.Now(),
				"stage":          0,
				"players":        0,
				"active_players": 0,
				"server":         os.Getenv("SERVER_URL"),
				"journal":        bson.A{},
				"private":        false,
				"updatedAt":      time.Now(),
			}}},
		&options.UpdateOptions{
			Upsert: &upsert,
		},
	)

	return err
}

func (ds *MangoStore) TerminateGame(id string) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.DeleteOne(context.TODO(), bson.D{primitive.E{Key: "id", Value: id}})
	return err
}

func (ds *MangoStore) WriteGameServer(id string) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"server": os.Getenv("SERVER_URL"),
		}}},
	)
	return err
}

func (ds *MangoStore) WriteGameStarted(id string) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"stage":     1,
			"updatedAt": time.Now(),
		}}},
	)
	return err
}

func (ds *MangoStore) WriteGameFinished(id string) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"stage":     2,
			"updatedAt": time.Now(),
		}}},
	)
	return err
}

func (ds *MangoStore) WriteGameActivePlayers(id string, numPlayers int32, host string) error {
	updateSet := bson.M{
		"active_players": int(numPlayers),
		"updatedAt":      time.Now(),
	}
	if host != "" {
		updateSet["host"] = host
	}

	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: updateSet}},
	)
	return err
}

func (ds *MangoStore) WriteGamePlayers(id string, numPlayers int32) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}, primitive.E{Key: "stage", Value: 0}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"players":   int(numPlayers),
			"updatedAt": time.Now(),
		}}},
	)
	return err
}

func (ds *MangoStore) WriteGamePrivacy(id string, private bool) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"private":   private,
			"updatedAt": time.Now(),
		}}},
	)
	return err
}

func (ds *MangoStore) WriteGameSettings(id string, settings []byte) error {
	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}, primitive.E{Key: "stage", Value: 0}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"settings":  settings,
			"updatedAt": time.Now(),
		}}},
	)
	return err
}

func (ds *MangoStore) WriteJournalEntries(id string, entries [][]byte) error {

	var bsonEntries bson.A
	for _, val := range entries {
		bsonEntries = append(bsonEntries, val)
	}

	db := GetDatabase()
	collection := db.Collection(GamesTable)
	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{
			primitive.E{Key: "$push",
				Value: bson.M{
					"journal": bson.M{
						"$each": bsonEntries,
					},
				},
			},
			primitive.E{Key: "$set",
				Value: bson.M{
					"updatedAt": time.Now(),
				},
			},
		},
	)
	return err
}

func (ds *MangoStore) ReadJournal(id string) ([][]byte, error) {
	db := GetDatabase()
	collection := db.Collection(GamesTable)

	var m map[string]interface{}
	res := collection.FindOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
	)
	if res == nil {
		return nil, errors.New("database entry for journal not found")
	}
	res.Decode(&m)

	journalBytes := make([][]byte, 0)
	journal := m["journal"].(bson.A)
	for _, e := range journal {
		journalBytes = append(journalBytes, e.(primitive.Binary).Data)
	}

	return journalBytes, nil
}

func (ds *MangoStore) ReadGamePlayers(id string) (int, error) {
	db := GetDatabase()
	collection := db.Collection(GamesTable)

	var m map[string]interface{}
	res := collection.FindOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		&options.FindOneOptions{
			Projection: bson.M{"players": 1},
		},
	)
	res.Decode(&m)

	if m["players"] == nil {
		return 0, errors.New("database entry for game not found")
	}

	return int(m["players"].(int32)), nil
}

func (ds *MangoStore) CheckIfJournalExists(id string) (bool, error) {
	j, err := ds.ReadJournal(id)
	if err != nil {
		return false, err
	}
	return len(j) > 0, nil
}

func (ds *MangoStore) GetGameStateIdFromGameId(id string) (primitive.ObjectID, error) {
	db := GetDatabase()
	collection := db.Collection(GamesTable)

	var m map[string]interface{}
	res := collection.FindOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		&options.FindOneOptions{
			Projection: bson.M{"state_id": 1},
		},
	)
	if res == nil {
		return primitive.NewObjectID(), nil
	}

	res.Decode(&m)
	sid, ok := m["state_id"]
	if ok {
		return sid.(primitive.ObjectID), nil
	}

	return primitive.NewObjectID(), errors.New("no state id found")
}

func (ds *MangoStore) CreateGameStateIfNotExists(id string, state []byte) error {
	db := GetDatabase()
	collection := db.Collection(GameStatesTable)

	sid, err := ds.GetGameStateIdFromGameId(id)
	if err == nil {
		return errors.New("game state already created")
	}

	upsert := true
	res, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "_id", Value: sid}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"createdAt": time.Now(),
			"state":     state,
		}}},
		&options.UpdateOptions{
			Upsert: &upsert,
		},
	)
	if err != nil {
		return err
	}

	if res != nil && res.UpsertedID != nil {
		_, err = db.Collection(GamesTable).UpdateOne(
			context.TODO(),
			bson.D{primitive.E{Key: "id", Value: id}},
			bson.D{primitive.E{Key: "$set", Value: bson.M{
				"state_id": res.UpsertedID,
			}}},
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func (ds *MangoStore) WriteGameState(id string, state []byte) error {
	db := GetDatabase()
	collection := db.Collection(GameStatesTable)

	sid, err := ds.GetGameStateIdFromGameId(id)
	if err != nil {
		return errors.New("game state not created")
	}

	_, err = collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "_id", Value: sid}},
		bson.D{primitive.E{Key: "$set", Value: bson.M{
			"state": state,
		}}},
		&options.UpdateOptions{},
	)
	return err
}

func (ds *MangoStore) ReadGameState(id string) ([]byte, error) {
	db := GetDatabase()
	collection := db.Collection(GameStatesTable)

	sid, err := ds.GetGameStateIdFromGameId(id)
	if err != nil {
		return nil, errors.New("game state not created")
	}

	var m map[string]interface{}
	res := collection.FindOne(
		context.TODO(),
		bson.D{primitive.E{Key: "_id", Value: sid}},
		&options.FindOneOptions{},
	)
	if res == nil {
		return nil, errors.New("database entry for state not found")
	}
	res.Decode(&m)

	return m["state"].([]byte), nil
}

func (ds *MangoStore) WriteGameIdForUser(id string, userId string, settings *entities.GameSettings) error {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	sid, err := ds.GetGameStateIdFromGameId(id)
	if err != nil {
		return errors.New("game state not created")
	}

	startedInc := 1
	if !settings.EnableKarma {
		startedInc = 0
	}

	_, err = collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: userId}},
		bson.D{
			primitive.E{
				Key: "$push",
				Value: bson.M{
					"games": sid,
				},
			},
			primitive.E{
				Key: "$set",
				Value: bson.M{
					"updatedAt": time.Now(),
				},
			},
			primitive.E{
				Key: "$inc",
				Value: bson.M{
					"started": startedInc,
				},
			},
		},
	)
	return err
}

func (ds *MangoStore) WriteGameCompletedForUser(id string) error {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	_, err := collection.UpdateOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		bson.D{
			primitive.E{
				Key: "$set",
				Value: bson.M{
					"updatedAt": time.Now(),
				},
			},
			primitive.E{
				Key: "$inc",
				Value: bson.M{
					"finished": 1,
				},
			},
		},
	)
	return err
}

func (ds *MangoStore) ReadUser(id string) (map[string]interface{}, error) {
	db := GetDatabase()
	collection := db.Collection(UsersTable)

	var m map[string]interface{}
	res := collection.FindOne(
		context.TODO(),
		bson.D{primitive.E{Key: "id", Value: id}},
		&options.FindOneOptions{},
	)
	if res == nil {
		return nil, errors.New("database entry for user not found")
	}
	res.Decode(&m)

	return m, nil
}

func (ds *MangoStore) GetOfficalMapNames() []string {
	db := GetDatabase()
	collection := db.Collection(MapsTable)

	var m []map[string]interface{}
	res, err := collection.Find(
		context.TODO(),
		bson.D{primitive.E{Key: "official", Value: true}},
		&options.FindOptions{
			Projection: bson.M{"_id": 0, "name": 1},
			Sort:       bson.D{primitive.E{Key: "name", Value: 1}},
		},
	)
	if err != nil || res == nil {
		return make([]string, 0)
	}

	res.All(context.TODO(), &m)

	var names []string
	for _, v := range m {
		var name string
		mapstructure.Decode(v["name"], &name)
		if name != "" {
			names = append(names, name)
		}
	}

	return names
}

// Get all maps excluding user maps if exclude
func (ds *MangoStore) GetAllMapNamesForUser(userId string, exclude bool) ([]string, error) {
	db := GetDatabase()
	collection := db.Collection(MapsTable)

	var filter bson.D
	if !exclude {
		filter = bson.D{primitive.E{Key: "creator", Value: userId}}
	} else {
		filter = bson.D{
			primitive.E{Key: "creator", Value: bson.M{"$ne": userId}},
			primitive.E{Key: "official", Value: bson.M{"$ne": true}},
		}
	}

	var m []map[string]interface{}
	res, err := collection.Find(
		context.TODO(),
		filter,
		&options.FindOptions{
			Projection: bson.M{"_id": 0, "name": 1},
			Sort:       bson.D{primitive.E{Key: "name", Value: 1}},
		},
	)
	if err != nil || res == nil {
		return nil, errors.New("could not get maps")
	}

	res.All(context.TODO(), &m)

	var names []string
	for _, v := range m {
		if v["name"] != nil {
			names = append(names, v["name"].(string))
		}
	}

	return names, nil
}

func (ds *MangoStore) GetMap(name string) *entities.MapDefinition {
	db := GetDatabase()
	collection := db.Collection(MapsTable)

	var m map[string]interface{}
	res := collection.FindOne(
		context.TODO(),
		bson.D{primitive.E{Key: "name", Value: name}},
		&options.FindOneOptions{},
	)
	if res == nil {
		return nil
	}
	res.Decode(&m)

	var ans *entities.MapDefinition
	marshal, err := json.Marshal(m["map"])
	if err == nil {
		json.Unmarshal(marshal, &ans)
	}
	return ans
}
