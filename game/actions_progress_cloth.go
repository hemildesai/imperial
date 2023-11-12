package game

import (
	"errors"
	"imperials/entities"
	"math/rand"

	"github.com/mitchellh/mapstructure"
)

func (g *Game) UseProgressClothCommercialHarbor(p *entities.Player, dry bool) error {
	hasResources := func() bool {
		return p.CurrentHand.GetCardDeck(entities.CardTypeWood).Quantity+
			p.CurrentHand.GetCardDeck(entities.CardTypeBrick).Quantity+
			p.CurrentHand.GetCardDeck(entities.CardTypeWool).Quantity+
			p.CurrentHand.GetCardDeck(entities.CardTypeWheat).Quantity+
			p.CurrentHand.GetCardDeck(entities.CardTypeOre).Quantity > 0
	}

	if !hasResources() {
		return errors.New("no resource to give")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressClothCommercialHarbor, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressClothCommercialHarbor, 500, -1) }()

	g.ReinsertDevelopmentCard(p, entities.ProgressClothCommercialHarbor, false)

	stealChoices := make([]bool, len(g.Players))
	for i := 0; i < len(g.Players); i++ {
		stealChoices[i] =
			i != int(p.Order) &&
				g.Players[i].CurrentHand.GetCardDeck(entities.CardTypePaper).Quantity+
					g.Players[i].CurrentHand.GetCardDeck(entities.CardTypeCloth).Quantity+
					g.Players[i].CurrentHand.GetCardDeck(entities.CardTypeCoin).Quantity > 0

	}

	canSteal := func() bool {
		for _, b := range stealChoices {
			if b {
				return true
			}
		}
		return false
	}

	for hasResources() && canSteal() {
		// Get player to steal from
		exp, err := g.BlockForAction(g.CurrentPlayer, 0, &entities.PlayerAction{
			Type: entities.PlayerActionTypeChoosePlayer,
			Data: entities.PlayerActionChoosePlayer{
				Choices: stealChoices,
			},
			CanCancel: true,
			Message:   "Choose player to trade with",
		})
		if exp == nil || err != nil {
			return nil
		}

		stoleOrder := 0
		err = mapstructure.Decode(exp, &stoleOrder)
		if err != nil || stoleOrder < 0 || stoleOrder > len(g.Players) || !stealChoices[stoleOrder] {
			for i := 0; i < len(g.Players); i++ {
				if stealChoices[i] {
					stoleOrder = i
					break
				}
			}
		}

		stealChoices[stoleOrder] = false

		// Get resource
		exp, err = g.BlockForAction(p, 0, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeSelectCards,
			Message: "Choose type of resource to give",
			Data: entities.PlayerActionSelectCards{
				AllowedTypes: []int{1, 2, 3, 4, 5},
				Quantity:     1,
			},
			CanCancel: true,
		})
		if err != nil {
			return err
		}
		p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

		var cards []int
		err = mapstructure.Decode(exp, &cards)
		if err != nil || len(cards) != 9 {
			continue
		}

		resource := entities.CardType(0)
		for t, q := range cards {
			if q > 0 {
				resource = entities.CardType(t)
				break
			}
		}
		if resource < 1 || resource > 5 || p.CurrentHand.GetCardDeck(resource).Quantity == int16(0) {
			continue
		}

		// Get commodity from other player
		stoleFrom := g.Players[stoleOrder]
		getting := make([]int, 9)
		getting[resource] = 1

		exp, err = g.BlockForAction(stoleFrom, g.TimerVals.DiscardCards, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeSelectCards,
			Message: "Choose type of commodity to give",
			Data: entities.PlayerActionSelectCards{
				AllowedTypes: []int{6, 7, 8},
				Quantity:     1,
				Getting:      getting,
			},
		})
		if err != nil {
			return err
		}
		stoleFrom.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

		chooseRandomCommodity := func(h *entities.Hand) entities.CardType {
			has := make([]entities.CardType, 0)

			put := func(t entities.CardType) {
				if h.GetCardDeck(t).Quantity > 0 {
					has = append(has, t)
				}
			}
			put(entities.CardTypePaper)
			put(entities.CardTypeCloth)
			put(entities.CardTypeCoin)

			return has[rand.Intn(len(has))]
		}

		commodity := entities.CardType(0)
		err = mapstructure.Decode(exp, &cards)
		if err != nil || len(cards) != 9 {
			commodity = chooseRandomCommodity(stoleFrom.CurrentHand)
		}

		for t, q := range cards {
			if q > 0 {
				commodity = entities.CardType(t)
				break
			}
		}
		if commodity < 6 || commodity > 8 || stoleFrom.CurrentHand.GetCardDeck(commodity).Quantity == int16(0) {
			commodity = chooseRandomCommodity(stoleFrom.CurrentHand)
		}

		g.MoveCards(int(stoleFrom.Order), int(p.Order), commodity, 1, true, false)
		g.MoveCards(int(p.Order), int(stoleFrom.Order), resource, 1, true, false)
		g.SendPlayerSecret(p)
		g.SendPlayerSecret(stoleFrom)
		g.BroadcastState()
	}

	return nil
}

