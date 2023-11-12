package game

import (
	"errors"
	"imperials/entities"
	"math/rand"
	"strconv"
	"sync"

	"github.com/mitchellh/mapstructure"
)

type GoldCall struct {
	Player   *entities.Player
	Quantity int
}

func (g *Game) RollDice(p *entities.Player, givenRedRoll int, givenWhiteRoll int) error {
	if err := g.EnsureCurrentPlayer(p); err != nil {
		return err
	}

	g.ActionMutex.Lock()
	defer g.ActionMutex.Unlock()

	redRoll := rand.Intn(6) + 1
	whiteRoll := rand.Intn(6) + 1

	if givenRedRoll != 0 {
		redRoll = givenRedRoll
	}

	if givenWhiteRoll != 0 {
		whiteRoll = givenWhiteRoll
	}

	dieRollState, err := g.RollDiceWith(redRoll, whiteRoll)
	if err != nil {
		return err
	}

	if g.Mode == entities.CitiesAndKnights {
		dieRollState.EventRoll = rand.Intn(6) + 1
	}

	g.BroadcastMessage(&entities.Message{
		Location: entities.WsMsgLocationGame,
		Type:     "d",
		Data:     dieRollState,
	})

	if g.Mode == entities.CitiesAndKnights {
		g.RollEventDiceWith(dieRollState.EventRoll)
	}

	for _, p := range g.Players {
		g.SendPlayerSecret(p)
	}
	g.BroadcastState()

	g.CheckForVictory()

	return nil
}

