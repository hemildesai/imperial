package game

import (
	"errors"
	"imperials/entities"
	"math/rand"
	"strconv"
	"sync"

	"github.com/mitchellh/mapstructure"
)

func (g *Game) UseProgressCoinBishop(p *entities.Player, dry bool) error {
	if g.NumBarbarianAttacks == 0 {
		return errors.New("cannot move robber till first attack")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressCoinBishop, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinBishop, 500, -1) }()

	stolen := make([]bool, len(g.Players))
	g.MoveRobberInteractive()
	for _, vp := range g.Graph.GetTilePlacements(g.Robber.Tile) {
		owner := vp.GetOwner()
		if owner == p || stolen[owner.Order] {
			continue
		}

		stolen[owner.Order] = true

		ct := owner.CurrentHand.ChooseRandomCardType()
		if ct != nil {
			g.MoveCards(int(owner.Order), int(p.Order), *ct, 1, true, true)
			g.SendPlayerSecret(owner)
		}
	}

	g.ReinsertDevelopmentCard(p, entities.ProgressCoinBishop, false)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinDeserter(p *entities.Player, dry bool) error {
	stealChoices := make([]bool, len(g.Players))
	stealPlayers := make([]*entities.Player, 0)

	for _, other := range g.Players {
		if other == p {
			continue
		}

		for _, vp := range other.VertexPlacements {
			if vp.GetType() >= entities.BTKnight1 && vp.GetType() <= entities.BTKnight3 {
				stealChoices[vp.GetOwner().Order] = true
				stealPlayers = append(stealPlayers, vp.GetOwner())
			}
		}
	}

	if len(stealPlayers) == 0 {
		return errors.New("nothing to steal")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressCoinDeserter, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinDeserter, 500, -1) }()

	g.ReinsertDevelopmentCard(p, entities.ProgressCoinDeserter, false)

	exp, err := g.BlockForAction(g.CurrentPlayer, 0, &entities.PlayerAction{
		Type: entities.PlayerActionTypeChoosePlayer,
		Data: entities.PlayerActionChoosePlayer{
			Choices: stealChoices,
		},
		Message: "Choose player to defect a warrior from",
	})
	if err != nil {
		return err
	}

	stoleOrder := 0
	err = mapstructure.Decode(exp, &stoleOrder)
	if err != nil || stoleOrder < 0 || stoleOrder > len(g.Players) || !stealChoices[stoleOrder] {
		stoleOrder = int(stealPlayers[rand.Intn(len(stealPlayers))].Order)
	}

	vertices := make([]*entities.Vertex, 0)
	for _, vp := range g.Players[stoleOrder].VertexPlacements {
		if vp.GetType() >= entities.BTKnight1 && vp.GetType() <= entities.BTKnight3 {
			vertices = append(vertices, vp.GetLocation())
		}
	}

	exp, err = g.BlockForAction(g.Players[stoleOrder], g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseVertex,
		Message: "Choose warrior to remove",
		Data:    entities.PlayerActionChooseVertex{Allowed: vertices},
	})
	if err != nil {
		return err
	}

	var loc entities.Coordinate
	mapstructure.Decode(exp, &loc)
	v, _ := g.Graph.GetVertex(loc)
	found := false
	for _, ov := range vertices {
		if ov == v {
			found = true
			break
		}
	}
	if !found {
		v = vertices[rand.Intn(len(vertices))]
	}

	wasActivated := v.Placement.(*entities.Knight).Activated
	level := v.Placement.GetType()

	g.BroadcastMessage(&entities.Message{
		Type: entities.MessageTypeVertexPlacementRem,
		Data: v.Placement,
	})
	v.RemovePlacement()
	g.Players[stoleOrder].BuildablesLeft[level]++
	g.j.WVertexBuild(v, true)

	buildLocations := p.GetBuildLocationsKnight(g.Graph, false)
	if p.BuildablesLeft[level] > 0 && len(buildLocations) > 0 && (level != entities.BTKnight3 || p.Improvements[int(entities.CardTypeCoin)] >= 3) {
		exp, err = g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeChooseVertex,
			Message: "Choose position for warrior",
			Data:    entities.PlayerActionChooseVertex{Allowed: buildLocations},
		})
		if err != nil {
			return err
		}

		var loc entities.Coordinate
		mapstructure.Decode(exp, &loc)
		v, _ := g.Graph.GetVertex(loc)
		found = false
		for _, ov := range buildLocations {
			if ov == v {
				found = true
				break
			}
		}
		if !found {
			v = buildLocations[rand.Intn(len(buildLocations))]
		}

		err := p.BuildAtVertex(v, level)
		if err != nil {
			return err
		}

		g.setKnightActive(v, wasActivated, wasActivated)
		p.BuildablesLeft[level]--

		g.j.WVertexBuild(v, true)
		g.BroadcastMessage(&entities.Message{
			Type: entities.MessageTypeVertexPlacement,
			Data: v.Placement,
		})
	}

	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinDiplomat(p *entities.Player, dry bool) error {
	if dry {
		return nil
	}

	edges := make([]*entities.Edge, 0)

	for _, p := range g.Players {
		isCovered := func(v *entities.Vertex, e *entities.Edge) bool {
			if v == nil || e == nil {
				return true
			}

			if v.Placement != nil && v.Placement.GetOwner() == p {
				return true
			}

			adjEs := g.Graph.GetAdjacentVertexEdges(v)
			for _, adjE := range adjEs {
				if adjE != e && adjE.Placement != nil &&
					adjE.Placement.GetType() == e.Placement.GetType() &&
					adjE.Placement.GetOwner() == p {
					return true
				}
			}

			return false
		}

		for _, ep := range p.EdgePlacements {
			if ep.GetType() != entities.BTRoad {
				continue
			}

			if !isCovered(g.Graph.Vertices[ep.GetLocation().C.C1], ep.GetLocation()) ||
				!isCovered(g.Graph.Vertices[ep.GetLocation().C.C2], ep.GetLocation()) {
				edges = append(edges, ep.GetLocation())
			}
		}
	}

	if len(edges) == 0 {
		return errors.New("cannot use this card now")
	}

	g.BroadcastDevCardUse(entities.ProgressCoinDiplomat, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinDiplomat, 500, -1) }()

	exp, err := g.BlockForAction(p, g.TimerVals.UseDevCard, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeChooseEdge,
		Message: "Choose road to remove",
		Data: entities.PlayerActionChooseEdge{
			Allowed: edges,
		},
	})
	if err != nil {
		return err
	}

	var redgeC entities.EdgeCoordinate
	var redge *entities.Edge
	mapstructure.Decode(exp, &redgeC)
	for _, e := range edges {
		if e.C == redgeC {
			redge = e
			break
		}
	}
	if redge == nil || redge.Placement == nil {
		redge = edges[rand.Intn(len(edges))]
	}

	owner := redge.Placement.GetOwner()
	bt := redge.Placement.GetType()

	g.BroadcastMessage(&entities.Message{
		Type: entities.MessageTypeEdgePlacementRem,
		Data: redge.Placement,
	})

	redge.RemovePlacement()
	g.Players[owner.Order].BuildablesLeft[bt]++
	g.j.WEdgeBuild(redge)
	g.ReinsertDevelopmentCard(p, entities.ProgressCoinDiplomat, false)

	if owner == p {
		g.UseDevRoadBuilding(p, []entities.BuildableType{entities.BTRoad})
	}

	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinSaboteur(p *entities.Player, dry bool) error {
	sabotaged := make([]*entities.Player, 0)
	for _, ps := range g.Players {
		if ps != p && ps.CurrentHand.GetCardCount() > 1 && g.GetVictoryPoints(ps, true) >= g.GetVictoryPoints(p, true) {
			sabotaged = append(sabotaged, ps)
		}
	}

	if len(sabotaged) == 0 {
		return errors.New("nobody to sabotage")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressCoinSaboteur, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinSaboteur, 500, -1) }()

	g.ReinsertDevelopmentCard(p, entities.ProgressCoinSaboteur, false)
	g.DiscardHalfCards(sabotaged, true)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinWarlord(p *entities.Player, dry bool) error {
	vertices := g.CurrentPlayer.GetActivateLocationsKnight(g.Graph)
	if len(vertices) == 0 {
		return errors.New("no knight to activate")
	}

	if dry {
		return nil
	}

	for _, v := range vertices {
		g.setKnightActive(v, true, false)
		g.BroadcastMessage(&entities.Message{
			Type: entities.MessageTypeVertexPlacement,
			Data: v.Placement,
		})
	}

	g.BroadcastDevCardUse(entities.ProgressCoinWarlord, DevCardShowTime, -1)
	g.ReinsertDevelopmentCard(p, entities.ProgressCoinWarlord, false)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinWedding(p *entities.Player, dry bool) error {
	stealPlayers := make([]*entities.Player, 0)
	for _, ps := range g.Players {
		if ps != p && ps.CurrentHand.GetCardCount() > 0 && g.GetVictoryPoints(ps, true) > g.GetVictoryPoints(p, true) {
			stealPlayers = append(stealPlayers, ps)
		}
	}

	if len(stealPlayers) == 0 {
		return errors.New("no players to steal from")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressCoinWedding, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinWedding, 500, -1) }()

	var wg sync.WaitGroup

	for _, stoleFrom := range stealPlayers {
		q := int(stoleFrom.CurrentHand.GetCardCount())
		if q > 2 {
			q = 2
		}

		action := &entities.PlayerActionSelectCards{
			AllowedTypes: []int{1, 2, 3, 4, 5, 6, 7, 8},
			Quantity:     q,
		}

		wg.Add(1)
		p.ClearExpect()

		go func(wg *sync.WaitGroup, stoleFrom *entities.Player, action *entities.PlayerActionSelectCards) {
			defer wg.Done()

			defer g.Unlock()
			if !g.Lock() {
				return
			}

			exp, err := g.BlockForAction(stoleFrom, g.TimerVals.DiscardCards, &entities.PlayerAction{
				Type:    entities.PlayerActionTypeSelectCards,
				Data:    action,
				Message: "Choose " + strconv.Itoa(q) + " cards to give to " + p.Username,
			})
			if err != nil {
				return
			}

			var resp []int
			err = mapstructure.Decode(exp, &resp)
			if err != nil || len(resp) != 9 {
				resp = make([]int, 9)
			}

			sum := 0
			for _, ti := range action.AllowedTypes {
				t := entities.CardType(ti)
				if resp[t] > 0 {
					quantity := stoleFrom.CurrentHand.GetCardDeck(t).Quantity
					if int16(resp[t]) < quantity {
						quantity = int16(resp[t])
					}

					g.MoveCards(int(stoleFrom.Order), int(p.Order), t, int(quantity), true, false)
					sum += int(quantity)
				}
			}

			for sum < action.Quantity {
				t := stoleFrom.CurrentHand.ChooseRandomCardType()
				if t == nil {
					break
				}

				g.MoveCards(int(stoleFrom.Order), int(p.Order), *t, 1, true, false)
				sum++
			}

			stoleFrom.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})
			g.SendPlayerSecret(stoleFrom)
			g.BroadcastState()
		}(&wg, stoleFrom, action)
	}

	g.TickerPause = true
	g.Unlock()
	wg.Wait()
	if !g.Lock() {
		return nil
	}
	g.TickerPause = false

	g.ReinsertDevelopmentCard(p, entities.ProgressCoinWedding, false)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinIntrigue(p *entities.Player, dry bool) error {
	vertices := make([]*entities.Vertex, 0)
	checkVertCoord := func(C entities.Coordinate) {
		v := g.Vertices[C]
		if v == nil || v.Placement == nil {
			return
		}

		vp := v.Placement
		if vp.GetOwner() != p && vp.GetType() >= entities.BTKnight1 && vp.GetType() <= entities.BTKnight3 {
			vertices = append(vertices, v)
		}
	}

	for _, ep := range p.EdgePlacements {
		checkVertCoord(ep.GetLocation().C.C1)
		checkVertCoord(ep.GetLocation().C.C2)
	}

	if len(vertices) == 0 {
		return errors.New("no warrior to displace")
	}

	if p.GetIsBot() {
		return errors.New("TODO: not implemented")
	}

	if dry {
		return nil
	}

	exp, err := g.BlockForAction(p, 0, &entities.PlayerAction{
		Type:      entities.PlayerActionTypeChooseVertex,
		Message:   "Choose warrior to displace",
		Data:      entities.PlayerActionChooseVertex{Allowed: vertices},
		CanCancel: true,
	})
	if err != nil {
		return err
	}

	var loc entities.Coordinate
	mapstructure.Decode(exp, &loc)
	v, _ := g.Graph.GetVertex(loc)
	found := false
	for _, ov := range vertices {
		if ov == v {
			found = true
			break
		}
	}
	if !found {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressCoinIntrigue, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinIntrigue, 500, -1) }()

	g.DisplaceKnightInteractive(v.Placement.(*entities.Knight))

	g.ReinsertDevelopmentCard(p, entities.ProgressCoinIntrigue, false)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

