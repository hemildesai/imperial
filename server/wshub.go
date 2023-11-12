package server

import (
	"imperials/entities"
	"imperials/game"
	"imperials/mango"
	"imperials/maps"
	"log"
	"sync"
	"sync/atomic"
	"time"

	"github.com/vmihailenco/msgpack/v5"
)

const (
	MAX_INACTIVE_HUB_SEC         = 300 // 5 minutes
	MAX_INACTIVE_HUB_NOHUMAN_SEC = 60  // 1 minute
	MAX_INACTIVE_PLAYER_SEC      = 120 // 2 minutes
)

// WsHub maintains the set of active clients and broadcasts messages to the
// clients.
type WsHub struct {
	// Registered Clients.
	Clients    sync.Map
	NumClients int32

	// Inactivity timer
	activity        int32
	inactiveSeconds int32
	terminating     bool

	// Game reference
	Game game.Game

	// Server reference to deregister yourself
	Server *Server

	// Mutex for new connections to this hub
	Mutex sync.Mutex

	// List of banned users
	BannedUsers sync.Map
}

func (s *Server) NewWsHub(id string) *WsHub {
	hub := &WsHub{
		Clients:    sync.Map{},
		NumClients: 0,
		Game: game.Game{
			ID:          id,
			Initialized: false,
			Store:       &mango.MangoStore{},
			Settings: entities.GameSettings{
				Mode:          entities.Base,
				MapName:       "Base",
				DiscardLimit:  7,
				VictoryPoints: 10,
				MaxPlayers:    4,
				EnableKarma:   true,
				Speed:         entities.NormalSpeed,
				Advanced:      false,
			},
			AdvancedSettings: entities.AdvancedSettings{
				RerollOn7: false,
			},
		},
		Server: s,
	}

	s.hubs.Store(id, hub)

	hub.Mutex.Lock()
	defer hub.Mutex.Unlock()

	// TODO: Make sure the game is not running on a different server
	if p, err := hub.Game.Store.ReadGamePlayers(id); err == nil && p > 1 {
		numPlayers := int32(p)
		startGame(id, numPlayers, hub)
		return hub
	}

	err := hub.Game.Store.Init(id)
	if err != nil {
		log.Println(id, err)
		return nil
	}

	err = hub.Game.Store.WriteGameServer(id)
	if err != nil {
		log.Println(id, err)
		return nil
	}

	settings, err := msgpack.Marshal(hub.Game.Settings)
	if err != nil {
		log.Println("error serializing game settings: ", err)
		return nil
	}

	err = hub.Game.Store.WriteGameSettings(id, settings)
	if err != nil {
		log.Println(id, err)
		return nil
	}

	return hub
}

func (h *WsHub) Tick(tickerPeriod int) bool {
	defer h.Game.Unlock()
	if h.Game.Lock() {
		for _, p := range append(h.Game.Players, h.Game.Spectators...) {
			val := atomic.AddInt32(&p.InactiveSeconds, int32(tickerPeriod))
			if val > MAX_INACTIVE_PLAYER_SEC && !p.GetIsBot() {
				p.SetIsBot(true)
				if p.IsSpectator {
					h.Game.RemoveSpectator(p)
				}
			}
		}
	}

	if atomic.LoadInt32(&h.activity) == 0 {
		h.inactiveSeconds += int32(tickerPeriod)
	} else {
		atomic.StoreInt32(&h.activity, 0)
		atomic.StoreInt32(&h.inactiveSeconds, 0)
		return true
	}

	// Check if any connected client has a human player
	hasHuman := false
	h.Clients.Range(func(key interface{}, value interface{}) bool {
		client := key.(*WsClient)
		if !client.Player.GetIsBot() {
			hasHuman = true
			return false
		}
		return true
	})

	if (hasHuman && h.inactiveSeconds >= MAX_INACTIVE_HUB_SEC) ||
		(!hasHuman && h.inactiveSeconds >= MAX_INACTIVE_HUB_NOHUMAN_SEC) {
		h.Terminate()
		return false
	}

	return true
}

func (h *WsHub) Start() {
	tickerPeriod := 5
	inactivityTicker := time.NewTicker(time.Second * time.Duration(tickerPeriod))

	for {
		select {
		case <-inactivityTicker.C:
			if !h.Tick(tickerPeriod) {
				return
			}
		}
	}
}