func (g *Game) RollDiceWith(redRoll int, whiteRoll int) (*entities.DieRollState, error) {
	if g.DiceState == 1 {
		return nil, errors.New("already rolled for this turn")
	}
	g.DiceStats.Rolls[(redRoll+whiteRoll)-1]++
	g.DiceState = 1
	g.LastRollRed = redRoll
	g.LastRollWhite = whiteRoll
	g.CurrentPlayer.TimeLeft = g.TimerVals.Turn

	// Write to journal
	g.j.WRollDice(redRoll, whiteRoll)

	roll := redRoll + whiteRoll
	dieRollState := &entities.DieRollState{RedRoll: redRoll, WhiteRoll: whiteRoll}
	dieRollState.PlayerHandDeltas = make([]*entities.Hand, 0)

	if roll == 7 {
		// Send the dice status using the normal means before
		// performing the robber movement.
		// See the top comment of RollDice7 for more details
		if !g.j.playing {
			go g.RollDice7(dieRollState)
		}
		return dieRollState, nil
	}

	for range g.Players {
		hand, _ := entities.GetNewHand(g.Mode, false)
		dieRollState.PlayerHandDeltas = append(dieRollState.PlayerHandDeltas, hand)
	}

	getQuantity := func(t entities.VertexBuildable) int {
		switch t.GetType() {
		case entities.BTSettlement:
			return 1
		case entities.BTCity:
			return 2
		}
		return 0
	}

	// Create NumberTiles map
	numberTiles := make([]*entities.Tile, 0)
	for _, tile := range g.Graph.Tiles {
		if tile.Number == uint16(roll) {
			numberTiles = append(numberTiles, tile)
		}
	}

	// Find the total number of cards needed from the bank
	bankDiff, err := entities.GetNewHand(g.Mode, false)
	if err != nil {
		return nil, err
	}
	for _, tile := range numberTiles {
		if g.Robber.Tile == tile {
			continue
		}

		for _, placement := range g.Graph.GetTilePlacements(tile) {
			if g.Mode == entities.CitiesAndKnights && placement.GetType() == entities.BTCity {
				if tile.Type == entities.TileTypeWood {
					bankDiff.UpdateCards(entities.CardTypeWood, -1)
					bankDiff.UpdateCards(entities.CardTypePaper, -1)
					continue
				}

				if tile.Type == entities.TileTypeWool {
					bankDiff.UpdateCards(entities.CardTypeWool, -1)
					bankDiff.UpdateCards(entities.CardTypeCloth, -1)
					continue
				}

				if tile.Type == entities.TileTypeOre {
					bankDiff.UpdateCards(entities.CardTypeOre, -1)
					bankDiff.UpdateCards(entities.CardTypeCoin, -1)
					continue
				}
			}

			bankDiff.UpdateCards(entities.CardType(tile.Type), -getQuantity(placement))
		}
	}

	dieRollState.GainInfo = make([]entities.CardMoveInfo, 0)
	goldCalls := make([]GoldCall, len(g.Players))
	for i, p := range g.Players {
		goldCalls[i].Player = p
		goldCalls[i].Quantity = 0
	}

	// Give cards
	for _, tile := range numberTiles {
		if g.Robber.Tile == tile {
			continue
		}

		if tile.Type == entities.TileTypeGold {
			for _, placement := range g.Graph.GetTilePlacements(tile) {
				owner := placement.GetOwner()
				quantity := getQuantity(placement)
				goldCalls[owner.Order].Quantity += quantity
			}
			continue
		}

		// Give cards to a player
		giveCards := func(player *entities.Player, t entities.CardType, quantity int) {
			if g.Bank.Hand.GetCardDeck(t).Quantity+bankDiff.GetCardDeck(t).Quantity < 0 {
				return
			}

			player.CurrentHand.UpdateCards(t, quantity)
			dieRollState.PlayerHandDeltas[player.Order].UpdateCards(entities.CardType(tile.Type), quantity)

			dieRollState.GainInfo = append(dieRollState.GainInfo, entities.CardMoveInfo{
				Tile:        tile,
				GainerOrder: int(player.Order),
				GiverOrder:  -2,
				CardType:    t,
				Quantity:    quantity,
			})
		}

		// Give cards to players
		for _, placement := range g.Graph.GetTilePlacements(tile) {
			owner := placement.GetOwner()
			t := entities.CardType(tile.Type)

			if g.Mode == entities.CitiesAndKnights && placement.GetType() == entities.BTCity {
				if tile.Type == entities.TileTypeWood {
					giveCards(owner, entities.CardTypeWood, 1)
					giveCards(owner, entities.CardTypePaper, 1)
					continue
				}

				if tile.Type == entities.TileTypeWool {
					giveCards(owner, entities.CardTypeWool, 1)
					giveCards(owner, entities.CardTypeCloth, 1)
					continue
				}

				if tile.Type == entities.TileTypeOre {
					giveCards(owner, entities.CardTypeOre, 1)
					giveCards(owner, entities.CardTypeCoin, 1)
					continue
				}
			}

			quantity := getQuantity(placement)
			giveCards(owner, t, quantity)
		}
	}

	// Remove cards from bank
	for _, deck := range bankDiff.GetCardDeckMap() {
		if g.Bank.Hand.GetCardDeck(deck.Type).Quantity+bankDiff.GetCardDeck(deck.Type).Quantity >= 0 {
			g.Bank.Hand.UpdateCards(deck.Type, int(deck.Quantity))
		}
	}

	if !g.j.playing && g.Mode == entities.CitiesAndKnights {
		for _, p := range g.Players {
			if p.Improvements[int(entities.CardTypePaper)] >= 3 && dieRollState.PlayerHandDeltas[p.Order].GetCardCount() == 0 {
				goldCalls[p.Order].Quantity++
			}
		}
	}

	if !g.j.playing {
		for _, call := range goldCalls {
			if call.Quantity > 0 {
				go g.GiveGold(goldCalls)
				break
			}
		}
	}

	return dieRollState, nil
}

func (g *Game) RollEventDiceWith(roll int) {
	// Write to journal
	g.j.WRollEventDice(roll)
	g.LastRollEvent = roll
	g.DiceStats.EventRolls[roll-1]++

	if roll >= 4 {
		g.MoveBarbarian()
		return
	}

	if g.j.playing {
		return
	}

	var deckType entities.CardType
	switch roll {
	case 1:
		deckType = entities.CardTypePaper
	case 2:
		deckType = entities.CardTypeCloth
	case 3:
		deckType = entities.CardTypeCoin
	}

	for i := 0; i < len(g.Players); i++ {
		order := (i + int(g.CurrentPlayer.Order)) % len(g.Players)
		imp := g.Players[order].Improvements[int(deckType)]
		if imp == 0 || imp < g.LastRollRed-1 {
			continue
		}

		g.GiveProgressCard(deckType, order)
	}

	// Discard
	order := int(g.CurrentPlayer.Order)
	for i := 0; i < len(g.Players); i++ {
		p := g.Players[order]
		if order != int(g.CurrentPlayer.Order) && p.CurrentHand.GetDevelopmentCardCount() > 4 {
			g.DiscardProgressCard(p)
		}
		order = (order + 1) % len(g.Players)
	}
}