func (g *Game) UseProgressCoinSpy(p *entities.Player, dry bool) error {
	found := false
	stealChoices := make([]bool, len(g.Players))
	stealPlayers := make([]*entities.Player, 0)

	for _, other := range g.Players {
		if other != p && other.CurrentHand.GetDevelopmentCardCount() > 0 {
			found = true
			stealChoices[other.Order] = true
			stealPlayers = append(stealPlayers, other)
		}
	}

	if !found {
		return errors.New("nothing to steal")
	}

	if dry {
		return nil
	}

	g.BroadcastDevCardUse(entities.ProgressCoinSpy, 0, -1)
	defer func() { g.BroadcastDevCardUse(entities.ProgressCoinSpy, 500, -1) }()
	g.ReinsertDevelopmentCard(p, entities.ProgressCoinSpy, false)

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

	hand := make([]int, 31)
	for _, deck := range stoleFrom.CurrentHand.DevelopmentCardDeckMap {
		hand[deck.Type] = int(deck.Quantity)
	}

	exp, err = g.BlockForAction(p, g.TimerVals.UseDevCard, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeSelectCards,
		Message: "Choose action card to steal",
		Data: entities.PlayerActionSelectCards{
			Quantity:    1,
			NotSelfHand: true,
			Hand:        hand,
			IsDevHand:   true,
		},
	})
	if err != nil {
		return err
	}

	p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

	var cards []int
	err = mapstructure.Decode(exp, &cards)

	var stealCard entities.DevelopmentCardType

	if err == nil && len(cards) == 31 {
		for i := 1; i < 31; i++ {
			if cards[i] > 0 {
				stealCard = entities.DevelopmentCardType(i)
				break
			}
		}
	}

	if stealCard == 0 {
		stealCard = *stoleFrom.CurrentHand.ChooseRandomDevCardType()
	}

	stealDeck := stoleFrom.CurrentHand.GetDevelopmentCardDeck(stealCard)
	if stealDeck.Quantity == 0 {
		return nil
	}

	deck := p.CurrentHand.GetDevelopmentCardDeck(stealCard)

	stealDeck.Quantity--
	deck.Quantity++
	g.j.WUpdateDevelopmentCard(p, deck.Type, deck.Quantity, deck.NumUsed, deck.CanUse)
	g.j.WUpdateDevelopmentCard(stoleFrom, stealDeck.Type, stealDeck.Quantity, stealDeck.NumUsed, stealDeck.CanUse)
	g.MoveDevelopmentCard(int(stoleFrom.Order), int(p.Order), deck.Type, true)

	g.SendPlayerSecret(stoleFrom)
	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}

