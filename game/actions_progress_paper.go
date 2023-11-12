package game

import (
	"errors"
	"imperials/entities"
	"math/rand"

	"github.com/mitchellh/mapstructure"
)

func (g *Game) UseProgressPaperAlchemist(p *entities.Player, dry bool) error {
	if g.DiceState != 0 {
		return errors.New("can use this card only before the dice is rolled")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressPaperAlchemist, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressPaperAlchemist, 500, -1) }()

	exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type: entities.PlayerActionTypeChooseDice,
	})
	if err != nil {
		return err
	}

	var res []int
	err = mapstructure.Decode(exp, &res)
	if err != nil || res == nil || len(res) != 2 || res[0] <= 0 || res[0] > 6 || res[1] <= 0 || res[1] > 6 {
		res = make([]int, 2)
		res[0] = rand.Intn(6) + 1
		res[1] = rand.Intn(6) + 1
	}
	redRoll := res[0]
	whiteRoll := res[1]

	g.RollDice(p, redRoll, whiteRoll)
	g.ReinsertDevelopmentCard(p, entities.ProgressPaperAlchemist, false)

	return nil
}

func (g *Game) UseProgressPaperCrane(p *entities.Player, dry bool) error {
	orig := p.UsingDevCard
	p.UsingDevCard = entities.ProgressPaperCrane
	defer func() { p.UsingDevCard = orig }()

	if g.CanBuildImprovement(p, entities.CardTypePaper) != nil &&
		g.CanBuildImprovement(p, entities.CardTypeCloth) != nil &&
		g.CanBuildImprovement(p, entities.CardTypeCoin) != nil {
		return errors.New("nothing can be improved")
	}

	if dry {
		return nil
	}

	exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseImprovement,
		Message: "Choose town improvement to complete",
	})
	if err != nil {
		return err
	}

	var res entities.CardType
	mapstructure.Decode(exp, &res)
	if res != entities.CardTypePaper && res != entities.CardTypeCloth && res != entities.CardTypeCoin {
		if g.CanBuildImprovement(p, entities.CardTypePaper) == nil {
			res = entities.CardTypePaper
		} else if g.CanBuildImprovement(p, entities.CardTypeCloth) == nil {
			res = entities.CardTypeCloth
		} else if g.CanBuildImprovement(p, entities.CardTypeCoin) == nil {
			res = entities.CardTypeCoin
		}
	}

	err = g.BuildCityImprovement(p, res)
	if err != nil {
		return err
	}

	g.BroadcastDevCardUse(entities.ProgressPaperCrane, DevCardShowTime, -1)
	g.ReinsertDevelopmentCard(p, entities.ProgressPaperCrane, false)

	return nil
}

func (g *Game) UseProgressPaperEngineer(p *entities.Player, dry bool) error {
	vertices := p.GetBuildLocationsWall(g.Graph)
	if len(vertices) == 0 {
		return errors.New("no possible location to build")
	}

	if p.BuildablesLeft[entities.BTWall] <= 0 {
		return errors.New("not enough buildables left")
	}

	if dry {
		return nil
	}

	orig := p.UsingDevCard
	p.UsingDevCard = entities.ProgressPaperEngineer
	defer func() { p.UsingDevCard = orig }()

	res, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseVertex,
		Message: "Choose location for fence",
		Data:    entities.PlayerActionChooseVertex{Allowed: vertices},
	})
	if err != nil {
		return err
	}

	var loc entities.Coordinate
	mapstructure.Decode(res, &loc)
	vertex, err := g.Graph.GetVertex(loc)
	if err != nil {
		vertex = vertices[0]
	}

	// Give the player resources
	// Do not check the bank
	p.CurrentHand.UpdateResources(0, 2, 0, 0, 0)
	g.j.WUpdateResources(p, 0, 2, 0, 0, 0)

	err = g.BuildWall(p, vertex.C)
	if err != nil {
		p.CurrentHand.UpdateResources(0, -2, 0, 0, 0)
		g.j.WUpdateResources(p, 0, -2, 0, 0, 0)
		return err
	}

	g.BroadcastDevCardUse(entities.ProgressPaperEngineer, DevCardShowTime, -1)
	g.ReinsertDevelopmentCard(p, entities.ProgressPaperEngineer, false)

	return nil
}

