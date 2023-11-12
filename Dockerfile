ARG HMAC_SECRET
ARG ENVIRONMENT
ARG SERVER_URL
ARG FRONTEND_URL
ARG SENTRY_DSN
ARG MONGO_URL

FROM golang:1-alpine

WORKDIR /app

COPY go.* ./
RUN go mod download

COPY . .
RUN go build -o imperials ./cmd/server/main.go

FROM alpine:latest
WORKDIR /app
COPY --from=0 /app/imperials .

CMD ["/app/imperials"]