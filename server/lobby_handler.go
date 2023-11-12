package server

import (
	"imperials/entities"
	"log"
	"math/rand"
	"sort"
	"sync/atomic"
	"time"

	"github.com/mitchellh/mapstructure"
	"github.com/vmihailenco/msgpack/v5"
)

const (
	// Request Types
	WsLobbyRequestTypeInit                string = "i"
	WsLobbyRequestTypeSinglePlayer        string = "sp"
	WsLobbyRequestTypeUpdateUsername      string = "uu"
	WsLobbyRequestTypeSetSettings         string = "ss"
	WsLobbyRequestTypeSetAdvancedSettings string = "sas"
	WsLobbyRequestTypeBotAdd              string = "bot_a"
	WsLobbyRequestTypeKick                string = "k"
	WsLobbyRequestTypeReady               string = "r"
	WsLobbyRequestTypeStartGame           string = "sg"

	// Response Types
	WsLobbyResponseTypePlayers          string = "rr-lp"
	WsLobbyResponseTypeGameStarted      string = "rr-lgs"
	WsLobbyResponseTypeSettings         string = "rr-s"
	WsLobbyResponseTypeAdvancedSettings string = "rr-as"
	WsLobbyResponseTypeSettingsOptions  string = "rr-so"
)

func (ws *WsClient) handleLobby(msg map[string]interface{}) {
	ws.Hub.Mutex.Lock()
	defer ws.Hub.Mutex.Unlock()

	if ws.Hub.Game.Initialized {
		ws.SendGameStartedMessage()
		return
	}

	switch msg["t"] {
	case WsLobbyRequestTypeInit:
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyPlayersMessage())
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbySettingsMessage())
		go func() { ws.sendLobbyMessage(ws.GetLobbySettingsOptionsMessage()) }()

	case WsLobbyRequestTypeSinglePlayer:
		if ws.Player.Order != 0 || ws.Hub.Game.Initialized || atomic.LoadInt32(&ws.Hub.NumClients) != 1 {
			return
		}
		for i := 0; i < 3; i++ {
			ws.Hub.StartBot()
		}
		ws.Hub.Game.Settings.Private = false
		ws.Hub.Game.Settings.EnableKarma = false
		ws.Hub.Game.Settings.Speed = "slow"
		ws.Ready = true
		go ws.Hub.StoreSettings()
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbySettingsMessage())
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyPlayersMessage())

	case WsLobbyRequestTypeUpdateUsername:
		var username string
		mapstructure.Decode(msg["username"], &username)
		if !IsValidUsername(username) {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "invalid username",
			})
			return
		}
		ws.Player.Username = username
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyPlayersMessage())

	case WsLobbyRequestTypeSetSettings:
		if ws.Player.Order != 0 {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "only host can change settings",
			})
			return
		}
		mapstructure.Decode(msg["settings"], &ws.Hub.Game.Settings)
		go ws.Hub.StoreSettings()
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbySettingsMessage())

	case WsLobbyRequestTypeSetAdvancedSettings:
		if !ws.Hub.Game.Settings.Advanced {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "advanced settings are disabled",
			})
			return
		}

		if ws.Player.Order != 0 {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "only host can change settings",
			})
			return
		}
		mapstructure.Decode(msg["advanced"], &ws.Hub.Game.AdvancedSettings)
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyAdvancedSettingsMessage())

	case WsLobbyRequestTypeBotAdd:
		if ws.Hub.Game.Initialized {
			return
		}

		if ws.Player.Order != 0 {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "only host can add bots",
			})
			return
		}

		err := ws.Hub.StartBot()
		if err != nil {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: err.Error(),
			})
			return
		}
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyPlayersMessage())

	case WsLobbyRequestTypeKick:
		if ws.Hub.Game.Initialized {
			return
		}

		if ws.Player.Order != 0 {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "only host can kick people",
			})
			return
		}

		var u string
		err := mapstructure.Decode(msg["username"], &u)
		if err != nil {
			return
		}
		ws.Hub.DisconnectOtherClients(u, "E745: The host has banned you from this game.")
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyPlayersMessage())

		num := 0
		ws.Hub.BannedUsers.Range(func(key, value interface{}) bool {
			num += 1
			return true
		})
		if num <= 50 {
			ws.Hub.BannedUsers.Store(u, true)
		}

	case WsLobbyRequestTypeReady:
		if ws.Hub.Game.Initialized {
			return
		}
		mapstructure.Decode(msg["ready"], &ws.Ready)
		ws.Hub.BroadcastLobbyMessage(ws.Hub.GetLobbyPlayersMessage())

	case WsLobbyRequestTypeStartGame: // Start Game
		if ws.Player.Order != 0 {
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "only host can start game",
			})
			return
		}

		numPlayers := atomic.LoadInt32(&ws.Hub.NumClients)
		if numPlayers < 2 {
			log.Println("not enough players to start game")
			ws.sendLobbyMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "not enough players to start game",
			})
			return
		}

		gameId := ws.Hub.Game.ID
		if p, err := ws.Hub.Game.Store.ReadGamePlayers(gameId); err == nil && p > 0 {
			if numPlayers > int32(p) {
				log.Println("too many players to start game")
				ws.sendLobbyMessage(&entities.Message{
					Type: entities.MessageTypeError,
					Data: "too many players to start game",
				})
				return
			}
			numPlayers = int32(p)
		} else {
			ws.Hub.Game.Store.WriteGamePlayers(gameId, numPlayers)
		}

		startGame(gameId, numPlayers, ws.Hub)
	}
}

