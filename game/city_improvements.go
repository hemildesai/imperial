package game

import (
	"errors"
	"imperials/entities"

	"github.com/mitchellh/mapstructure"
)

func (g *Game) CanBuildImprovement(p *entities.Player, ct entities.CardType) error {
	if g.Mode != entities.CitiesAndKnights {
		return errors.New("wrong game mode")
	}

	if ct != entities.CardTypePaper && ct != entities.CardTypeCloth && ct != entities.CardTypeCoin {
		return errors.New("no such improvement")
	}

	haveQ := p.CurrentHand.GetCardDeck(ct).Quantity
	if p.UsingDevCard == entities.ProgressPaperCrane {
		haveQ++
	}
	if haveQ <= int16(p.Improvements[int(ct)]) {
		return errors.New("not enough commodity cards")
	}

	if p.Improvements[int(ct)] >= 5 {
		return errors.New("cannot improve further")
	}

	// Check player has at least one city
	hasCity := false
	for _, vp := range p.VertexPlacements {
		if vp.GetType() == entities.BTCity {
			hasCity = true
			break
		}
	}
	if !hasCity {
		return errors.New("no town to improve")
	}

	// Check player has at least one free city if building metropolis
	if p.Improvements[int(ct)] >= 3 {
		currHolder := g.ExtraVictoryPoints.Metropolis[ct]
		if currHolder == nil || (currHolder != p && currHolder.Improvements[int(ct)] == p.Improvements[int(ct)]) {
			// Getting new metropolis
			hasEmptyCity := false
			for _, vp := range p.VertexPlacements {
				if vp.GetType() == entities.BTCity && vp.(*entities.City).Metropolis == 0 {
					hasEmptyCity = true
					break
				}
			}
			if !hasEmptyCity {
				return errors.New("no town that can hold a wonder")
			}
		}
	}

	return nil
}

func (g *Game) BuildCityImprovement(p *entities.Player, ct entities.CardType) error {
	if err := g.EnsureCurrentPlayer(p); err != nil {
		return err
	}

	if err := g.ensureDiceRolled(); err != nil {
		return err
	}

	if err := g.CanBuildImprovement(p, ct); err != nil {
		return err
	}

	defer g.BroadcastState()

	quantity := p.Improvements[int(ct)] + 1
	if p.UsingDevCard == entities.ProgressPaperCrane {
		quantity--
	}
	g.MoveCards(int(p.Order), -1, ct, quantity, true, false)
	p.Improvements[int(ct)] += 1

	g.j.WCityImprove(p, ct, p.Improvements[int(ct)])

	// Check bonus
	if p.Improvements[int(ct)] == 3 {
		g.showWonderBuilt(p, ct)
	}

	// Check for metropolis
	if !g.j.playing && p.Improvements[int(ct)] >= 4 {
		// Get if this is a new high
		isNewHigh := true
		for _, other := range g.Players {
			if other != p && other.Improvements[int(ct)] >= p.Improvements[int(ct)] {
				isNewHigh = false
				break
			}
		}
		if isNewHigh {
			g.showWonderBuilt(p, ct)
		}

		currHolder := g.ExtraVictoryPoints.Metropolis[ct]
		if currHolder != nil && currHolder != p {
			if p.Improvements[int(ct)] > currHolder.Improvements[int(ct)] {
				// currHolder lost metropolis
				for _, vp := range currHolder.VertexPlacements {
					if vp.GetType() == entities.BTCity && vp.(*entities.City).Metropolis == ct {
						vp.(*entities.City).Metropolis = 0

						g.BroadcastMessage(&entities.Message{
							Type: entities.MessageTypeVertexPlacement,
							Data: vp,
						})

						g.j.WBuildMetropolis(vp.GetLocation())
						break
					}
				}

				currHolder = nil
				g.ExtraVictoryPoints.Metropolis[ct] = nil
			}
		}

		if currHolder == nil {
			// Getting new metropolis
			g.ExtraVictoryPoints.Metropolis[ct] = p
			vertices := make([]*entities.Vertex, 0)

			for _, vp := range p.VertexPlacements {
				if vp.GetType() == entities.BTCity && vp.(*entities.City).Metropolis == 0 {
					vertices = append(vertices, vp.GetLocation())
				}
			}

			exp, err := g.BlockForAction(p, g.TimerVals.UseDevCard, &entities.PlayerAction{
				Type:    entities.PlayerActionTypeChooseVertex,
				Message: "Choose town to place wonder",
				Data:    entities.PlayerActionChooseVertex{Allowed: vertices},
			})
			if err != nil {
				return err
			}

			var loc entities.Coordinate
			mapstructure.Decode(exp, &loc)
			buildVertex, _ := g.Graph.GetVertex(loc)
			found := false
			for _, ov := range vertices {
				if ov == buildVertex {
					found = true
					break
				}
			}
			if !found {
				buildVertex = vertices[0]
			}

			{
				vp := buildVertex.Placement
				vp.(*entities.City).Metropolis = ct

				g.BroadcastMessage(&entities.Message{
					Type: entities.MessageTypeVertexPlacement,
					Data: vp,
				})

				g.j.WBuildMetropolis(vp.GetLocation())
			}
		}
	}

	g.CheckForVictory()
	g.SendPlayerSecret(p)

	return nil
}

func (g *Game) showWonderBuilt(p *entities.Player, ct entities.CardType) {
	offset := entities.DevelopmentCardType(p.Improvements[int(ct)] - 3)
	switch ct {
	case entities.CardTypePaper:
		g.BroadcastDevCardUse(entities.CardPaper3+offset, DevCardShowTime, int(p.Order))
	case entities.CardTypeCloth:
		g.BroadcastDevCardUse(entities.CardCloth3+offset, DevCardShowTime, int(p.Order))
	case entities.CardTypeCoin:
		g.BroadcastDevCardUse(entities.CardCoin3+offset, DevCardShowTime, int(p.Order))
	}
}