func (g *Game) UseProgressPaperInventor(p *entities.Player, dry bool) error {
	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressPaperInventor, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressPaperInventor, 500, -1) }()

	tiles1 := make([]*entities.Tile, 0)
	tiles2 := make([]*entities.Tile, 0)
	for _, t := range g.Tiles {
		if t.Number > 1 && t.Number != 6 && t.Number != 8 && t.Number != 2 && t.Number != 12 && !t.Fog {
			tiles1 = append(tiles1, t)
		}
	}

	exp, err := g.BlockForAction(g.CurrentPlayer, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseTile,
		Message: "Choose first number to swap",
		Data: &entities.PlayerActionChooseTile{
			Allowed: tiles1,
		},
	})
	if err != nil {
		return err
	}

	var resp1 entities.Coordinate
	err = mapstructure.Decode(exp, &resp1)
	selTile1 := g.Graph.Tiles[resp1]
	if err != nil {
		selTile1 = tiles1[rand.Intn(len(tiles1))]
	}

	{ // Check if valid
		found := false
		for _, t := range tiles1 {
			if t == selTile1 {
				found = true
				break
			}
		}
		if !found {
			selTile1 = tiles1[0]
		}
	}

	for _, t := range tiles1 {
		if t != selTile1 {
			tiles2 = append(tiles2, t)
		}
	}

	exp, err = g.BlockForAction(g.CurrentPlayer, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseTile,
		Message: "Choose second number to swap",
		Data: &entities.PlayerActionChooseTile{
			Allowed: tiles2,
		},
	})
	if err != nil {
		return err
	}

	var resp2 entities.Coordinate
	err = mapstructure.Decode(exp, &resp2)
	selTile2 := g.Graph.Tiles[resp2]

	if err != nil {
		selTile2 = tiles2[rand.Intn(len(tiles2))]
	}

	{ // Check if valid
		found := false
		for _, t := range tiles2 {
			if t == selTile2 {
				found = true
				break
			}
		}
		if !found {
			selTile2 = tiles2[0]
		}
	}

	// swap the two numbers
	selTile1.Number, selTile2.Number = selTile2.Number, selTile1.Number
	g.BroadcastMessage(&entities.Message{Type: "i-t", Data: selTile1})
	g.BroadcastMessage(&entities.Message{Type: "i-t", Data: selTile2})
	g.j.WSetTileType(selTile1)
	g.j.WSetTileType(selTile2)

	g.ReinsertDevelopmentCard(p, entities.ProgressPaperInventor, false)
	return nil
}

func (g *Game) UseProgressPaperMedicine(p *entities.Player, dry bool) error {
	if !p.CurrentHand.HasResources(0, 0, 0, 1, 2) {
		return errors.New("not enough resources")
	}

	vertices := p.GetBuildLocationsCity(g.Graph)
	if len(vertices) == 0 || p.BuildablesLeft[entities.BTCity] <= 0 {
		return errors.New("nowhere or not enough pieces to build")
	}

	if dry {
		return nil
	}

	res, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseVertex,
		Message: "Choose location for town",
		Data:    entities.PlayerActionChooseVertex{Allowed: vertices},
	})
	if err != nil {
		return err
	}

	var loc entities.Coordinate
	mapstructure.Decode(res, &loc)

	found := false
	for _, v := range vertices {
		if v.C == loc {
			found = true
			break
		}
	}
	if !found {
		loc = vertices[0].C
	}

	// Make sure the player has cards
	// Do not check the bank
	p.CurrentHand.UpdateResources(0, 0, 0, 1, 1)
	g.j.WUpdateResources(p, 0, 0, 0, 1, 1)

	err = g.BuildCity(p, loc)
	if err != nil {
		p.CurrentHand.UpdateResources(0, 0, 0, -1, -1)
		g.j.WUpdateResources(p, 0, 0, 0, -1, -1)
		return err
	}

	g.BroadcastDevCardUse(entities.ProgressPaperMedicine, DevCardShowTime, -1)
	g.ReinsertDevelopmentCard(p, entities.ProgressPaperMedicine, false)
	return nil
}

