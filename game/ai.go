package game

import (
	"imperials/entities"
	"log"
	"math"
	"math/rand"
)

type AI struct {
	g *Game

	noBuildRoad   bool
	noBuildWall   bool
	noBuyDevCard  bool
	tradeTime     int
	tradeChecked  bool
	numTradeCheck int
	robberOnMe    int
	barbarianBad  int
	failedDev     map[entities.DevelopmentCardType]bool
}

type TileScoreMap = map[entities.TileType]float64

func (ai *AI) ChooseBestVertexSettlement(p *entities.Player, allowed []*entities.Vertex) *entities.Vertex {
	if len(allowed) == 0 {
		return nil
	}

	maxScore := -9999.0
	maxScoreVertex := allowed[0]
	for v, s := range ai.getVertexSettlementScoreMap(p, allowed) {
		if s > maxScore {
			maxScore = s
			maxScoreVertex = v
		}
	}

	return maxScoreVertex
}

func (ai *AI) getVertexSettlementScoreMap(
	p *entities.Player,
	AllowedVertices []*entities.Vertex,
) map[*entities.Vertex]float64 {
	m := make(map[*entities.Vertex]float64)
	tileScore := ai.getTileScoreMap(p)
	tradeRatios := ai.g.GetRatiosForPlayer(p)
	for _, v := range AllowedVertices {
		m[v] = ai.getVertexSettlementScore(p, v, tileScore, tradeRatios)
	}
	return m
}

func (ai *AI) CopyTileScoreMap(m TileScoreMap) TileScoreMap {
	c := make(TileScoreMap)
	for k, v := range m {
		c[k] = v
	}
	return c
}

func (ai *AI) getNumberScore(num uint16) float64 {
	return 6.0 - math.Abs(float64(num)-7.0)
}

func (ai *AI) GetRobberTile(p *entities.Player, tiles []*entities.Tile) *entities.Tile {
	// Invalid coordinates, place at best position
	maxScore := 0.0
	selTile := tiles[0]

	for _, t := range tiles {
		if t.Type == entities.TileTypeDesert {
			continue
		}

		score := 0.0
		for _, vp := range ai.g.Graph.GetTilePlacements(t) {
			scaleFactor := 0.0
			switch vp.GetType() {
			case entities.BTSettlement:
				scaleFactor = 1.0
			case entities.BTCity:
				scaleFactor = 1.5
			}

			if vp.GetOwner() == p {
				scaleFactor = -5
			}

			score += scaleFactor *
				math.Pow(float64(ai.g.GetVictoryPoints(vp.GetOwner(), true)), 1.5) *
				ai.getNumberScore(t.Number)
		}

		if score > maxScore {
			selTile = t
			maxScore = score
		}
	}

	return selTile
}

func (ai *AI) getTileScoreMap(p *entities.Player) TileScoreMap {
	tileScore := make(TileScoreMap)
	for _, vp := range p.VertexPlacements {
		if vp.GetType() != entities.BTCity && vp.GetType() != entities.BTSettlement {
			continue
		}

		multiplier := 1.0
		if vp.GetType() == entities.BTCity {
			multiplier = 1.5
		}

		for _, t := range vp.GetLocation().AdjacentTiles {
			if t.Type >= entities.TileTypeWood && t.Type <= entities.TileTypeOre {
				tileScore[t.Type] += ai.getNumberScore(t.Number) * multiplier
			}
		}
	}
	return tileScore
}

func (ai *AI) getVertexSettlementScore(
	p *entities.Player,
	v *entities.Vertex,
	tileScore TileScoreMap,
	tradeRatios [9]int,
) float64 {
	if v.Placement != nil {
		return -999.0
	}

	score := 100.0
	tileScoreCopy := ai.CopyTileScoreMap(tileScore)
	for _, t := range v.AdjacentTiles {
		if t.Type >= entities.TileTypeWood && t.Type <= entities.TileTypeOre {
			s := ai.getNumberScore(t.Number)
			score += s

			penalty := 0.5 * tileScoreCopy[t.Type]
			if penalty <= s {
				score -= penalty
			} else {
				score -= s
			}

			score += 8.0
			tileScoreCopy[t.Type] += s
		} else if t.Type == entities.TileTypeGold {
			score += 16.0 + ai.getNumberScore(t.Number)
		}
	}

	for _, port := range ai.g.Ports {
		if port.Type != entities.PortTypeAny && tradeRatios[port.Type] != 2 {
			if port.Edge.C.C1 == v.C || port.Edge.C.C2 == v.C {
				score += 0.5 * tileScoreCopy[entities.TileType(port.Type)]
				break
			}
		}
	}

	return score
}

