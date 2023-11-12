package server

import (
	"imperials/entities"
	"log"

	"github.com/mitchellh/mapstructure"
	"github.com/vmihailenco/msgpack/v5"
)

func (ws *WsClient) handleMessage(message []byte) {
	msg := make(map[string]interface{})
	err := msgpack.Unmarshal(message, &msg)
	if err != nil {
		log.Println("failed to unmarshal msgpack", err)
		return
	}

	if ws.Player.IsSpectator && msg["t"] != "i" {
		return
	}

	// Uncomment to debug
	// log.Println("Player", ws.Player.Order, ":", msg)

	switch msg["l"] {
	case entities.WsMsgLocationLobby:
		ws.handleLobby(msg)
	case entities.WsMsgLocationGame:
		if !ws.Hub.Game.Initialized {
			ws.Player.SendMessage(&entities.Message{
				Type: entities.MessageTypeError,
				Data: "no game running",
			})
			return
		}

		ws.handleGame(msg)
	case entities.WsMsgLocationChat:
		var chat string
		mapstructure.Decode(msg["cmsg"], &chat)

		if len(chat) > 200 || len(chat) == 0 {
			return
		}

		sendChatMessage := func(client *WsClient, message *entities.Message) {
			if ws.Hub.Game.Initialized {
				client.Player.SendMessage(message)
			} else {
				client.sendLobbyMessage(message)
			}
		}

		broadcast := true
		chatText := ws.Player.Username + ": " + chat

		commandOutput, err := processCommand(chat, ws)

		if err == nil {
			chatText += commandOutput
			broadcast = false
		}

		broadcastMessage := &entities.Message{
			Type: entities.MessageTypeChat,
			Data: map[string]string{
				"color": ws.Player.Color,
				"text":  chatText,
			},
		}

		if broadcast {
			ws.Hub.Clients.Range(func(key, value interface{}) bool {
				client := key.(*WsClient)
				if !client.ChatEnabled {
					return true
				}

				sendChatMessage(client, broadcastMessage)
				return true
			})
		} else {
			sendChatMessage(ws, broadcastMessage)
		}
	}
}
