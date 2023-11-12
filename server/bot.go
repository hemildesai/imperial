package server

import (
	"errors"
	"imperials/entities"
	"unicode"

	"github.com/Pallinder/go-randomdata"
	"github.com/google/uuid"
)

func (hub *WsHub) StartBot() error {
	botname := randomdata.SillyName() + "*"

	if hub.terminating {
		return errors.New("hub is terminating")
	}

	playerNumber := hub.DisconnectOtherClients(botname, "Remove duplicate bot.")
	if playerNumber < 0 || playerNumber >= 6 || playerNumber >= hub.Game.Settings.MaxPlayers {
		return errors.New("too many players to add bot")
	}

	client := &WsClient{
		Hub:         hub,
		Disconnect:  make(chan bool),
		ChatEnabled: false,
	}
	player, err := entities.NewPlayer(entities.Base, uuid.New().String(), botname, uint16(playerNumber))
	if err != nil {
		return err
	}
	client.Player = player

	if hub.Game.Initialized {
		gamePlayer, err := hub.Game.ReplacePlayer(player)
		client.Player = gamePlayer

		if err != nil {
			return err
		}
	}

	client.Ready = true
	client.Player.SetIsBot(true)
	client.MessageChannel = client.Player.MessageChannel
	client.Hub.Register(client)

	// Keep flushing messages
	go func(c *WsClient) {
		for {
			select {
			case _, ok := <-c.MessageChannel:
				if !ok {
					return
				}
			case <-c.Disconnect:
				return
			}
		}
	}(client)

	return nil
}

func IsValidUsername(u string) bool {
	if len(u) < 3 || len(u) >= 20 {
		return false
	}

	for _, r := range u {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) {
			return false
		}
	}
	return true
}