func (g *Game) UseProgressClothMasterMerchant(p *entities.Player, dry bool) error {
	found := false
	stealChoices := make([]bool, len(g.Players))
	stealPlayers := make([]*entities.Player, 0)
	for _, ps := range g.Players {
		if ps != p && ps.CurrentHand.GetCardCount() > 0 && g.GetVictoryPoints(ps, true) > g.GetVictoryPoints(p, true) {
			stealChoices[ps.Order] = true
			stealPlayers = append(stealPlayers, ps)
			found = true
		}
	}

	if !found {
		return errors.New("nobody to steal from")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressClothMasterMerchant, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressClothMasterMerchant, 500, -1) }()

	g.ReinsertDevelopmentCard(p, entities.ProgressClothMasterMerchant, false)

	// Get player to steal from
	exp, err := g.BlockForAction(g.CurrentPlayer, 0, &entities.PlayerAction{
		Type: entities.PlayerActionTypeChoosePlayer,
		Data: entities.PlayerActionChoosePlayer{
			Choices: stealChoices,
		},
		Message: "Choose player to steal from",
	})
	if err != nil {
		return err
	}

	stoleOrder := 0
	err = mapstructure.Decode(exp, &stoleOrder)
	if err != nil || stoleOrder < 0 || stoleOrder > len(g.Players) || !stealChoices[stoleOrder] {
		stoleOrder = int(stealPlayers[rand.Intn(len(stealPlayers))].Order)
	}

	stoleFrom := g.Players[stoleOrder]

	hand := make([]int, 9)
	for _, deck := range stoleFrom.CurrentHand.CardDeckMap {
		hand[deck.Type] = int(deck.Quantity)
	}

	quantityToSteal := 2
	if int(stoleFrom.CurrentHand.GetCardCount()) < quantityToSteal {
		quantityToSteal = int(stoleFrom.CurrentHand.GetCardCount())
	}

	exp, err = g.BlockForAction(p, 0, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeSelectCards,
		Message: "Choose cards to steal",
		Data: entities.PlayerActionSelectCards{
			AllowedTypes: []int{1, 2, 3, 4, 5, 6, 7, 8},
			Quantity:     quantityToSteal,
			NotSelfHand:  true,
			Hand:         hand,
		},
	})
	if err != nil {
		return err
	}

	p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

	var cards []int
	err = mapstructure.Decode(exp, &cards)

	count := 0

	if err == nil && len(cards) == 9 {
		for i := 1; i < 9; i++ {
			ct := entities.CardType(i)
			if cards[i] > 0 && cards[i]+count <= quantityToSteal && int(stoleFrom.CurrentHand.GetCardDeck(ct).Quantity) >= cards[i] {
				count += cards[i]
				g.MoveCards(int(stoleFrom.Order), int(p.Order), entities.CardType(i), cards[i], true, true)
			}
		}
	}

	for count < quantityToSteal {
		ct := stoleFrom.CurrentHand.ChooseRandomCardType()
		if ct == nil {
			break
		}
		g.MoveCards(int(stoleFrom.Order), int(p.Order), *ct, 1, true, true)
		count++
	}

	g.SendPlayerSecret(stoleFrom)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressClothMerchant(p *entities.Player, dry bool) error {
	if dry {
		return nil
	}

	tiles := make([]*entities.Tile, 0)
	for _, t := range g.Tiles {
		if t.Type < entities.TileTypeWood || t.Type > entities.TileTypeOre || t.Fog {
			// No gold or fog or sea
			continue
		}

		for _, vp := range g.Graph.GetTilePlacements(t) {
			if vp.GetOwner() == p {
				tiles = append(tiles, t)
				break
			}
		}
	}

	if len(tiles) == 0 {
		return errors.New("nowhere to place merchant")
	}

	exp, err := g.BlockForAction(g.CurrentPlayer, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseTile,
		Message: "Choose position for merchant",
		Data: &entities.PlayerActionChooseTile{
			Allowed: tiles,
		},
		CanCancel: true,
	})
	if err != nil {
		return err
	}

	var resp entities.Coordinate
	mapstructure.Decode(exp, &resp)
	selTile := g.Graph.Tiles[resp]

	if p.GetIsBot() {
		selTile = g.ai.ChooseMerchantLocation(g.CurrentPlayer, tiles)
	}

	{ // Check if tile valid
		found := false
		for _, t := range tiles {
			if t == selTile {
				found = true
				break
			}
		}
		if !found {
			return nil
		}
	}

	g.ReinsertDevelopmentCard(p, entities.ProgressClothMerchant, false)
	g.BroadcastDevCardUse(entities.ProgressClothMerchant, DevCardShowTime, -1)
	g.Merchant.Move(p, selTile)
	g.j.WMerchant()
	g.BroadcastState()
	g.SendPlayerSecret(p)
	g.CheckForVictory()

	return nil
}