func (ai *AI) ChooseBestEdgeRoad(p *entities.Player, allowed []*entities.Edge) *entities.Edge {
	if len(allowed) == 0 {
		return nil
	}

	currVert := p.GetBuildLocationsSettlement(ai.g.Graph, false, false) // currently possible locations
	allVert := p.GetBuildLocationsSettlement(ai.g.Graph, true, true)    // all possible locations

	currScoreMap := ai.getVertexSettlementScoreMap(p, currVert)
	allScoreMap := ai.getVertexSettlementScoreMap(p, allVert)

	allowedMap := make(map[*entities.Edge]bool)
	for _, e := range allowed {
		allowedMap[e] = true
	}

	maxScore := -999.0
	maxScoreEdge := allowed[0]

	for _, e := range allowed {
		s := ai.g.ai.getEdgeRoadScore(p, e, currScoreMap, allScoreMap, allowedMap, 3)
		if s > maxScore {
			maxScore = s
			maxScoreEdge = e
		}
	}

	return maxScoreEdge
}

func (ai *AI) getEdgeRoadScore(
	p *entities.Player,
	e *entities.Edge,
	currScoreMap map[*entities.Vertex]float64,
	allScoreMap map[*entities.Vertex]float64,
	allowedMap map[*entities.Edge]bool,
	dfsMaxDepth int,
) float64 {
	if e.Placement != nil || dfsMaxDepth == 0 {
		return 0.0
	}

	v1 := ai.g.Graph.Vertices[e.C.C1]
	v2 := ai.g.Graph.Vertices[e.C.C2]

	score := 0.0

	for _, v := range []*entities.Vertex{v1, v2} {
		if _, ok := currScoreMap[v]; !ok {
			if s, aok := allScoreMap[v]; aok {
				score += s
				currScoreMap[v] = s
				defer delete(currScoreMap, v)
			}
		}
	}

	for _, adje := range ai.g.Graph.GetAdjacentEdges(e) {
		if adje.Placement == nil && !allowedMap[adje] {
			if v1.Placement != nil && (e.C.C1 == adje.C.C1 || e.C.C1 == adje.C.C2) { // v1 is common
				continue
			}
			if v2.Placement != nil && (e.C.C2 == adje.C.C1 || e.C.C2 == adje.C.C2) { // v2 is common
				continue
			}
			allowedMap[adje] = true
			defer delete(allowedMap, adje)
			score += 0.4 * ai.g.ai.getEdgeRoadScore(p, adje, currScoreMap, allScoreMap, allowedMap, dfsMaxDepth-1)
		}
	}

	return score
}

