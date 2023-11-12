package server

import (
	"imperials/entities"
	"log"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/gorilla/websocket"
	"github.com/mitchellh/mapstructure"
	"github.com/vmihailenco/msgpack/v5"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 20 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	Newline = []byte{'\n'}
	Space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

// WsClient is a middleman between the websocket connection and the hub.
type WsClient struct {
	Hub *WsHub

	// The websocket connection.
	Conn *websocket.Conn

	// Disconnection channel
	Disconnect chan bool

	// Player reference
	Player *entities.Player

	// Reference to player's message channel
	MessageChannel chan []byte

	// Ready to start game
	Ready bool

	// Karma tracker
	GamesStarted  int32
	GamesFinished int32

	// Chat Toggle
	ChatEnabled bool
}

// ReadPump pumps messages from the websocket connection to the hub.
//
// The application runs ReadPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *WsClient) ReadPump() {
	defer func() {
		c.Hub.Unregister(c)
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Player.ResetInactivity()
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})
	for {
		_, message, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		atomic.AddInt32(&c.Hub.activity, 1)
		c.Player.ResetInactivity()
		go c.handleMessage(message)
	}
}

// WritePump pumps messages from the hub to the websocket connection.
//
// A goroutine running WritePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *WsClient) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.MessageChannel:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.Conn.NextWriter(websocket.BinaryMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-c.Disconnect:
			return

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *WsClient) sendLobbyMessage(m *entities.Message) {
	m.Location = entities.WsMsgLocationLobby
	json, err := msgpack.Marshal(m)
	if err != nil {
		return
	}
	select {
	case c.MessageChannel <- json:
	default:
	}
}

func RejectWs(w http.ResponseWriter, r *http.Request, status int, data string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	serialized, err := msgpack.Marshal(entities.Message{
		Type: entities.MessageTypeEndsess,
		Data: data,
	})
	if err != nil {
		return
	}

	conn.WriteMessage(websocket.BinaryMessage, serialized)
	conn.Close()
}

func StartWs(hub *WsHub, w http.ResponseWriter, r *http.Request) {
	hub.Mutex.Lock()
	defer hub.Mutex.Unlock()

	if hub.terminating {
		return
	}

	var id, username string
	err1 := mapstructure.Decode(r.Context().Value(ContextKey("username")), &username)
	err2 := mapstructure.Decode(r.Context().Value(ContextKey("id")), &id)
	if err1 != nil || err2 != nil || username == "" || id == "" {
		return
	}

	if _, found := hub.BannedUsers.Load(username); found {
		RejectWs(w, r, 403, "E745: The host has banned you from this game")
		return
	}

	playerNumber := hub.DisconnectOtherClients(username, "You have connected from another device or browser tab.")
	if !hub.Game.Initialized &&
		(playerNumber < 0 ||
			playerNumber >= 6 ||
			playerNumber >= hub.Game.Settings.MaxPlayers) {
		RejectWs(w, r, 403, "E746: Game is full")
		return
	}

	userDetails, err := hub.Game.Store.ReadUser(id)
	if err != nil {
		log.Println("error finidng user for client: ", err)
		w.WriteHeader(500)
		return
	}

	gamesStarted := int32(0)
	gamesFinished := int32(0)
	mapstructure.Decode(userDetails["started"], &gamesStarted)
	mapstructure.Decode(userDetails["finished"], &gamesFinished)

	client := &WsClient{
		Hub:           hub,
		Disconnect:    make(chan bool),
		GamesStarted:  gamesStarted,
		GamesFinished: gamesFinished,
		ChatEnabled:   true,
	}
	player, err := entities.NewPlayer(
		entities.Base,
		id,
		username,
		uint16(playerNumber),
	)

	if err != nil {
		log.Println("error creating player for client: ", err)
		w.WriteHeader(500)
		return
	}

	client.Player = player

	if hub.Game.Initialized {
		gamePlayer, err := hub.Game.ReplacePlayer(player)
		if err != nil {
			hub.Game.AddSpectator(client.Player)
		} else {
			client.Player = gamePlayer
		}
		client.Player.ResetInactivity()
	}

	client.MessageChannel = client.Player.MessageChannel

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	client.Conn = conn
	client.Hub.Register(client)

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.WritePump()
	go client.ReadPump()
}

func (hub *WsHub) DisconnectOtherClients(username string, reason string) int {
	playerNumber := 0
	foundOldClient := false

	hub.Clients.Range((func(key, value interface{}) bool {
		c := key.(*WsClient)
		if c.Player == nil {
			return true
		}

		if c.Player.Username == username {
			playerNumber = int(c.Player.Order)
			msg := &entities.Message{
				Type: entities.MessageTypeEndsess,
				Data: reason,
			}
			c.Player.SendMessage(msg)
			c.Hub.Unregister(c)
			foundOldClient = true
		} else if !foundOldClient {
			playerNumber++
		}
		return true
	}))

	return playerNumber
}