func startGame(gameId string, numPlayers int32, hub *WsHub) {
	g, err := hub.Game.Initialize(gameId, uint16(numPlayers))

	if err != nil {
		log.Println("error creating game: ", err)
		return
	}

	serialized, err := msgpack.Marshal(hub.Game.GenerateStoreGameState())
	if err != nil {
		log.Println("error serializing game: ", err)
	} else {
		hub.Game.Store.CreateGameStateIfNotExists(gameId, serialized)
	}

	if g.InitPhase {
		clientPlayers := make([]*entities.Player, 0)

		hub.Clients.Range(func(key, value interface{}) bool {
			client := key.(*WsClient)
			clientPlayers = append(clientPlayers, client.Player)
			return true
		})

		playerOrder := make([]int, len(hub.Game.Players))
		for i := range hub.Game.Players {
			playerOrder[i] = i
		}

		rand.Seed(time.Now().UnixNano())
		rand.Shuffle(len(playerOrder), func(i, j int) {
			playerOrder[i], playerOrder[j] = playerOrder[j], playerOrder[i]
		})

		for i, cp := range clientPlayers {
			hub.Game.SetUsername(hub.Game.Players[playerOrder[i]], cp.Username)
			hub.Game.SetId(hub.Game.Players[playerOrder[i]], cp.Id)
			cp.Order = uint16(playerOrder[i])
			hub.Game.Store.WriteGameIdForUser(gameId, cp.Id, &hub.Game.Settings)
		}
	}

	hub.Clients.Range(func(key, value interface{}) bool {
		client := key.(*WsClient)
		client.SendGameStartedMessage()
		return true
	})

	hub.Game.Store.WriteGameStarted(gameId)
	serialized, err = msgpack.Marshal(hub.Game.GenerateStoreGameState())
	if err != nil {
		log.Println("error serializing game: ", err)
	} else {
		hub.Game.Store.WriteGameState(gameId, serialized)
	}

	if g.InitPhase {
		g.RunInitPhase()
	}
}

func (ws *WsClient) SendGameStartedMessage() {
	playerOrder := ws.Player.Order
	for _, p := range ws.Hub.Game.Players {
		if p.Id == ws.Player.Id {
			playerOrder = p.Order
			break
		}
	}

	ws.sendLobbyMessage(&entities.Message{
		Type: WsLobbyResponseTypeGameStarted,
		Data: playerOrder,
	})
}

func (h *WsHub) GetLobbyPlayersMessage() *entities.Message {
	players := make([]*entities.LobbyPlayerState, 0)
	h.Clients.Range(func(key, value interface{}) bool {
		c := key.(*WsClient)
		p := c.Player
		players = append(players, &entities.LobbyPlayerState{
			Username:      p.Username,
			Order:         p.Order,
			Color:         p.Color,
			Ready:         c.Ready,
			GamesStarted:  c.GamesStarted,
			GamesFinished: c.GamesFinished,
		})
		return true
	})

	sort.Slice(players, func(i, j int) bool {
		return players[i].Order < players[j].Order
	})

	return &entities.Message{
		Location: entities.WsMsgLocationLobby,
		Type:     WsLobbyResponseTypePlayers,
		Data:     players,
	}
}

func (ws *WsClient) GetLobbySettingsOptionsMessage() *entities.Message {
	mapNames := ws.Hub.Game.Store.GetOfficalMapNames()

	myMaps, err := ws.Hub.Game.Store.GetAllMapNamesForUser(ws.Player.Id, false)
	if err == nil && len(myMaps) > 0 {
		mapNames = append(mapNames, "")
		mapNames = append(mapNames, "------ My Maps ------")
		mapNames = append(mapNames, myMaps...)
	}

	communityMaps, err := ws.Hub.Game.Store.GetAllMapNamesForUser(ws.Player.Id, true)
	if err == nil && len(communityMaps) > 0 {
		mapNames = append(mapNames, "")
		mapNames = append(mapNames, "--- Community Maps ---")
		mapNames = append(mapNames, communityMaps...)
	}

	return &entities.Message{
		Location: entities.WsMsgLocationLobby,
		Type:     WsLobbyResponseTypeSettingsOptions,
		Data: map[string]interface{}{
			"MapName": mapNames,
		},
	}
}

func (h *WsHub) GetLobbySettingsMessage() *entities.Message {
	return &entities.Message{
		Location: entities.WsMsgLocationLobby,
		Type:     WsLobbyResponseTypeSettings,
		Data:     h.Game.Settings,
	}
}

func (h *WsHub) GetLobbyAdvancedSettingsMessage() *entities.Message {
	return &entities.Message{
		Location: entities.WsMsgLocationLobby,
		Type:     WsLobbyResponseTypeAdvancedSettings,
		Data:     h.Game.AdvancedSettings,
	}
}
