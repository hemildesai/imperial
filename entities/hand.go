package entities

import (
	"errors"
	"math/rand"
)

type (
	Hand struct {
		CardDeckMap            map[CardType]*CardDeck                       `msgpack:"c"`
		DevelopmentCardDeckMap map[DevelopmentCardType]*DevelopmentCardDeck `msgpack:"d"`
	}
)

func (h *Hand) addCardDeck(cardDeck *CardDeck) {
	h.CardDeckMap[cardDeck.Type] = cardDeck
}

func (h *Hand) GetCardDeck(cardType CardType) *CardDeck {
	return h.CardDeckMap[cardType]
}

func (h *Hand) GetCardDeckMap() map[CardType]*CardDeck {
	return h.CardDeckMap
}

func (h *Hand) UpdateCards(cardType CardType, quantity int) {
	deck := h.CardDeckMap[cardType]
	if deck == nil {
		return
	}
	deck.Quantity += int16(quantity)
}

func (h *Hand) GetDevelopmentCardDeck(developmentCardType DevelopmentCardType) *DevelopmentCardDeck {
	return h.DevelopmentCardDeckMap[developmentCardType]
}

func (h *Hand) UpdateResources(wood int, brick int, wool int, wheat int, ore int) {
	h.UpdateCards(CardTypeWood, wood)
	h.UpdateCards(CardTypeBrick, brick)
	h.UpdateCards(CardTypeWool, wool)
	h.UpdateCards(CardTypeWheat, wheat)
	h.UpdateCards(CardTypeOre, ore)
}

func (h *Hand) HasResources(wood int, brick int, wool int, wheat int, ore int) bool {
	return h.GetCardDeck(CardTypeWood).Quantity >= int16(wood) &&
		h.GetCardDeck(CardTypeBrick).Quantity >= int16(brick) &&
		h.GetCardDeck(CardTypeWool).Quantity >= int16(wool) &&
		h.GetCardDeck(CardTypeWheat).Quantity >= int16(wheat) &&
		h.GetCardDeck(CardTypeOre).Quantity >= int16(ore)
}

func (h *Hand) EnsureHasResources(wood int, brick int, wool int, wheat int, ore int) error {
	if !h.HasResources(wood, brick, wool, wheat, ore) {
		return errors.New("not enough resources")
	}
	return nil
}

func (h *Hand) addDevelopmentCardDeck(developmentCardDeck DevelopmentCardDeck) {
	h.DevelopmentCardDeckMap[developmentCardDeck.Type] = &developmentCardDeck
}

func (h *Hand) GetCardCount() int16 {
	count := int16(0)
	for _, cardDeck := range h.CardDeckMap {
		count += cardDeck.Quantity
	}
	return count
}

func (h *Hand) ChooseRandomCardType() *CardType {
	cardCount := h.GetCardCount()
	if cardCount <= 0 {
		return nil
	}

	randomIndex := rand.Intn(int(cardCount))
	for _, deck := range h.GetCardDeckMap() {
		randomIndex -= int(deck.Quantity)
		if randomIndex < 0 {
			return &deck.Type
		}
	}
	return nil
}

func (h *Hand) GetDevelopmentCardCount() int16 {
	count := int16(0)
	for _, developmentCardDeck := range h.DevelopmentCardDeckMap {
		count += developmentCardDeck.Quantity
	}
	return count
}

func (h *Hand) ChooseRandomDevCardType() *DevelopmentCardType {
	cardCount := h.GetDevelopmentCardCount()
	if cardCount <= 0 {
		return nil
	}

	randomIndex := rand.Intn(int(cardCount))
	for _, deck := range h.DevelopmentCardDeckMap {
		randomIndex -= int(deck.Quantity)
		if randomIndex < 0 {
			return &deck.Type
		}
	}
	return nil
}

func newHand() *Hand {
	hand := &Hand{}
	hand.CardDeckMap = make(map[CardType]*CardDeck)
	hand.DevelopmentCardDeckMap = make(map[DevelopmentCardType]*DevelopmentCardDeck)

	return hand
}

func GetNewHand(g GameMode, isBank bool) (*Hand, error) {
	hand := newHand()

	addCard := func(hand *Hand, c CardType) {
		quantity := int16(0)
		if isBank {
			quantity = GetInitialCardQuantity(g, c)
		}
		hand.addCardDeck(&CardDeck{Type: c, Quantity: quantity})
	}

	addCard(hand, CardTypeWood)
	addCard(hand, CardTypeBrick)
	addCard(hand, CardTypeWool)
	addCard(hand, CardTypeWheat)
	addCard(hand, CardTypeOre)

	switch g {
	case Base:
		knightQuantity, vpQuantity, roadBuildingQuantity, yearOfPlentyQuantity, monopolyQuantity := GetInitialDevelopmentCardQuantity(isBank)
		hand.addDevelopmentCardDeck(DevelopmentCardDeck{Type: DevelopmentCardKnight, Quantity: knightQuantity})
		hand.addDevelopmentCardDeck(DevelopmentCardDeck{Type: DevelopmentCardVictoryPoint, Quantity: vpQuantity})
		hand.addDevelopmentCardDeck(DevelopmentCardDeck{Type: DevelopmentCardRoadBuilding, Quantity: roadBuildingQuantity})
		hand.addDevelopmentCardDeck(DevelopmentCardDeck{Type: DevelopmentCardYearOfPlenty, Quantity: yearOfPlentyQuantity})
		hand.addDevelopmentCardDeck(DevelopmentCardDeck{Type: DevelopmentCardMonopoly, Quantity: monopolyQuantity})
	case CitiesAndKnights:
		addCard(hand, CardTypePaper)
		addCard(hand, CardTypeCloth)
		addCard(hand, CardTypeCoin)

		cards := GenerateProgessCardOrder(CardTypePaper)
		cards = append(cards, GenerateProgessCardOrder(CardTypeCloth)...)
		cards = append(cards, GenerateProgessCardOrder(CardTypeCoin)...)
		for _, ct := range cards {
			if hand.GetDevelopmentCardDeck(ct) == nil {
				hand.addDevelopmentCardDeck(DevelopmentCardDeck{Type: ct, Quantity: 0})
			}
		}
	default:
		return nil, errors.New("invalid game mode")
	}

	return hand, nil
}