func (g *Game) RollDice7(state *entities.DieRollState) {
	// Get a lock here since RollDice7 runs in a separate goroutine
	// The separate goroutine is necessary since the dice state must be
	// sent to the players from the dice roll call
	g.ActionMutex.Lock()
	defer g.ActionMutex.Unlock()

	defer g.Unlock()
	if !g.Lock() {
		return
	}

	if !g.Initialized {
		return
	}

	g.DiscardHalfCards(g.Players, false)

	// No robber till first attack
	// TODO: tell the UI about this
	if g.Mode == entities.CitiesAndKnights && g.NumBarbarianAttacks == 0 {
		return
	}

	g.MoveRobberInteractive()
	if g.Robber.Tile.Type == entities.TileTypeDesert && g.Settings.Advanced && g.AdvancedSettings.RerollOn7 {
		g.DiceState = 0
		g.CurrentPlayer.TimeLeft = g.TimerVals.DiceRoll
		g.BroadcastState()
		g.SendPlayerSecret(g.CurrentPlayer)
		return
	}

	g.StealCardWithRobber()
}

func (g *Game) GetDiscardLimit(p *entities.Player) int16 {
	discardLimit := g.Settings.DiscardLimit
	if g.Mode == entities.CitiesAndKnights {
		for _, p := range p.VertexPlacements {
			if p.GetType() == entities.BTCity && p.(*entities.City).Wall {
				discardLimit += 2
			}
		}
	}
	return discardLimit
}

func (g *Game) DiscardHalfCards(players []*entities.Player, force bool) {
	var wg sync.WaitGroup

	for _, p := range players {
		numCards := p.CurrentHand.GetCardCount()
		if numCards >= 2 && (force || numCards > g.GetDiscardLimit(p)) {
			q := int(p.CurrentHand.GetCardCount()) / 2
			action := &entities.PlayerActionSelectCards{
				AllowedTypes: []int{1, 2, 3, 4, 5, 6, 7, 8},
				Quantity:     q,
			}

			wg.Add(1)
			p.ClearExpect()

			go func(wg *sync.WaitGroup, p *entities.Player, action *entities.PlayerActionSelectCards) {
				defer wg.Done()

				defer g.Unlock()
				if !g.Lock() {
					return
				}

				exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
					Type:    entities.PlayerActionTypeSelectCards,
					Data:    action,
					Message: "Discard " + strconv.Itoa(q) + " cards",
				})
				if err != nil {
					return
				}

				var resp []float64
				err = mapstructure.Decode(exp, &resp)
				if err != nil || len(resp) != 9 {
					resp = make([]float64, 9)
				}

				sum := 0
				for _, ti := range action.AllowedTypes {
					t := entities.CardType(ti)
					if resp[t] > 0 {
						quantity := p.CurrentHand.GetCardDeck(t).Quantity
						if int16(resp[t]) < quantity {
							quantity = int16(resp[t])
						}

						g.MoveCards(int(p.Order), -1, t, int(quantity), true, false)
						sum += int(quantity)
					}
				}

				for sum < action.Quantity {
					t := p.CurrentHand.ChooseRandomCardType()
					if t == nil {
						break
					}

					g.MoveCards(int(p.Order), -1, *t, 1, true, false)
					sum++
				}

				p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})
				g.SendPlayerSecret(p)
				g.BroadcastState()
			}(&wg, p, action)
		}
	}

	g.TickerPause = true
	g.Unlock()
	wg.Wait()
	if !g.Lock() {
		return
	}
	g.TickerPause = false
}

func (g *Game) MoveRobberInteractive() error {
	// Move the robber
	tiles := make([]*entities.Tile, 0)
	for _, t := range g.Graph.Tiles {
		if (g.Robber.Tile != t ||
			(g.Robber.Tile.Type == entities.TileTypeDesert && g.Settings.Advanced && g.AdvancedSettings.RerollOn7)) &&
			!t.Fog {
			tiles = append(tiles, t)
		}
	}

	robberAction := &entities.PlayerActionChooseTile{
		Allowed: tiles,
	}

	// Get coordinate of tile
	exp, err := g.BlockForAction(g.CurrentPlayer, g.TimerVals.PlaceRobber, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseTile,
		Data:    robberAction,
		Message: "Choose a position for the robber",
	})
	if err != nil {
		return err
	}

	var resp entities.Coordinate
	mapstructure.Decode(exp, &resp)

	selTile := g.Graph.Tiles[resp]
	if selTile == nil {
		selTile = g.ai.GetRobberTile(g.CurrentPlayer, robberAction.Allowed)
	}

	g.Robber.Move(selTile)
	g.j.WSetRobber(selTile)
	g.BroadcastState()
	return nil
}

