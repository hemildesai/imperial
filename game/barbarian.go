package game

import (
	"imperials/entities"
	"sync"

	"github.com/mitchellh/mapstructure"
)

func (g *Game) GetBarbarianStrength() int {
	if g.Mode != entities.CitiesAndKnights {
		return -1
	}

	strength := 0
	for _, p := range g.Players {
		for _, vp := range p.VertexPlacements {
			if vp.GetType() == entities.BTCity {
				strength++
			}
		}
	}
	return strength
}

func (g *Game) GetBarbarianKnights() int {
	if g.Mode != entities.CitiesAndKnights {
		return -1
	}

	strength := 0
	for _, p := range g.Players {
		strength += p.GetActivatedKnightStrength()
	}
	return strength
}

func (g *Game) MoveBarbarian() {
	g.BarbarianPosition -= 1

	if g.BarbarianPosition == 0 {
		// Attack!
		g.NumBarbarianAttacks++
		g.BarbarianPosition = 7

		totalKnights := 0
		maxKnights := 0
		maxKnightPlayers := make([]*entities.Player, 0)
		minKnights := 999
		minKnightPlayers := make([]*entities.Player, 0)

		for _, p := range g.Players {
			k := p.GetActivatedKnightStrength()
			totalKnights += k

			// Check if player has at least one non-metropolis city
			// Deactivate knights in the same loop
			hasCity := false
			for _, vp := range p.VertexPlacements {
				if vp.GetType() == entities.BTCity && vp.(*entities.City).Metropolis == 0 {
					hasCity = true
				}

				if vp.GetType() >= entities.BTKnight1 && vp.GetType() <= entities.BTKnight3 {
					g.setKnightActive(vp.GetLocation(), false, false)
					g.BroadcastMessage(&entities.Message{
						Type: entities.MessageTypeVertexPlacement,
						Data: vp,
					})
				}
			}

			if k > maxKnights {
				maxKnights = k
				maxKnightPlayers = make([]*entities.Player, 1)
				maxKnightPlayers[0] = p
			} else if k == maxKnights {
				maxKnightPlayers = append(maxKnightPlayers, p)
			}

			if hasCity {
				if k < minKnights {
					minKnights = k
					minKnightPlayers = make([]*entities.Player, 1)
					minKnightPlayers[0] = p
				} else if k == minKnights {
					minKnightPlayers = append(minKnightPlayers, p)
				}
			}
		}

		if totalKnights >= g.GetBarbarianStrength() { // Do not use g.GetBarbarianKnights()
			// Victory
			if len(maxKnightPlayers) > 1 {
				if !g.j.playing {
					go g.BarbarianDistributeProgressCards(maxKnightPlayers)
				}
			} else if len(maxKnightPlayers) == 1 {
				// Give victory point to maxKnightPlayers[0]
				player := maxKnightPlayers[0]
				if g.ExtraVictoryPoints.AvailableDefenderPoints > 0 {
					i := len(g.ExtraVictoryPoints.DefenderPoints) - g.ExtraVictoryPoints.AvailableDefenderPoints
					g.ExtraVictoryPoints.DefenderPoints[i] = player
					g.ExtraVictoryPoints.AvailableDefenderPoints--
					g.BroadcastDevCardUse(entities.CardDefender, DevCardShowTime, int(player.Order))
					g.CheckForVictory()
				}
			}
		} else {
			// Defeat
			if !g.j.playing && len(minKnightPlayers) > 0 {
				go g.BarbarianDestruction(minKnightPlayers)
			}
		}
	}
}