func (h *WsHub) Terminate() {
	h.Mutex.Lock()
	defer h.Mutex.Unlock()

	if h.terminating {
		return
	}

	h.terminating = true
	h.Server.RemoveHub(h.Game.ID)

	h.Clients.Range(func(key interface{}, value interface{}) bool {
		client := key.(*WsClient)
		h.Unregister(client)
		return true
	})

	wasInitialized := h.Game.Initialized
	h.Game.Terminate()

	if !wasInitialized {
		h.Game.Store.TerminateGame(h.Game.ID)
	}
}

func (h *WsHub) Register(client *WsClient) {
	h.Clients.Store(client, true)
	atomic.AddInt32(&h.NumClients, 1)

	if !client.Hub.Game.Initialized {
		numPlayers := atomic.LoadInt32(&h.NumClients)
		go h.Game.Store.WriteGameActivePlayers(h.Game.ID, numPlayers, h.GetHostUsername())
	}
}

func (h *WsHub) Unregister(client *WsClient) {
	if _, ok := h.Clients.Load(client); !ok {
		return // already disconnected
	}

	h.Clients.Delete(client)

	select {
	case client.Disconnect <- true:
	default:
	}

	if client.Player.IsSpectator {
		h.Game.Lock()
		h.Game.RemoveSpectator(client.Player)
		h.Game.Unlock()
	}

	atomic.AddInt32(&h.NumClients, -1)

	if !h.Game.Initialized {
		h.Clients.Range(func(key interface{}, value interface{}) bool {
			p := key.(*WsClient).Player
			if p != nil && p.Order > client.Player.Order {
				p.Order--
				p.Color = entities.GetColor(p.Order)
			}
			return true
		})

		if client.Player != nil && client.Player.Order == 0 {
			// Host left the game
			// Kick off the bots
			h.Clients.Range(func(key interface{}, value interface{}) bool {
				c := key.(*WsClient)
				if c.Player != nil && c.Player.GetIsBot() {
					h.Unregister(c)
				}
				return true
			})
		}

		h.BroadcastLobbyMessage(h.GetLobbyPlayersMessage())
	}

	if !client.Hub.Game.Initialized {
		numPlayers := atomic.LoadInt32(&h.NumClients)
		go h.Game.Store.WriteGameActivePlayers(h.Game.ID, numPlayers, h.GetHostUsername())
	}
}

// Get username of player with order 0
// Returns blank string if game is initialized
func (h *WsHub) GetHostUsername() string {
	if h.Game.Initialized {
		return ""
	}

	var res *entities.Player
	h.Clients.Range((func(key, value interface{}) bool {
		client := key.(*WsClient)
		if client.Player.Order == 0 {
			res = client.Player
			return false
		}
		return true
	}))

	if res != nil {
		return res.Username
	}
	return "--"
}

func (h *WsHub) BroadcastLobbyMessage(msg *entities.Message) {
	h.Clients.Range((func(key, value interface{}) bool {
		client := key.(*WsClient)
		client.sendLobbyMessage(msg)
		return true
	}))
}

func (h *WsHub) StoreSettings() {
	h.Mutex.Lock()
	defer h.Mutex.Unlock()

	if h.Game.Settings.MapDefn == nil || h.Game.Settings.MapDefn.Name != h.Game.Settings.MapName {
		defn := h.Game.Store.GetMap(h.Game.Settings.MapName)

		// Get base map as default
		if defn == nil {
			h.Game.Settings.MapName = "Base"
			defn = maps.GetBaseMap()
			h.BroadcastLobbyMessage(h.GetLobbySettingsMessage())
		}
		h.Game.Settings.MapDefn = defn
	}

	h.Game.Store.WriteGamePrivacy(h.Game.ID, h.Game.Settings.Private)

	serialized, err := msgpack.Marshal(h.Game.Settings)
	if err != nil {
		log.Println("error serializing game: ", err)
	} else {
		err = h.Game.Store.WriteGameSettings(h.Game.ID, serialized)
		if err != nil {
			log.Println(h.Game.ID, err)
		}
	}
}