func (g *Game) StealCardWithRobber() error {
	// Check if anyone to steal from
	stealChoicesSlice := make([]*entities.Player, 0)
	stealChoices := make([]bool, len(g.Players))
	for _, vp := range g.Graph.GetTilePlacements(g.Robber.Tile) {
		if vp.GetType() != entities.BTSettlement && vp.GetType() != entities.BTCity {
			continue
		}

		o := vp.GetOwner()
		if !stealChoices[o.Order] && o != g.CurrentPlayer && o.CurrentHand.GetCardCount() > 0 {
			stealChoices[o.Order] = true
			stealChoicesSlice = append(stealChoicesSlice, vp.GetOwner())
		}
	}

	if len(stealChoicesSlice) == 0 {
		return nil
	}

	stoleOrder := int(stealChoicesSlice[0].Order)

	// Get order of player
	if len(stealChoicesSlice) > 1 {
		exp, err := g.BlockForAction(g.CurrentPlayer, g.TimerVals.ChoosePlayer, &entities.PlayerAction{
			Type: entities.PlayerActionTypeChoosePlayer,
			Data: entities.PlayerActionChoosePlayer{
				Choices: stealChoices,
			},
			Message: "Choose player to steal from",
		})
		if err != nil {
			return err
		}

		err = mapstructure.Decode(exp, &stoleOrder)
		if err != nil || stoleOrder < 0 || stoleOrder > len(g.Players) || !stealChoices[stoleOrder] {
			maxScore := 0
			for i, can := range stealChoices {
				if can {
					score := g.GetVictoryPoints(g.Players[i], true)
					if score > maxScore {
						stoleOrder = i
						maxScore = score
					}
				}
			}
		}
	}

	g.stealRandomCard(g.CurrentPlayer, g.Players[stoleOrder])
	return nil
}

func (g *Game) stealRandomCard(stealer *entities.Player, victim *entities.Player) {
	cardType := victim.CurrentHand.ChooseRandomCardType()
	if cardType != nil {
		g.MoveCards(int(victim.Order), int(stealer.Order), *cardType, 1, true, true)
	}

	g.SendPlayerSecret(stealer)
	g.SendPlayerSecret(victim)
	g.BroadcastState()
}

// Let players choose their gold
// Should run in a separate goroutine
// Each player MUST have only one call at most
// The game will deadlock otherwise
func (g *Game) GiveGold(calls []GoldCall) {
	g.ActionMutex.Lock()
	defer g.ActionMutex.Unlock()

	defer g.Unlock()
	if !g.Lock() {
		return
	}

	if g.j.playing {
		return
	}

	var wg sync.WaitGroup

	for _, call := range calls {
		if call.Quantity <= 0 {
			continue
		}

		action := &entities.PlayerActionSelectCards{
			AllowedTypes: []int{1, 2, 3, 4, 5},
			Quantity:     call.Quantity,
			NotSelfHand:  true,
		}

		wg.Add(1)
		call.Player.ClearExpect()

		go func(wg *sync.WaitGroup, p *entities.Player, action *entities.PlayerActionSelectCards) {
			defer wg.Done()

			defer g.Unlock()
			if !g.Lock() {
				return
			}

			exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
				Type:    entities.PlayerActionTypeSelectCards,
				Data:    action,
				Message: "Choose " + strconv.Itoa(action.Quantity) + " card(s) to receive",
			})
			if err != nil {
				return
			}

			var resp []float64
			err = mapstructure.Decode(exp, &resp)
			if err != nil || len(resp) != 9 {
				resp = make([]float64, 9)
			}

			sum := 0
			for _, ti := range action.AllowedTypes {
				t := entities.CardType(ti)
				if resp[t] > 0 {
					quantity := int16(resp[t])
					if g.Bank.Hand.GetCardDeck(t).Quantity < quantity {
						quantity = g.Bank.Hand.GetCardDeck(t).Quantity
					}

					if sum+int(quantity) > action.Quantity {
						continue
					}

					g.MoveCards(-1, int(p.Order), t, int(quantity), true, false)
					sum += int(quantity)
				}
			}

			for sum < action.Quantity {
				if g.Bank.Hand.GetCardCount() <= 0 {
					break
				}

				ct := entities.CardType(rand.Intn(5) + 1)
				if g.Bank.Hand.GetCardDeck(ct).Quantity > 0 {
					g.MoveCards(-1, int(p.Order), ct, 1, true, false)
					sum++
				}
			}

			p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})
			g.SendPlayerSecret(p)
			g.BroadcastState()
		}(&wg, call.Player, action)
	}

	g.TickerPause = true
	g.Unlock()
	wg.Wait()
	if !g.Lock() {
		return
	}
	g.TickerPause = false
}