// Distribute progress cards
func (g *Game) BarbarianDistributeProgressCards(players []*entities.Player) {
	g.ActionMutex.Lock()
	defer g.ActionMutex.Unlock()

	defer g.Unlock()
	if !g.Lock() {
		return
	}

	for _, p := range players {
		p.ChoosingProgressCard = true
		exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeChooseImprovement,
			Message: "Choose type of action card to receive",
		})
		if err != nil {
			return
		}
		p.ChoosingProgressCard = false

		var res entities.CardType
		mapstructure.Decode(exp, &res)
		if res != entities.CardTypePaper && res != entities.CardTypeCloth && res != entities.CardTypeCoin {
			res = entities.CardTypePaper
		}

		g.GiveProgressCard(res, int(p.Order))
		g.SendPlayerSecret(p)
		g.BroadcastState()

		if p != g.CurrentPlayer && p.CurrentHand.GetDevelopmentCardCount() > 4 {
			g.DiscardProgressCard(p)
		}
	}
}

func (g *Game) GiveProgressCard(deckType entities.CardType, order int) {
	deck := g.Bank.DevelopmentCardOrder[deckType]
	player := g.Players[order]

	if len(deck) == 0 {
		return
	}

	if !g.j.playing {
		g.j.WGiveProgress(player, deckType)
	}

	cardType := deck[0]
	g.Bank.DevelopmentCardOrder[deckType] = deck[1:]

	// Victory points
	if cardType == entities.ProgressCoinConstitution {
		g.ExtraVictoryPoints.ConstitutionHolder = player
		g.BroadcastDevCardUse(cardType, DevCardShowTime, int(player.Order))
		g.CheckForVictory()
	} else if cardType == entities.ProgressPaperPrinter {
		g.ExtraVictoryPoints.PrinterHolder = player
		g.BroadcastDevCardUse(cardType, DevCardShowTime, int(player.Order))
		g.CheckForVictory()
	} else {
		playerDeck := player.CurrentHand.GetDevelopmentCardDeck(cardType)
		if playerDeck == nil {
			return
		}
		playerDeck.Quantity += 1
		g.MoveDevelopmentCard(-1, int(player.Order), cardType, true)
	}
}

// Destroy cities
// Runs in separate goroutine
func (g *Game) BarbarianDestruction(players []*entities.Player) {
	g.ActionMutex.Lock()
	defer g.ActionMutex.Unlock()

	defer g.Unlock()
	if !g.Lock() {
		return
	}

	var wg sync.WaitGroup

	for _, p := range players {
		wg.Add(1)
		p.ClearExpect()

		go func(wg *sync.WaitGroup, p *entities.Player) {
			defer wg.Done()

			defer g.Unlock()
			if !g.Lock() {
				return
			}

			vertices := make([]*entities.Vertex, 0)
			for _, vp := range p.VertexPlacements {
				if vp.GetType() == entities.BTCity && vp.(*entities.City).Metropolis == 0 {
					vertices = append(vertices, vp.GetLocation())
				}
			}

			if len(vertices) == 0 {
				return
			}

			exp, err := g.BlockForAction(p, g.TimerVals.DiscardCards, &entities.PlayerAction{
				Type: entities.PlayerActionTypeChooseVertex,
				Data: &entities.PlayerActionChooseVertex{
					Allowed: vertices,
				},
				Message: "Choose town to sacrifice",
			})
			if err != nil {
				return
			}

			var C entities.Coordinate
			err = mapstructure.Decode(exp, &C)
			vertex, _ := g.Graph.GetVertex(C)
			if err != nil || vertex == nil {
				vertex = vertices[0]
			}

			if vertex.Placement.GetType() == entities.BTCity {
				if vertex.Placement.(*entities.City).Wall {
					p.BuildablesLeft[entities.BTWall]++
				}

				vertex.RemovePlacement()
				p.BuildablesLeft[entities.BTCity]++
				g.j.WVertexBuild(vertex, true)

				p.BuildAtVertex(vertex, entities.BTSettlement)
				p.BuildablesLeft[entities.BTSettlement]--
				g.j.WVertexBuild(vertex, true)
			}

			g.BroadcastMessage(&entities.Message{
				Type: entities.MessageTypeVertexPlacement,
				Data: vertex.Placement,
			})

			g.SendPlayerSecret(p)
			g.BroadcastState()
		}(&wg, p)
	}

	g.TickerPause = true
	g.Unlock()
	wg.Wait()
	if !g.Lock() {
		return
	}
	g.TickerPause = false
}
