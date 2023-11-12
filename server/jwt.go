package server

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strconv"
	"time"

	jwt "github.com/golang-jwt/jwt/v5"
	_ "github.com/joho/godotenv/autoload"
)

type (
	ContextKey    string
	JWTMiddleware struct {
		Header string
	}
)

func (m *JWTMiddleware) ServeHTTP(w http.ResponseWriter, r *http.Request, next http.HandlerFunc) {
	if r.URL.Path == "/anon" || r.URL.Path == "/heartbeat" {
		next(w, r)
		return
	}

	authHeader := r.Header.Get(m.Header)
	if r.Header.Get("Upgrade") == "websocket" {
		authHeader = r.URL.Query().Get("token")
	}
	token, err := VerifyJWT(authHeader)

	if err != nil {
		WriteJson(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
		return
	}

	if _, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		ctx := context.WithValue(r.Context(), ContextKey("username"), token.Claims.(jwt.MapClaims)["username"])
		ctx = context.WithValue(ctx, ContextKey("id"), token.Claims.(jwt.MapClaims)["id"])
		ctx = context.WithValue(ctx, ContextKey("claims"), token.Claims.(jwt.MapClaims))
		next(w, r.WithContext(ctx))
		return
	}

	WriteJson(w, http.StatusUnauthorized, map[string]string{"error": "invalid token"})
}

func GenerateRandomString(n int) (string, error) {
	const letters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
	ret := make([]byte, n)
	for i := 0; i < n; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(letters))))
		if err != nil {
			return "", err
		}
		ret[i] = letters[num.Int64()]
	}

	return string(ret), nil
}

// For HMAC signing method, the key can be any []byte. It is recommended to generate
// a key using crypto/rand or something equivalent. You need the same key for signing
// and validating.
func GenerateJWT(id, username string) (string, error) {
	hmacSecret := []byte(os.Getenv("HMAC_SECRET"))
	// Create a new token object, specifying signing method and the claims
	// you would like it to contain.
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"version":  2,
		"id":       id,
		"username": username,
		"nbf":      json.Number(strconv.FormatInt(time.Date(2015, 10, 10, 12, 0, 0, 0, time.UTC).Unix(), 10)),
		"iat":      json.Number(strconv.FormatInt(time.Now().Unix(), 10)),
	})

	// Sign and get the complete encoded token as a string using the secret
	return token.SignedString(hmacSecret)
}

func VerifyJWT(token string) (*jwt.Token, error) {
	// Parse takes the token string and a function for looking up the key. The latter is especially
	// useful if you use multiple keys for your application.  The standard is to use 'kid' in the
	// head of the token to identify which key to use, but the parsed token (head and claims) is provided
	// to the callback, providing flexibility.
	parsedToken, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		method, ok := token.Method.(*jwt.SigningMethodHMAC)
		if !ok && method.Name != "HS256" {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		// hmacSampleSecret is a []byte containing your secret, e.g. []byte("my_secret_key")
		return []byte(os.Getenv("HMAC_SECRET")), nil
	})

	return parsedToken, err
}