// Move cards, log in journal and broadcast movement info
func (g *Game) MoveCards(
	fromOrder int,
	toOrder int,
	cardType entities.CardType,
	quantity int,
	journal bool,
	secret bool,
) {
	var fromHand *entities.Hand
	var toHand *entities.Hand
	var fromPlayer *entities.Player
	var toPlayer *entities.Player

	if fromOrder >= 0 {
		fromPlayer = g.Players[fromOrder]
		fromHand = fromPlayer.CurrentHand
	} else {
		fromHand = g.Bank.Hand
	}

	if toOrder >= 0 {
		toPlayer = g.Players[toOrder]
		toHand = toPlayer.CurrentHand
	} else {
		toHand = g.Bank.Hand
	}

	fromHand.UpdateCards(cardType, -quantity)
	toHand.UpdateCards(cardType, quantity)

	if journal {
		g.j.WUpdateCard(fromPlayer, cardType, -int16(quantity))
		g.j.WUpdateCard(toPlayer, cardType, int16(quantity))
	}

	// No broadcasts for some cases
	if g.CurrentPlayer.UsingDevCard == entities.DevelopmentCardRoadBuilding ||
		g.CurrentPlayer.UsingDevCard == entities.ProgressPaperSmith ||
		g.CurrentPlayer.UsingDevCard == entities.ProgressPaperEngineer {
		return
	}

	// Broadcast move info to everyone
	info := &entities.CardMoveInfo{
		GainerOrder: toOrder,
		GiverOrder:  fromOrder,
		CardType:    cardType,
		Quantity:    quantity,
	}

	msg := &entities.Message{
		Type: entities.MessageTypeCardMove,
		Data: info,
	}

	if !secret {
		// Tell everyone about it
		g.BroadcastMessage(msg)
	} else {
		// Don't tell other players about it
		if fromPlayer != nil {
			fromPlayer.SendMessage(msg)
		}

		if toPlayer != nil {
			toPlayer.SendMessage(msg)
		}

		info.CardType = 0
		for _, p := range g.Players {
			if p == toPlayer || p == fromPlayer {
				continue
			}

			p.SendMessage(msg)
		}
	}
}

// Broadcast movement info for development card
func (g *Game) MoveDevelopmentCard(
	fromOrder int,
	toOrder int,
	cardType entities.DevelopmentCardType,
	secret bool,
) {
	var fromPlayer *entities.Player
	var toPlayer *entities.Player

	if fromOrder >= 0 {
		fromPlayer = g.Players[fromOrder]
	}

	if toOrder >= 0 {
		toPlayer = g.Players[toOrder]
	}

	// Broadcast move info to everyone
	info := &entities.CardMoveInfo{
		GainerOrder: toOrder,
		GiverOrder:  fromOrder,
		CardType:    entities.CardType(int(cardType) + 100),
		Quantity:    1,
	}

	msg := &entities.Message{
		Type: entities.MessageTypeCardMove,
		Data: info,
	}

	if !secret {
		g.BroadcastMessage(msg)
		return
	}

	// Don't tell other players about it
	if fromPlayer != nil {
		fromPlayer.SendMessage(msg)
	}

	if toPlayer != nil {
		toPlayer.SendMessage(msg)
	}

	deckType := entities.GetDevelopmentCardDeckType(cardType)
	var secretType entities.DevelopmentCardType
	switch deckType {
	case entities.CardTypePaper:
		secretType = entities.ProgressUnknownPaper
	case entities.CardTypeCloth:
		secretType = entities.ProgressUnknownCloth
	case entities.CardTypeCoin:
		secretType = entities.ProgressUnknownCoin
	default:
		secretType = entities.DevUnknown
	}

	info.CardType = entities.CardType(100 + int(secretType))
	for _, p := range g.Players {
		if p == toPlayer || p == fromPlayer {
			continue
		}

		p.SendMessage(msg)
	}
}