func (g *Game) UseProgressClothMerchantFleet(p *entities.Player, dry bool) error {
	if dry {
		return nil
	}

	exp, err := g.BlockForAction(p, 0, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeSelectCards,
		Message: "Choose card to enable trade",
		Data: entities.PlayerActionSelectCards{
			AllowedTypes: []int{1, 2, 3, 4, 5, 6, 7, 8},
			Quantity:     1,
			NotSelfHand:  true,
		},
	})
	if err != nil {
		return err
	}

	p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

	var cards [9]int
	if p.GetIsBot() {
		cards = g.ai.ChooseMerchantFleet(p)
	} else {
		err = mapstructure.Decode(exp, &cards)
		if err != nil || len(cards) != 9 {
			return err
		}
	}

	var c entities.CardType
	for t, q := range cards {
		if q > 0 {
			c = entities.CardType(t)
			break
		}
	}
	if c >= 1 && c <= 8 {
		g.MerchantFleets[c] = 2
		g.j.WMerchantFleet(c)
	} else {
		return errors.New("invalid selection")
	}

	g.ReinsertDevelopmentCard(p, entities.ProgressClothMerchantFleet, false)
	g.BroadcastDevCardUse(entities.ProgressClothMerchantFleet, DevCardShowTime, -1)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressClothResourceMonopoly(p *entities.Player, dry bool) error {
	return g.UseProgressClothMonopoly(p, dry, entities.ProgressClothResourceMonopoly)
}

func (g *Game) UseProgressClothTradeMonopoly(p *entities.Player, dry bool) error {
	return g.UseProgressClothMonopoly(p, dry, entities.ProgressClothTradeMonopoly)
}

func (g *Game) UseProgressClothMonopoly(p *entities.Player, dry bool, ct entities.DevelopmentCardType) error {
	if dry {
		return nil
	}

	allowedTypes := []int{1, 2, 3, 4, 5}
	quantity := 2

	if ct == entities.ProgressClothTradeMonopoly {
		allowedTypes = []int{6, 7, 8}
		quantity = 1
	}

	exp, err := g.BlockForAction(p, 0, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeSelectCards,
		Message: "Choose card type to steal",
		Data: entities.PlayerActionSelectCards{
			AllowedTypes: allowedTypes,
			Quantity:     1,
			NotSelfHand:  true,
		},
		CanCancel: true,
	})
	if err != nil {
		return err
	}

	p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

	var cards [9]int
	if p.GetIsBot() {
		cards = [9]int{0, 0, 0, 0, 0, 0, 0, 0, 0}
		cards[allowedTypes[rand.Intn(len(allowedTypes))]] = 1
	} else {
		err = mapstructure.Decode(exp, &cards)
		if err != nil || len(cards) != 9 {
			return err
		}
	}

	var c entities.CardType
	for t, q := range cards {
		if q > 0 {
			c = entities.CardType(t)
			break
		}
	}
	if c >= entities.CardType(allowedTypes[0]) && c <= entities.CardType(allowedTypes[len(allowedTypes)-1]) {
		for _, stealFrom := range g.Players {
			if stealFrom == p {
				continue
			}

			count := stealFrom.CurrentHand.GetCardDeck(c).Quantity
			if count > int16(quantity) {
				count = int16(quantity)
			}
			if count > 0 {
				g.MoveCards(int(stealFrom.Order), int(p.Order), c, int(count), true, false)
				g.SendPlayerSecret(stealFrom)
			}
		}
	} else {
		return errors.New("invalid selection")
	}

	g.BroadcastDevCardUse(ct, DevCardShowTime, -1)
	g.ReinsertDevelopmentCard(p, ct, false)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}
