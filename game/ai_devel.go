package game

import "imperials/entities"

func (ai *AI) ChooseMerchantLocation(p *entities.Player, allowed []*entities.Tile) *entities.Tile {
	maxCardTile := allowed[0]
	maxCards := 0
	for _, tile := range allowed {
		deck := p.CurrentHand.GetCardDeck(entities.CardType(maxCardTile.Type))
		if deck != nil && int(deck.Quantity) > maxCards {
			maxCards = int(deck.Quantity)
			maxCardTile = tile
		}
	}
	return maxCardTile
}

func (ai *AI) ChooseMerchantFleet(p *entities.Player) [9]int {
	res := entities.CardTypeWood
	maxCards := 0
	for _, deck := range p.CurrentHand.CardDeckMap {
		if deck != nil && int(deck.Quantity) > maxCards {
			maxCards = int(deck.Quantity)
			res = deck.Type
		}
	}

	ans := [9]int{0, 0, 0, 0, 0, 0, 0, 0, 0}
	ans[res] = 1
	return ans
}
