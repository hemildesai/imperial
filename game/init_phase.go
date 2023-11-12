package game

import (
	"imperials/entities"
	"log"

	"github.com/mitchellh/mapstructure"
)

func (g *Game) IsInitPhase() bool {
	return g.InitPhase
}

func (g *Game) RunInitPhase() {
	// g.simuateInit()
	go g.startInitPhase()
}

func (g *Game) startInitPhase() {
	defer g.Unlock()
	if !g.Lock() {
		return
	}

	g.j.WSetInitPhase(g.InitPhase)
	built := 0

	initialAllowedVertices := make(map[*entities.Vertex]bool)
	initialVertices := g.CurrentPlayer.GetBuildLocationsSettlement(g.Graph, true, false)
	for _, v := range initialVertices {
		initialAllowedVertices[v] = true
	}

	// Build at vertex
	initVertex := func(g *Game, p *entities.Player) {
		g.resetTimeLeft()
		AllowedVertices := make([]*entities.Vertex, 0)
		for _, v := range p.GetBuildLocationsSettlement(g.Graph, true, false) {
			if initialAllowedVertices[v] {
				AllowedVertices = append(AllowedVertices, v)
			}
		}
		if len(AllowedVertices) == 0 {
			return
		}

		exp, err := g.BlockForAction(p, g.TimerVals.InitVert, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeChooseVertex,
			Message: "Choose location for settlement",
			Data: &entities.PlayerActionChooseVertex{
				Allowed: AllowedVertices,
			},
		})
		if err != nil {
			return
		}

		var C entities.Coordinate
		err = mapstructure.Decode(exp, &C)
		if err != nil {
			C.X = -999 // Make it invalid
		}

		build := func(g *Game, C entities.Coordinate) error {
			if built >= len(g.Players) && g.Mode == entities.CitiesAndKnights {
				return g.BuildCity(p, C)
			} else {
				return g.BuildSettlement(p, C)
			}
		}

		err = build(g, C)
		if err != nil {
			C = g.ai.ChooseBestVertexSettlement(p, AllowedVertices).C
			build(g, C)
		}
		builtVertex, _ := g.Graph.GetVertex(C)
		initialAllowedVertices[builtVertex] = false

		if built >= len(g.Players) {
			v, _ := g.Graph.GetVertex(C)
			for _, t := range v.AdjacentTiles {
				if t.Type != entities.TileTypeGold {
					g.MoveCards(-1, int(p.Order), entities.CardType(t.Type), 1, true, false)
				}
			}
		}

		built++
	}

	// Build at edge
	initEdge := func(g *Game, p *entities.Player) {
		g.resetTimeLeft()
		AllowedEdges := p.GetBuildLocationsRoad(g.Graph, true)
		if len(AllowedEdges) == 0 {
			return
		}

		exp, err := g.BlockForAction(p, g.TimerVals.InitEdge, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeChooseEdge,
			Message: "Choose location for road",
			Data: &entities.PlayerActionChooseEdge{
				Allowed: AllowedEdges,
			},
		})
		if err != nil {
			return
		}

		var C entities.EdgeCoordinate
		err = mapstructure.Decode(exp, &C)
		if err != nil {
			C.C1.X = -999 // Make it invalid
		}

		err = g.BuildRoad(p, C)
		if err != nil {
			C = g.ai.ChooseBestEdgeRoad(p, AllowedEdges).C
			g.BuildRoad(p, C)
		}
	}

	// Place settlement for each player
	for i := 0; i < len(g.Players); i++ {
		initVertex(g, g.Players[i])
		initEdge(g, g.Players[i])
	}

	// Reverse
	for i := len(g.Players) - 1; i >= 0; i-- {
		initVertex(g, g.Players[i])
		initEdge(g, g.Players[i])
		g.SendPlayerSecret(g.Players[i])
		g.BroadcastState()
	}

	g.resetTimeLeft()
	g.CurrentPlayer.TimeLeft = g.TimerVals.DiceRoll

	g.InitPhase = false
	g.j.WSetInitPhase(g.InitPhase)
	g.SendPlayerSecret(g.CurrentPlayer)
	g.BroadcastState()
	g.ai.Reset()
}

func (g *Game) simuateInit() {
	if !g.InitPhase {
		log.Println("Init phase already done: ", g.Players[0].CurrentHand.GetCardCount())
		return
	}

	g.Players[0].CurrentHand.UpdateResources(4, 4, 4, 5, 4)
	g.j.WUpdateResources(g.Players[0], 4, 4, 4, 5, 4)
	g.Players[1].CurrentHand.UpdateResources(4, 4, 4, 4, 10)
	g.j.WUpdateResources(g.Players[1], 4, 4, 4, 4, 10)
	g.Players[2].CurrentHand.UpdateResources(4, 4, 4, 4, 10)
	g.j.WUpdateResources(g.Players[2], 4, 4, 4, 4, 10)
	// g.Players[3].CurrentHand.UpdateResources(4, 4, 4, 4, 10)
	// g.j.WUpdateResources(g.Players[3], 4, 4, 4, 4, 10)

	g.Players[0].CurrentHand.GetDevelopmentCardDeck(1).Quantity = 3
	g.Players[0].CurrentHand.GetDevelopmentCardDeck(1).CanUse = true
	g.j.WUpdateDevelopmentCard(g.Players[0], 1, 3, 0, true)
	g.Players[0].CurrentHand.GetDevelopmentCardDeck(2).Quantity = 3
	g.j.WUpdateDevelopmentCard(g.Players[0], 2, 3, 0, false)
	g.Players[0].CurrentHand.GetDevelopmentCardDeck(3).Quantity = 1
	g.j.WUpdateDevelopmentCard(g.Players[0], 3, 1, 0, false)
	g.Players[0].CurrentHand.GetDevelopmentCardDeck(4).Quantity = 1
	g.j.WUpdateDevelopmentCard(g.Players[0], 4, 1, 0, false)
	g.Players[0].CurrentHand.GetDevelopmentCardDeck(5).Quantity = 1
	g.j.WUpdateDevelopmentCard(g.Players[0], 5, 1, 0, false)

	g.InitPhase = true
	g.j.WSetInitPhase(g.InitPhase)
	for i := 8; i >= 1; i-- {
		if i == 8 {
			g.BuildSettlement(g.CurrentPlayer, g.Ports[0].Edge.C.C1)
			g.BuildRoad(g.CurrentPlayer, g.CurrentPlayer.GetBuildLocationsRoad(g.Graph, true)[0].C)
		} else {
			g.BuildSettlement(g.CurrentPlayer, g.CurrentPlayer.GetBuildLocationsSettlement(g.Graph, true, false)[0].C)
			g.BuildRoad(g.CurrentPlayer, g.CurrentPlayer.GetBuildLocationsRoad(g.Graph, true)[0].C)
		}
		g.CurrentPlayer = g.Players[int(g.CurrentPlayer.Order+1)%len(g.Players)]
	}
	g.InitPhase = false

	g.j.WSetInitPhase(g.InitPhase)
	g.CurrentPlayer = g.Players[0]
	g.SendPlayerSecret(g.CurrentPlayer)
	g.BroadcastState()
}
