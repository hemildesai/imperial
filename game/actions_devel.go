package game

import (
	"errors"
	"imperials/entities"

	"github.com/mitchellh/mapstructure"
)

const DevCardShowTime = 4000

func (g *Game) UseDevelopmentCard(player *entities.Player, developmentCardType entities.DevelopmentCardType) error {
	if err := g.EnsureCurrentPlayer(player); err != nil {
		return err
	}

	if err := g.ensureNotSpecialBuildPhase(); err != nil {
		return err
	}

	thisDeck := player.CurrentHand.GetDevelopmentCardDeck(developmentCardType)
	if thisDeck == nil || thisDeck.Quantity < 1 {
		return errors.New("cannot use action card")
	}

	if !thisDeck.CanUse {
		return errors.New("cannot use action card this turn")
	}

	useCard := func() {
		thisDeck.Quantity--
		thisDeck.NumUsed++
		g.MoveDevelopmentCard(int(player.Order), -1, thisDeck.Type, false)
		if g.Mode == entities.Base {
			for _, deck := range g.CurrentPlayer.CurrentHand.DevelopmentCardDeckMap {
				deck.CanUse = false
				g.j.WUpdateDevelopmentCard(player, deck.Type, deck.Quantity, deck.NumUsed, deck.CanUse)
			}
		}
	}

	switch developmentCardType {
	case entities.DevelopmentCardKnight:
		useCard()
		g.BroadcastDevCardUse(thisDeck.Type, 0, -1)
		g.SetExtraVictoryPoints()
		g.MoveRobberInteractive()
		g.StealCardWithRobber()
		g.CheckForVictory()
		g.BroadcastDevCardUse(thisDeck.Type, 500, -1)

	case entities.DevelopmentCardMonopoly:
		useCard()
		g.BroadcastDevCardUse(thisDeck.Type, 0, -1)

		AllowedTypes := []int{1, 2, 3, 4, 5}
		res, err := g.BlockForAction(player, g.TimerVals.UseDevCard, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeSelectCards,
			Message: "Choose type of resource to steal",
			Data: entities.PlayerActionSelectCards{
				AllowedTypes: AllowedTypes,
				Quantity:     1,
				NotSelfHand:  true,
			},
		})
		if err != nil {
			return err
		}

		player.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

		var cards []float64
		err = mapstructure.Decode(res, &cards)
		if err != nil || len(cards) != 9 {
			cards = make([]float64, 9)
		}

		monopolyResource := entities.CardTypeWood
		found := false
		for t, q := range cards {
			if q > 0 {
				monopolyResource = entities.CardType(t)
				found = true
				break
			}
		}

		if !found { // Probably a timeout
			// Cheat code - find the most abundant card
			minCount := 999
			for _, t := range AllowedTypes {
				deck := g.Bank.Hand.GetCardDeck(entities.CardType(t))
				if deck.Quantity < int16(minCount) {
					monopolyResource = deck.Type
					minCount = int(deck.Quantity)
				}
			}
		}

		for _, p := range g.Players {
			if p == player {
				continue
			}

			deck := p.CurrentHand.CardDeckMap[monopolyResource]
			if deck != nil {
				resourceQuantity := deck.Quantity
				g.MoveCards(int(p.Order), int(player.Order), monopolyResource, int(resourceQuantity), true, false)
			}

			g.SendPlayerSecret(p)
		}

		g.BroadcastDevCardUse(thisDeck.Type, DevCardShowTime, -1)
		g.SendPlayerSecret(player)
		g.BroadcastState()

	case entities.DevelopmentCardRoadBuilding:
		useCard()
		g.BroadcastDevCardUse(thisDeck.Type, 0, -1)
		g.UseDevRoadBuilding(player, []entities.BuildableType{0, 0})
		g.BroadcastDevCardUse(thisDeck.Type, 500, -1)

	case entities.DevelopmentCardYearOfPlenty:
		useCard()
		g.BroadcastDevCardUse(thisDeck.Type, 0, -1)

		res, err := g.BlockForAction(player, g.TimerVals.UseDevCard, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeSelectCards,
			Message: "Choose type of resources to take",
			Data: entities.PlayerActionSelectCards{
				AllowedTypes: []int{1, 2, 3, 4, 5},
				Quantity:     2,
				NotSelfHand:  true,
			},
		})
		if err != nil {
			return err
		}

		player.SendAction(&entities.PlayerAction{Type: entities.PlayerActionTypeSelectCardsDone})

		var cards []float64
		err = mapstructure.Decode(res, &cards)
		if err != nil || len(cards) != 9 {
			cards = make([]float64, 9)
		}

		resourcesLeft := 2

		for t, q := range cards {
			if q > 0 && int(q) <= resourcesLeft {
				cardType := entities.CardType(t)

				deck := g.Bank.Hand.GetCardDeck(cardType)
				if deck != nil && deck.Quantity >= int16(q) {
					g.MoveCards(-1, int(player.Order), cardType, int(q), true, false)
				}
			}
		}

		for resourcesLeft > 0 {
			// Only for base game - bank only has valid cards
			ct := g.Bank.Hand.ChooseRandomCardType()
			if ct == nil {
				break
			}
			g.MoveCards(-1, int(player.Order), *ct, 1, true, false)
			resourcesLeft--
		}

		g.BroadcastDevCardUse(thisDeck.Type, 500, -1)
		g.SendPlayerSecret(player)
		g.BroadcastState()

	case entities.DevelopmentCardVictoryPoint:
		deck := player.CurrentHand.DevelopmentCardDeckMap[entities.DevelopmentCardVictoryPoint]
		if deck != nil {
			deck.CanUse = false
		}
		return nil
	default:
		return g.UseProgressCard(developmentCardType, player, false)
	}

	return nil
}