func (ai *AI) tickPlayer(p *entities.Player) bool {
	if p.PendingAction != nil {
		p.SendExpect(nil)
		return true
	}

	if ai.g.HasPlayerPendingAction() {
		return true
	}

	var cityLocs []*entities.Vertex
	var settlementLocs []*entities.Vertex

	// Populate location variables
	getLocs := func() {
		if cityLocs == nil {
			cityLocs = p.GetBuildLocationsCity(ai.g.Graph)
			settlementLocs = p.GetBuildLocationsSettlement(ai.g.Graph, false, false)
		}
	}

	recalculateBarbarianBad := func() {
		if ai.g.GetBarbarianStrength() > ai.g.GetBarbarianKnights() {
			ai.barbarianBad = 1
		} else {
			ai.barbarianBad = -1
		}
	}
	if ai.barbarianBad == 0 {
		recalculateBarbarianBad()
	}

	// Score for an offer
	offerScore := func(offer *entities.TradeOffer) float64 {
		if offer.CreatedBy == p.Order {
			return 1
		}

		getLocs()
		score := 0.0

		gain := offer.Details.Give
		lose := offer.Details.Ask
		if offer.CurrentPlayer == p.Order {
			gain = offer.Details.Ask
			lose = offer.Details.Give
		}

		scoreType := func(ct entities.CardType, want int, priority float64) {
			excess := int(p.CurrentHand.GetCardDeck(ct).Quantity) - want
			if excess > 0 {
				excess = rand.Intn(excess + 1)
			}
			score += float64(excess+gain[ct]) * priority
		}

		for i, q := range offer.Details.Ask {
			deck := p.CurrentHand.GetCardDeck(entities.CardType(i))
			if deck == nil {
				continue
			}
			if int(deck.Quantity) < q {
				return -1
			}

			score -= float64(lose[i])

			if ai.g.Mode == entities.CitiesAndKnights {
				if ai.barbarianBad == 1 {
					if p.HasInactiveKnight() {
						scoreType(entities.CardTypeWheat, 1, 2)
					} else {
						scoreType(entities.CardTypeWool, 1, 1.5)
						scoreType(entities.CardTypeOre, 1, 1.5)
					}
				}
			}

			if len(cityLocs) > 0 && p.BuildablesLeft[entities.BTCity] > 0 {
				scoreType(entities.CardTypeWheat, 2, 1)
				scoreType(entities.CardTypeOre, 3, 1)
			}

			if len(settlementLocs) > 0 && p.BuildablesLeft[entities.BTSettlement] > 0 {
				scoreType(entities.CardTypeWood, 1, 1)
				scoreType(entities.CardTypeBrick, 1, 1)
				scoreType(entities.CardTypeWool, 1, 1)
				scoreType(entities.CardTypeWheat, 1, 1)
			}

			if len(settlementLocs) == 0 {
				scoreType(entities.CardTypeWood, 1, 1)
				scoreType(entities.CardTypeBrick, 1, 1)
			}

			if ai.g.Mode == entities.CitiesAndKnights {
				if i >= int(entities.CardTypePaper) {
					score -= float64(lose[i])
					score += float64(2 * gain[i])
				}
			}
		}

		return score
	}

	// Accept and reject trade offers
	if ai.g.CurrentPlayer != p {
		for _, o := range ai.g.CurrentOffers {
			if o.Acceptances[p.Order] == 0 {
				if offerScore(o) > 0 {
					ai.g.AcceptOffer(o.Id, p)
				} else {
					ai.g.RejectOffer(o.Id, p)
				}
			}
		}

		return false
	}

	getLocs()

	// Current offers to show
	currentOffers := make([]*entities.TradeOfferDetails, 0)

	// Bring hand to this point if one card missing
	convergeHand := func(want [9]int, bank bool, priority int) {
		missingCards := 0
		for i, q := range want {
			deck := p.CurrentHand.GetCardDeck(entities.CardType(i))
			if deck == nil {
				continue
			}

			if deck.Quantity < int16(q) {
				missingCards += q - int(deck.Quantity)
			}
		}
		if missingCards != 1 && rand.Intn(100) > priority {
			return
		}

		ratios := ai.g.GetRatiosForPlayer(p)

		for i, q := range want {
			deck := p.CurrentHand.GetCardDeck(entities.CardType(i))
			if deck == nil {
				continue
			}

			if deck.Quantity >= int16(q) {
				continue
			}

			for t, giveDeck := range p.CurrentHand.CardDeckMap {
				if giveDeck.Quantity <= 0 {
					continue
				}

				if ai.g.Mode == entities.CitiesAndKnights {
					if t >= entities.CardTypePaper && rand.Intn(10) >= 3 {
						continue
					}
				}

				if (!bank && giveDeck.Quantity-1 >= int16(want[t])) ||
					(bank && giveDeck.Quantity-int16(ratios[t]) >= int16(want[t])) {
					giveArray := [9]int{0, 0, 0, 0, 0, 0, 0, 0, 0}
					askArray := [9]int{0, 0, 0, 0, 0, 0, 0, 0, 0}
					askArray[i] = 1
					giveArray[t] = 1

					if bank {
						giveArray[t] = ratios[t]
					}

					currentOffers = append(currentOffers, &entities.TradeOfferDetails{
						Give: giveArray,
						Ask:  askArray,
					})
				}
			}
		}
	}

	executeHand := func(bank bool) bool {
		// iterate over currentOffers
		for len(currentOffers) > 0 && len(ai.g.CurrentOffers) < 4 {
			// get a random offer from currentoffers and remove
			oid := rand.Intn(len(currentOffers))
			offer := currentOffers[oid]

			// remove oid-th element from currentOffers
			currentOffers = append(currentOffers[:oid], currentOffers[oid+1:]...)

			_, err := ai.g.CreateOffer(p, offer)
			if err != nil {
				log.Println("Error creating offer:", err)
			} else {
				if bank {
					return true
				}
			}
		}

		return false
	}

	if ai.g.Mode == entities.CitiesAndKnights {
		for _, it := range [3]entities.CardType{entities.CardTypePaper, entities.CardTypeCloth, entities.CardTypeCoin} {
			if ai.g.CanBuildImprovement(p, it) == nil {
				if err := ai.g.BuildCityImprovement(p, it); err != nil {
					log.Println("[BUG] Bot failed to build improvement", err)
				}
				return true
			}
		}

		// Activate knight
		if p.CurrentHand.HasResources(0, 0, 0, 1, 0) {
			locs := p.GetActivateLocationsKnight(ai.g.Graph)
			if len(locs) > 0 {
				loc := locs[rand.Intn(len(locs))]
				if err := ai.g.ai.g.ActivateKnight(p, loc.C); err != nil {
					log.Println("[BUG]: bot failed to activate knight", err)
				}
				recalculateBarbarianBad()
				return true
			}
		}

		// Build and upgrade knight
		if !ai.noBuyDevCard && p.CanBuild(entities.BTKnight1) == nil {
			if len(settlementLocs) > 0 || len(cityLocs) > 0 {
				// Save the cards to build settlement/city
				if rand.Intn(8) >= 3 &&
					p.CurrentHand.GetCardCount() < ai.g.GetDiscardLimit(p) &&
					(ai.barbarianBad != 1 || p.HasInactiveKnight()) {
					ai.noBuyDevCard = true
					return true
				}
			}

			locs := p.GetBuildLocationsKnight(ai.g.Graph, true)
			if len(locs) > 0 {
				loc := locs[rand.Intn(len(locs))]

				// Try to find a place where settlement cant be built
				settlementLocsMap := make(map[*entities.Vertex]bool)
				for _, l := range settlementLocs {
					settlementLocsMap[l] = true
				}
				nonIntrusiveLocs := make([]*entities.Vertex, 0)
				for _, loc := range locs {
					if !settlementLocsMap[loc] {
						nonIntrusiveLocs = append(nonIntrusiveLocs, loc)
					}
				}
				if len(nonIntrusiveLocs) > 0 {
					loc = nonIntrusiveLocs[rand.Intn(len(nonIntrusiveLocs))]
				}

				if err := ai.g.BuildKnight(p, loc.C); err != nil {
					log.Println("[BUG]: bot failed to build knight")
				}
				return true
			}
		}

		// Chase away the robber
		if ai.robberOnMe == 0 {
			ai.robberOnMe = -1
			for _, vp := range ai.g.Graph.GetTilePlacements(ai.g.Robber.Tile) {
				if vp.GetOwner() == p && (vp.GetType() == entities.BTCity || vp.GetType() == entities.BTSettlement) {
					ai.robberOnMe = 1
					break
				}
			}

			if ai.robberOnMe == 1 && ai.g.BarbarianPosition >= 3 && ai.g.KnightChaseRobber(p, true) == nil {
				err := ai.g.KnightChaseRobber(p, false)
				if err != nil {
					log.Println("[BUG]: bot failed to chase away robber")
				}
				recalculateBarbarianBad()
				return true
			}
		}
	}

	if len(cityLocs) > 0 && p.CanBuild(entities.BTCity) == nil {
		vertex := ai.ChooseBestVertexSettlement(p, cityLocs)
		if err := ai.g.BuildCity(p, vertex.C); err != nil {
			log.Println("[BUG] Bot failed to build city", err)
			return false
		}
		return true
	}

	if len(settlementLocs) > 0 && p.CanBuild(entities.BTSettlement) == nil {
		vertex := ai.ChooseBestVertexSettlement(p, settlementLocs)
		if err := ai.g.BuildSettlement(p, vertex.C); err != nil {
			log.Println("[BUG] Bot failed to build settlement", err)
			return false
		}
		return true
	}

	// Trade
	tradeCheck := func(bank bool) bool {
		ai.numTradeCheck++
		if !bank && ai.numTradeCheck > 4 {
			return false
		}

		if p.CurrentHand.GetCardCount() > 0 {
			if ai.g.Mode == entities.CitiesAndKnights {
				if ai.barbarianBad == 1 {
					hand := [9]int{0, 0, 0, 0, 0, 0, 0, 0, 0}
					if p.HasInactiveKnight() {
						hand[entities.CardTypeWheat] = 1
					} else {
						hand[entities.CardTypeWool] = 1
						hand[entities.CardTypeOre] = 1
					}
					convergeHand(hand, bank, 75)
				}
			}

			if len(cityLocs) > 0 && p.BuildablesLeft[entities.BTCity] > 0 {
				convergeHand([9]int{0, 0, 0, 0, 2, 3, 0, 0, 0}, bank, 30)
			}
			if len(settlementLocs) > 0 && p.BuildablesLeft[entities.BTSettlement] > 0 {
				convergeHand([9]int{0, 1, 1, 1, 1, 0, 0, 0, 0}, bank, 20)

			}
			if p.BuildablesLeft[entities.BTRoad] > 0 {
				convergeHand([9]int{0, 1, 1, 0, 0, 0, 0, 0, 0}, bank, 10)
			}

			if executeHand(bank) {
				return true
			}
		}
		return false
	}

	// Player trade
	if !ai.tradeChecked {
		tradeCheck(false)
		ai.tradeChecked = true
		return true
	} else {
		ai.tradeTime--
		openOffer := func(p *entities.Player) bool {
			for _, offer := range ai.g.CurrentOffers {
				for order, a := range offer.Acceptances {
					if a == 0 && order != int(p.Order) {
						return true
					}
				}
			}
			return false
		}

		if ai.tradeTime <= 0 || !openOffer(p) {
			ai.tradeTime = 0
			for _, o := range ai.g.CurrentOffers {
				acceptors := make([]int, 0)
				for i, a := range o.Acceptances {
					if a == 1 && i != int(p.Order) {
						acceptors = append(acceptors, i)
					}
				}

				if len(acceptors) > 0 {
					aorder := acceptors[rand.Intn(len(acceptors))]
					if offerScore(o) > 0 {
						err := ai.g.CloseOffer(o.Id, p, uint16(aorder))
						if err == nil {
							ai.tradeTime = 6
							ai.tradeChecked = false
							return true
						}
					}
				}
			}
			ai.g.BroadcastMessage(&entities.Message{Type: entities.MessageTypeTradeCloseOffers})
		} else {
			return true
		}
	}

	// Bank trade
	if tradeCheck(true) {
		return true
	}

	if !ai.noBuildRoad && p.CanBuild(entities.BTRoad) == nil {
		if len(settlementLocs) > 0 {
			// Save the cards to build settlement
			if rand.Intn(10) >= 2 && p.CurrentHand.GetCardCount() < ai.g.GetDiscardLimit(p)+2 {
				ai.noBuildRoad = true
				return true
			}
		}

		edges := p.GetBuildLocationsRoad(ai.g.Graph, false)
		if len(edges) > 0 {
			edge := ai.ChooseBestEdgeRoad(p, edges)
			if err := ai.g.BuildRoad(p, edge.C); err != nil {
				log.Println("[BUG] Bot failed to build road", err)
				return false
			}
			return true
		}
	}

	if ai.g.Mode == entities.Base && !ai.noBuyDevCard {
		if len(settlementLocs) > 0 || len(cityLocs) > 0 {
			// Save the cards to build settlement/city
			if rand.Intn(8) >= 3 && p.CurrentHand.GetCardCount() < ai.g.GetDiscardLimit(p) {
				ai.noBuyDevCard = true
				return true
			}
		}

		if p.CanBuyDevelopmentCard() {
			ai.g.BuyDevelopmentCard(p)
			return true
		}
	}

	devCards := make([]entities.DevelopmentCardType, 0)
	for t, deck := range p.CurrentHand.DevelopmentCardDeckMap {
		if deck.CanUse && !ai.failedDev[t] {
			for i := 0; i < int(deck.Quantity); i++ {
				devCards = append(devCards, t)
			}
		}
	}

	if len(devCards) > 0 {
		dc := devCards[rand.Intn(len(devCards))]
		err := ai.g.UseDevelopmentCard(p, dc)
		if err != nil {
			ai.failedDev[dc] = true
		}
		return true
	}

	if ai.g.Mode == entities.CitiesAndKnights && !ai.noBuildWall && p.CanBuild(entities.BTWall) == nil {
		if len(settlementLocs) > 0 {
			// Save the cards to build settlement
			if rand.Intn(8) >= 3 && p.CurrentHand.GetCardCount() < ai.g.GetDiscardLimit(p) {
				ai.noBuildWall = true
				return true
			}
		}

		vertices := p.GetBuildLocationsWall(ai.g.Graph)
		if len(vertices) > 0 {
			v := vertices[rand.Intn(len(vertices))]
			if err := ai.g.BuildWall(p, v.C); err != nil {
				log.Println("[BUG] Bot failed to build wall", err)
				return false
			}
			return true
		}
	}

	return false
}

func (ai *AI) Tick() bool {
	if !ai.g.Initialized ||
		ai.g.GameOver ||
		ai.g.DiceState == 0 ||
		ai.g.InitPhase {
		return false
	}

	acted := false
	for _, p := range ai.g.Players {
		if p.GetIsBot() {
			acted = ai.tickPlayer(p) || acted
		}
	}
	return acted
}

func (ai *AI) Reset() {
	ai.noBuildRoad = false
	ai.noBuildWall = false
	ai.tradeTime = 6
	ai.tradeChecked = false
	ai.numTradeCheck = 0
	ai.noBuyDevCard = false
	ai.robberOnMe = 0
	ai.barbarianBad = 0
	ai.failedDev = make(map[entities.DevelopmentCardType]bool)
}