func (g *Game) UseProgressPaperIrrigation(p *entities.Player, dry bool) error {
	count := 0
	tiles := make([]*entities.Tile, 0)
	for _, t := range g.Tiles {
		if t.Type != entities.TileTypeWheat {
			continue
		}

		for _, vp := range g.Graph.GetTilePlacements(t) {
			if vp.GetOwner() == p && (vp.GetType() == entities.BTSettlement || vp.GetType() == entities.BTCity) {
				count++
				tiles = append(tiles, t)
				break
			}
		}
	}

	if count == 0 {
		return errors.New("no building on any wheat tile")
	}

	if dry {
		return nil
	}

	cardType := entities.CardTypeWheat
	count *= 2
	bank := int(g.Bank.Hand.GetCardDeck(cardType).Quantity)
	if bank < count {
		count = bank
	}

	g.Bank.Hand.UpdateCards(cardType, -count)
	p.CurrentHand.UpdateCards(cardType, count)
	g.j.WUpdateCard(nil, cardType, -int16(count))
	g.j.WUpdateCard(p, cardType, int16(count))

	for _, t := range tiles {
		info := &entities.CardMoveInfo{
			Tile:        t,
			GainerOrder: int(p.Order),
			GiverOrder:  -2,
			CardType:    cardType,
			Quantity:    2,
		}
		msg := &entities.Message{
			Type: entities.MessageTypeCardMove,
			Data: info,
		}
		g.BroadcastMessage(msg)
	}

	g.ReinsertDevelopmentCard(p, entities.ProgressPaperIrrigation, false)
	g.BroadcastDevCardUse(entities.ProgressPaperIrrigation, DevCardShowTime, -1)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressPaperMining(p *entities.Player, dry bool) error {
	count := 0
	tiles := make([]*entities.Tile, 0)
	for _, t := range g.Tiles {
		if t.Type != entities.TileTypeOre {
			continue
		}

		for _, vp := range g.Graph.GetTilePlacements(t) {
			if vp.GetOwner() == p && (vp.GetType() == entities.BTSettlement || vp.GetType() == entities.BTCity) {
				count++
				tiles = append(tiles, t)
				break
			}
		}
	}

	if count == 0 {
		return errors.New("no building on any ore tile")
	}

	if dry {
		return nil
	}

	cardType := entities.CardTypeOre
	count *= 2
	bank := int(g.Bank.Hand.GetCardDeck(cardType).Quantity)
	if bank < count {
		count = bank
	}

	g.Bank.Hand.UpdateCards(cardType, -count)
	p.CurrentHand.UpdateCards(cardType, count)
	g.j.WUpdateCard(nil, cardType, -int16(count))
	g.j.WUpdateCard(p, cardType, int16(count))

	for _, t := range tiles {
		info := &entities.CardMoveInfo{
			Tile:        t,
			GainerOrder: int(p.Order),
			GiverOrder:  -2,
			CardType:    cardType,
			Quantity:    2,
		}
		msg := &entities.Message{
			Type: entities.MessageTypeCardMove,
			Data: info,
		}
		g.BroadcastMessage(msg)
	}

	g.ReinsertDevelopmentCard(p, entities.ProgressPaperMining, false)
	g.BroadcastDevCardUse(entities.ProgressPaperMining, DevCardShowTime, -1)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressPaperRoadBuilding(p *entities.Player, dry bool) error {
	if p.BuildablesLeft[entities.BTRoad] <= 0 {
		return errors.New("not enough pieces to build")
	}

	if len(p.GetBuildLocationsRoad(g.Graph, false)) == 0 {
		return errors.New("no location to build")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressPaperRoadBuilding, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressPaperRoadBuilding, 500, -1) }()

	g.UseDevRoadBuilding(p, []entities.BuildableType{0, 0})
	g.ReinsertDevelopmentCard(p, entities.ProgressPaperRoadBuilding, false)

	return nil
}

func (g *Game) UseProgressPaperSmith(p *entities.Player, dry bool) error {
	vertices1 := make([]*entities.Vertex, 0)

	canUpgrade := func(vp entities.VertexBuildable) bool {
		if vp.GetType() == entities.BTKnight1 && vp.GetOwner().BuildablesLeft[entities.BTKnight2] > 0 {
			return true
		}

		if p.Improvements[int(entities.CardTypeCoin)] >= 3 &&
			vp.GetType() == entities.BTKnight2 &&
			vp.GetOwner().BuildablesLeft[entities.BTKnight3] > 0 {
			return true
		}

		return false
	}

	for _, vp := range p.VertexPlacements {
		if canUpgrade(vp) {
			vertices1 = append(vertices1, vp.GetLocation())
		}
	}

	if len(vertices1) <= 0 {
		return errors.New("no warrior to upgrade")
	}

	if dry {
		return nil
	}

	orig := p.UsingDevCard
	p.UsingDevCard = entities.ProgressPaperSmith
	defer func() { p.UsingDevCard = orig }()

	g.BroadcastDevCardUse(entities.ProgressPaperSmith, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressPaperSmith, 500, -1) }()

	res, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseVertex,
		Message: "Choose warrior to upgrade",
		Data:    entities.PlayerActionChooseVertex{Allowed: vertices1},
	})
	if err != nil {
		return err
	}

	var loc1 entities.Coordinate
	mapstructure.Decode(res, &loc1)
	v1, _ := g.Graph.GetVertex(loc1)

	vertices2 := make([]*entities.Vertex, 0)

	found := false
	for _, v := range vertices1 {
		if v == v1 {
			found = true
		} else {
			vertices2 = append(vertices2, v)
		}
	}
	if !found {
		v1 = vertices1[0]
		vertices2 = vertices1[1:]
	}

	// Upgrade knight at v1
	p.CurrentHand.UpdateResources(0, 0, 1, 0, 1)
	g.j.WUpdateResources(p, 0, 0, 1, 0, 1)
	g.BuildKnight(p, v1.C)

	g.ReinsertDevelopmentCard(p, entities.ProgressPaperSmith, false)

	if len(vertices2) == 0 {
		return nil
	}

	res, err = g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:      entities.PlayerActionTypeChooseVertex,
		Message:   "Choose warrior to upgrade",
		CanCancel: true,
		Data:      entities.PlayerActionChooseVertex{Allowed: vertices2},
	})
	if err != nil {
		return err
	}

	var loc2 entities.Coordinate
	mapstructure.Decode(res, &loc2)
	v2, _ := g.Graph.GetVertex(loc2)

	found = false
	for _, v := range vertices2 {
		if v == v2 {
			found = true
			break
		}
	}
	if !found {
		if p.GetIsBot() {
			v2 = vertices2[rand.Intn(len(vertices2))]
		} else {
			return nil
		}
	}

	// upgrade knight at v2
	p.CurrentHand.UpdateResources(0, 0, 1, 0, 1)
	g.j.WUpdateResources(p, 0, 0, 1, 0, 1)
	g.BuildKnight(p, v2.C)

	return nil
}