func (g *Game) UseDevRoadBuilding(player *entities.Player, types []entities.BuildableType) {
	buildRoad := func() {
		locations := player.GetBuildLocationsRoad(g.Graph, false)
		if player.BuildablesLeft[entities.BTRoad] <= 0 || len(locations) == 0 {
			return
		}

		res, err := g.BlockForAction(player, g.TimerVals.UseDevCard, &entities.PlayerAction{
			Type:    entities.PlayerActionTypeChooseEdge,
			Message: "Choose position for road",
			Data: entities.PlayerActionChooseEdge{
				Allowed: locations,
			},
		})
		if err != nil {
			return
		}

		var bedge entities.EdgeCoordinate
		mapstructure.Decode(res, &bedge)

		// Make sure the player has cards
		// Do not check the bank
		player.CurrentHand.UpdateResources(1, 1, 0, 0, 0)
		g.j.WUpdateResources(player, 1, 1, 0, 0, 0)

		// Prevent animation
		orig := player.UsingDevCard
		player.UsingDevCard = entities.DevelopmentCardRoadBuilding

		err = g.BuildRoad(player, bedge)
		if err != nil {
			// Build at first place possible
			g.BuildRoad(player, locations[0].C)
		}

		// Reset
		player.UsingDevCard = orig
	}

	for range types {
		buildRoad()
	}
}

func (g *Game) UseProgressCard(ct entities.DevelopmentCardType, player *entities.Player, dry bool) error {
	if err := g.EnsureCurrentPlayer(player); err != nil {
		return err
	}

	if ct != entities.ProgressPaperAlchemist && g.DiceState == 0 {
		return errors.New("dice not rolled")
	}

	if err := g.ensureNotSpecialBuildPhase(); err != nil {
		return err
	}

	switch ct {
	case entities.ProgressPaperAlchemist:
		return g.UseProgressPaperAlchemist(player, dry)
	case entities.ProgressPaperCrane:
		return g.UseProgressPaperCrane(player, dry)
	case entities.ProgressPaperEngineer:
		return g.UseProgressPaperEngineer(player, dry)
	case entities.ProgressPaperInventor:
		return g.UseProgressPaperInventor(player, dry)
	case entities.ProgressPaperMedicine:
		return g.UseProgressPaperMedicine(player, dry)
	case entities.ProgressPaperIrrigation:
		return g.UseProgressPaperIrrigation(player, dry)
	case entities.ProgressPaperMining:
		return g.UseProgressPaperMining(player, dry)
	case entities.ProgressPaperRoadBuilding:
		return g.UseProgressPaperRoadBuilding(player, dry)
	case entities.ProgressPaperSmith:
		return g.UseProgressPaperSmith(player, dry)

	case entities.ProgressClothCommercialHarbor:
		return g.UseProgressClothCommercialHarbor(player, dry)
	case entities.ProgressClothMasterMerchant:
		return g.UseProgressClothMasterMerchant(player, dry)
	case entities.ProgressClothMerchant:
		return g.UseProgressClothMerchant(player, dry)
	case entities.ProgressClothMerchantFleet:
		return g.UseProgressClothMerchantFleet(player, dry)
	case entities.ProgressClothResourceMonopoly:
		return g.UseProgressClothResourceMonopoly(player, dry)
	case entities.ProgressClothTradeMonopoly:
		return g.UseProgressClothTradeMonopoly(player, dry)

	case entities.ProgressCoinBishop:
		return g.UseProgressCoinBishop(player, dry)
	case entities.ProgressCoinDeserter:
		return g.UseProgressCoinDeserter(player, dry)
	case entities.ProgressCoinDiplomat:
		return g.UseProgressCoinDiplomat(player, dry)
	case entities.ProgressCoinSaboteur:
		return g.UseProgressCoinSaboteur(player, dry)
	case entities.ProgressCoinWarlord:
		return g.UseProgressCoinWarlord(player, dry)
	case entities.ProgressCoinIntrigue:
		return g.UseProgressCoinIntrigue(player, dry)
	case entities.ProgressCoinSpy:
		return g.UseProgressCoinSpy(player, dry)
	case entities.ProgressCoinWedding:
		return g.UseProgressCoinWedding(player, dry)
	}

	return errors.New("no such action card")
}

func (g *Game) ComputeProgressCardsUsable(p *entities.Player) {
	if g.Mode != entities.CitiesAndKnights {
		return
	}

	// Make cards usable
	for _, deck := range p.CurrentHand.DevelopmentCardDeckMap {
		if deck.Quantity > 0 {
			deck.CanUse = g.UseProgressCard(deck.Type, p, true) == nil
		}
	}
}

// Removes card from player and inserts into bank
func (g *Game) ReinsertDevelopmentCard(p *entities.Player, card entities.DevelopmentCardType, secret bool) {
	deckType := entities.GetDevelopmentCardDeckType(card)

	g.j.WReinsertDevelopmentCard(p, card)
	g.MoveDevelopmentCard(int(p.Order), -1, card, secret)

	deck := p.CurrentHand.GetDevelopmentCardDeck(card)
	if deck == nil {
		return
	}

	deck.Quantity--
	p.UsingDevCard = 0
	g.Bank.DevelopmentCardOrder[deckType] = append(g.Bank.DevelopmentCardOrder[deckType], card)
	g.SendPlayerSecret(p)
	g.BroadcastState()
}

func (g *Game) BroadcastDevCardUse(cardType entities.DevelopmentCardType, time int, destOrder int) {
	g.BroadcastMessage(&entities.Message{
		Type: "du",
		Data: entities.DevCardUseInfo{
			CardType:  cardType,
			Time:      time,
			DestOrder: destOrder,
		},
	})
}
