package server

import (
	"errors"
	"imperials/entities"

	"github.com/mitchellh/mapstructure"
)

func (ws *WsClient) handleGame(msg map[string]interface{}) {
	defer ws.Hub.Game.Unlock()
	if !ws.Hub.Game.Lock() {
		return
	}

	switch msg["t"] {
	case "i": // Init
		ws.sendInitMessage()

	case "b": // Build or Buy
		err := ws.Hub.Game.EnsureCurrentPlayer(ws.Player)
		if err != nil {
			return
		}

		switch msg["o"] { // Object type
		case "s": // Settlement
			vertices := ws.Player.GetBuildLocationsSettlement(ws.Hub.Game.Graph, false, false)
			if len(vertices) == 0 || ws.Player.CanBuild(entities.BTSettlement) != nil {
				ws.Hub.Game.SendError(errors.New("nowhere to build or cannot build"), ws.Player)
				return
			}

			defer ws.Hub.Game.BroadcastState()
			res, err := ws.Hub.Game.BlockForAction(ws.Player, 0, &entities.PlayerAction{
				Type:      entities.PlayerActionTypeChooseVertex,
				Message:   "Choose location for settlement",
				CanCancel: true,
				Data:      entities.PlayerActionChooseVertex{Allowed: vertices},
			})

			if res == nil || err != nil { // Cancelled
				return
			}

			var loc entities.Coordinate
			err = mapstructure.Decode(res, &loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.BuildSettlement(ws.Player, loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "c": // City
			vertices := ws.Player.GetBuildLocationsCity(ws.Hub.Game.Graph)
			if len(vertices) == 0 || ws.Player.CanBuild(entities.BTCity) != nil {
				ws.Hub.Game.SendError(errors.New("nowhere to build or cannot build"), ws.Player)
				return
			}

			defer ws.Hub.Game.BroadcastState()
			res, err := ws.Hub.Game.BlockForAction(ws.Player, 0, &entities.PlayerAction{
				Type:      entities.PlayerActionTypeChooseVertex,
				Message:   "Choose location for city",
				CanCancel: true,
				Data:      entities.PlayerActionChooseVertex{Allowed: vertices},
			})

			if res == nil || err != nil { // Cancelled
				return
			}

			var loc entities.Coordinate
			err = mapstructure.Decode(res, &loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}
			err = ws.Hub.Game.BuildCity(ws.Player, loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "r": // Road
			edges := ws.Player.GetBuildLocationsRoad(ws.Hub.Game.Graph, false)
			if len(edges) == 0 || ws.Player.CanBuild(entities.BTRoad) != nil {
				ws.Hub.Game.SendError(errors.New("nowhere to build or cannot build"), ws.Player)
				return
			}

			defer ws.Hub.Game.BroadcastState()
			res, err := ws.Hub.Game.BlockForAction(ws.Player, 0, &entities.PlayerAction{
				Type:      entities.PlayerActionTypeChooseEdge,
				Message:   "Choose location for road",
				CanCancel: true,
				Data:      entities.PlayerActionChooseEdge{Allowed: edges},
			})

			if res == nil || err != nil { // Cancelled
				return
			}

			var loc entities.EdgeCoordinate
			err = mapstructure.Decode(res, &loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.BuildRoad(ws.Player, loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "dc": // Development card
			if ws.Hub.Game.Mode != entities.Base {
				return
			}

			err = ws.Hub.Game.BuyDevelopmentCard(ws.Player)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "k": // Knight
			if ws.Hub.Game.Mode != entities.CitiesAndKnights {
				return
			}

			vertices := ws.Player.GetBuildLocationsKnight(ws.Hub.Game.Graph, true)
			if len(vertices) == 0 ||
				(ws.Player.CanBuild(entities.BTKnight1) != nil &&
					ws.Player.CanBuild(entities.BTKnight2) != nil &&
					ws.Player.CanBuild(entities.BTKnight3) != nil) {

				ws.Hub.Game.SendError(errors.New("nowhere to build or cannot build"), ws.Player)
				return
			}

			defer ws.Hub.Game.BroadcastState()
			res, err := ws.Hub.Game.BlockForAction(ws.Player, 0, &entities.PlayerAction{
				Type:      entities.PlayerActionTypeChooseVertex,
				Message:   "Choose location for warrior",
				CanCancel: true,
				Data:      entities.PlayerActionChooseVertex{Allowed: vertices},
			})

			if res == nil || err != nil { // Cancelled
				return
			}

			var loc entities.Coordinate
			err = mapstructure.Decode(res, &loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.BuildKnight(ws.Player, loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "ka": // Knight Activate
			if ws.Hub.Game.Mode != entities.CitiesAndKnights {
				return
			}

			vertices := ws.Player.GetActivateLocationsKnight(ws.Hub.Game.Graph)
			if len(vertices) == 0 {
				ws.Hub.Game.SendError(errors.New("no knight to activate"), ws.Player)
				return
			}

			defer ws.Hub.Game.BroadcastState()
			res, err := ws.Hub.Game.BlockForAction(ws.Player, 0, &entities.PlayerAction{
				Type:      entities.PlayerActionTypeChooseVertex,
				Message:   "Choose warrior to activate",
				CanCancel: true,
				Data:      entities.PlayerActionChooseVertex{Allowed: vertices},
			})

			if res == nil || err != nil { // Cancelled
				return
			}

			var loc entities.Coordinate
			err = mapstructure.Decode(res, &loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.ActivateKnight(ws.Player, loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "kr": // Knight Robber
			if ws.Hub.Game.Mode != entities.CitiesAndKnights {
				return
			}

			err = ws.Hub.Game.KnightChaseRobber(ws.Player, false)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "km": // Knight Move
			if ws.Hub.Game.Mode != entities.CitiesAndKnights {
				return
			}

			err = ws.Hub.Game.KnightMove(ws.Player, false)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "i": // City Improvement
			if ws.Hub.Game.Mode != entities.CitiesAndKnights {
				return
			}

			var ct entities.CardType
			err := mapstructure.Decode(msg["ct"], &ct)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.BuildCityImprovement(ws.Player, ct)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "w": // Wall
			if ws.Hub.Game.Mode != entities.CitiesAndKnights {
				return
			}

			vertices := ws.Player.GetBuildLocationsWall(ws.Hub.Game.Graph)
			if len(vertices) == 0 || ws.Player.CanBuild(entities.BTWall) != nil {
				ws.Hub.Game.SendError(errors.New("nowhere to build or cannot build"), ws.Player)
				return
			}

			defer ws.Hub.Game.BroadcastState()
			res, err := ws.Hub.Game.BlockForAction(ws.Player, 0, &entities.PlayerAction{
				Type:      entities.PlayerActionTypeChooseVertex,
				Message:   "Choose location for fence",
				CanCancel: true,
				Data:      entities.PlayerActionChooseVertex{Allowed: vertices},
			})

			if res == nil || err != nil { // Cancelled
				return
			}

			var loc entities.Coordinate
			err = mapstructure.Decode(res, &loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}
			err = ws.Hub.Game.BuildWall(ws.Player, loc)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "udc": // Use Development card
			var dcType entities.DevelopmentCardType
			mapstructure.Decode(msg["dct"], &dcType)
			err = ws.Hub.Game.UseDevelopmentCard(ws.Player, dcType)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}
		}

	case "d": // Dice
		ws.Hub.Game.SendError(ws.Hub.Game.RollDice(ws.Player, 0, 0), ws.Player)

	case "et": // End turn
		ws.Hub.Game.SendError(ws.Hub.Game.EndTurn(ws.Player), ws.Player)

	case "sb": // Special Build Request
		if !ws.Hub.Game.Settings.SpecialBuild || ws.Player == ws.Hub.Game.CurrentPlayer {
			return
		}

		if ws.Player.SpecialBuild {
			ws.Hub.Game.SendError(errors.New("build phase already requested"), ws.Player)
			return
		}
		ws.Hub.Game.SetPlayerSpecialBuild(ws.Player, true)
		ws.Hub.Game.SendPlayerSecret(ws.Player)

	case "tr": // Trade
		switch msg["tt"] { // Trade type
		case "co": // Create offer
			var offerDetails entities.TradeOfferDetails
			err := mapstructure.Decode(msg["offer"], &offerDetails)
			if err != nil {
				ws.Hub.Game.SendError(errors.New("failed to decode offer details"), ws.Player)
				return
			}

			if len(offerDetails.Ask) != 9 || len(offerDetails.Give) != 9 {
				ws.Hub.Game.SendError(errors.New("wrong length of offer"), ws.Player)
				return
			}

			_, err = ws.Hub.Game.CreateOffer(ws.Player, &offerDetails)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

		case "ao": // Accept offer
			var offerId int
			err := mapstructure.Decode(msg["oid"], &offerId)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.AcceptOffer(offerId, ws.Player)
			if err != nil {
				// Don't show error to player
				// This error shows up too often because AI retracts offers
				return
			}

		case "ro": // Reject offer
			var offerId int
			err := mapstructure.Decode(msg["oid"], &offerId)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			_, err = ws.Hub.Game.RejectOffer(offerId, ws.Player)
			if err != nil {
				// Don't send the error to the player
				// Similar to the above
				return
			}

		case "close": // Close offer
			var acceptingPlayerOrder uint16
			err := mapstructure.Decode(msg["acceptingPlayer"], &acceptingPlayerOrder)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			var offerId int
			err = mapstructure.Decode(msg["oid"], &offerId)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}

			err = ws.Hub.Game.CloseOffer(offerId, ws.Player, acceptingPlayerOrder)
			if err != nil {
				ws.Hub.Game.SendError(err, ws.Player)
				return
			}
		}

	case "ar": // Action Response
		ws.Player.SendExpect(msg["ar_data"])

	case "r": // Informational Request
		switch msg["rt"] { // Request Type
		case "gs": // Player states
			ws.Player.SendMessage(ws.getGameStateMessage())
		case "ph": // Player Hand
			ws.Player.SendMessage(ws.getPlayerSecretStateMessage())
		}
	}
}

func (ws *WsClient) sendInitMessage() {
	// Game settings
	// This MUST be the first message sent to the client
	ws.Player.SendMessage(&entities.Message{
		Type: "i-st",
		Data: ws.Hub.Game.Settings,
	})

	// Mapping
	keys := make([]entities.Coordinate, 0)
	vals := make([]entities.FloatCoordinate, 0)

	for c, fc := range ws.Hub.Game.DispCoordMap {
		keys = append(keys, c)
		vals = append(vals, fc)
	}

	resp := make(map[string]interface{})
	resp["keys"] = keys
	resp["values"] = vals

	ws.Player.SendMessage(&entities.Message{
		Type: "i-m",
		Data: resp,
	})

	// Tiles
	for _, t := range ws.Hub.Game.Tiles {
		if t.Fog {
			t = &entities.Tile{
				Center: t.Center,
				Fog:    t.Fog,
			}
		}

		ws.Player.SendMessage(&entities.Message{
			Type: "i-t",
			Data: t,
		})
	}

	// Vertices
	for _, v := range ws.Hub.Game.Vertices {
		ws.Player.SendMessage(&entities.Message{
			Type: "i-v",
			Data: v,
		})
	}

	// Edges
	for _, e := range ws.Hub.Game.Edges {
		ws.Player.SendMessage(&entities.Message{
			Type: "i-e",
			Data: e,
		})
	}

	// Ports
	for _, p := range ws.Hub.Game.Ports {
		ws.Player.SendMessage(&entities.Message{
			Type: "i-p",
			Data: p,
		})
	}

	// Placements
	for _, p := range ws.Hub.Game.Players {
		for _, vp := range p.VertexPlacements {
			ws.Player.SendMessage(&entities.Message{
				Type: entities.MessageTypeVertexPlacement,
				Data: vp,
			})
		}

		for _, ep := range p.EdgePlacements {
			ws.Player.SendMessage(&entities.Message{
				Type: entities.MessageTypeEdgePlacement,
				Data: ep,
			})
		}
	}

	// Complete
	ws.Player.SendMessage(&entities.Message{
		Type: "i-c",
		Data: nil,
	})

	// Last Dice Roll
	ws.Player.SendMessage(&entities.Message{
		Type: "d",
		Data: entities.DieRollState{
			RedRoll:   ws.Hub.Game.LastRollRed,
			WhiteRoll: ws.Hub.Game.LastRollWhite,
			EventRoll: ws.Hub.Game.LastRollEvent,
			IsInit:    true,
		},
	})

	// Player states
	ws.Player.SendMessage(ws.getGameStateMessage())
	ws.Player.SendMessage(ws.getPlayerSecretStateMessage())
	ws.Player.SendMessage(ws.Hub.Game.GetSpectatorListMessage())
	ws.Hub.Game.CheckForVictory()

	// Trade offers
	for _, offer := range ws.Hub.Game.CurrentOffers {
		ws.Player.SendMessage(ws.Hub.Game.GetTradeOfferMessage(offer))
	}

	// Check any pending actions for this player
	if ws.Player.PendingAction != nil {
		ws.Player.SendAction(ws.Player.PendingAction)
	}
}

func (ws *WsClient) getPlayerSecretStateMessage() *entities.Message {
	return &entities.Message{
		Type: entities.MessageTypePlayerSecretState,
		Data: ws.Hub.Game.GetPlayerSecretState(ws.Player),
	}
}

func (ws *WsClient) getGameStateMessage() *entities.Message {
	return &entities.Message{
		Type: entities.MessageTypeGameState,
		Data: ws.Hub.Game.GetGameState(),
	}
}