// Keep this in coin due to code duplication from Spy
func (g *Game) DiscardProgressCard(p *entities.Player) error {
	if g.j.playing {
		return nil
	}

	hand := make([]int, 31)
	for _, deck := range p.CurrentHand.DevelopmentCardDeckMap {
		hand[deck.Type] = int(deck.Quantity)
	}

	exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
		Type:    entities.PlayerActionTypeSelectCards,
		Message: "Choose action card to discard",
		Data: entities.PlayerActionSelectCards{
			Quantity:    1,
			NotSelfHand: true,
			Hand:        hand,
			IsDevHand:   true,
		},
	})
	if err != nil {
		return err
	}

	p.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

	var cards []int
	err = mapstructure.Decode(exp, &cards)

	var discardCard entities.DevelopmentCardType
	discardCard = 0

	if err == nil && len(cards) == 31 {
		for i := 1; i < 31; i++ {
			if cards[i] > 0 {
				discardCard = entities.DevelopmentCardType(i)
				break
			}
		}
	}

	if discardCard == 0 {
		for i := 1; i < 31; i++ {
			if hand[i] > 0 {
				discardCard = entities.DevelopmentCardType(i)
				break
			}
		}
	}

	g.ReinsertDevelopmentCard(p, discardCard, true)

	g.SendPlayerSecret(p)
	g.BroadcastState()

	return nil
}
