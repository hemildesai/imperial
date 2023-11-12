package mango

import (
	"os"

	"go.mongodb.org/mongo-driver/mongo/options"

	_ "github.com/joho/godotenv/autoload"
)

func GetConfig() (*options.ClientOptions, error) {
	if os.Getenv("ENVIRONMENT") == "production" {
		return GetProductionConfig()
	} else {
		return GetLocalConfig()
	}
}

func GetLocalConfig() (*options.ClientOptions, error) {
	clientOptions := options.Client().ApplyURI(os.Getenv("MONGO_URL"))
	clientOptions.SetMaxPoolSize(10)
	return clientOptions, nil
}

func GetProductionConfig() (*options.ClientOptions, error) {
	clientOptions := options.Client().ApplyURI(os.Getenv("MONGO_URL"))
	clientOptions.SetMaxPoolSize(10)
	return clientOptions, nil
}
