package entities

import (
	"math/rand"
	"time"
)

type (
	CardType            uint16
	DevelopmentCardType uint16
	CardDeck            struct {
		Type     CardType `msgpack:"t"`
		Quantity int16    `msgpack:"q"`
	}

	DevelopmentCardDeck struct {
		Type     DevelopmentCardType `msgpack:"t"`
		Quantity int16               `msgpack:"q"`
		CanUse   bool                `msgpack:"u"`
		NumUsed  int16               `msgpack:"k"`
	}

	DevelopmentCardInput struct {
		KnightTile        *Tile
		MonopolyResource  *CardType
		YOPResources      *[2]CardType
		RoadBuildingEdges *[2]*Edge
	}

	CardMoveInfo struct {
		Tile        *Tile    `msgpack:"t"`
		GainerOrder int      `msgpack:"a"`
		GiverOrder  int      `msgpack:"i"`
		CardType    CardType `msgpack:"c"`
		Quantity    int      `msgpack:"q"`
	}

	DevCardUseInfo struct {
		CardType  DevelopmentCardType `msgpack:"c"`
		Time      int                 `msgpack:"t"`
		DestOrder int                 `msgpack:"d"`
	}
)

const (
	CardTypeWood  CardType = 1
	CardTypeBrick CardType = 2
	CardTypeWool  CardType = 3
	CardTypeWheat CardType = 4
	CardTypeOre   CardType = 5
	CardTypePaper CardType = 6
	CardTypeCloth CardType = 7
	CardTypeCoin  CardType = 8

	DevelopmentCardKnight       DevelopmentCardType = 1
	DevelopmentCardVictoryPoint DevelopmentCardType = 2
	DevelopmentCardRoadBuilding DevelopmentCardType = 3
	DevelopmentCardYearOfPlenty DevelopmentCardType = 4
	DevelopmentCardMonopoly     DevelopmentCardType = 5

	ProgressPaperAlchemist    DevelopmentCardType = 6
	ProgressPaperCrane        DevelopmentCardType = 7
	ProgressPaperEngineer     DevelopmentCardType = 8
	ProgressPaperInventor     DevelopmentCardType = 9
	ProgressPaperIrrigation   DevelopmentCardType = 10
	ProgressPaperMedicine     DevelopmentCardType = 11
	ProgressPaperMining       DevelopmentCardType = 12
	ProgressPaperPrinter      DevelopmentCardType = 13
	ProgressPaperRoadBuilding DevelopmentCardType = 14
	ProgressPaperSmith        DevelopmentCardType = 15

	ProgressClothCommercialHarbor DevelopmentCardType = 16
	ProgressClothMasterMerchant   DevelopmentCardType = 17
	ProgressClothMerchant         DevelopmentCardType = 18
	ProgressClothMerchantFleet    DevelopmentCardType = 19
	ProgressClothResourceMonopoly DevelopmentCardType = 20
	ProgressClothTradeMonopoly    DevelopmentCardType = 21

	ProgressCoinBishop       DevelopmentCardType = 22
	ProgressCoinConstitution DevelopmentCardType = 23
	ProgressCoinDeserter     DevelopmentCardType = 24
	ProgressCoinDiplomat     DevelopmentCardType = 25
	ProgressCoinIntrigue     DevelopmentCardType = 26
	ProgressCoinSaboteur     DevelopmentCardType = 27
	ProgressCoinSpy          DevelopmentCardType = 28
	ProgressCoinWarlord      DevelopmentCardType = 29
	ProgressCoinWedding      DevelopmentCardType = 30

	DevUnknown           DevelopmentCardType = 100
	ProgressUnknownPaper DevelopmentCardType = 101
	ProgressUnknownCloth DevelopmentCardType = 102
	ProgressUnknownCoin  DevelopmentCardType = 103
	CardDefender         DevelopmentCardType = 104
	CardLongestRoad      DevelopmentCardType = 105
	CardLargestArmy      DevelopmentCardType = 106

	CardPaper3 DevelopmentCardType = 107
	CardPaper4 DevelopmentCardType = 108
	CardPaper5 DevelopmentCardType = 109
	CardCloth3 DevelopmentCardType = 110
	CardCloth4 DevelopmentCardType = 111
	CardCloth5 DevelopmentCardType = 112
	CardCoin3  DevelopmentCardType = 113
	CardCoin4  DevelopmentCardType = 114
	CardCoin5  DevelopmentCardType = 115
)

func GetInitialDevelopmentCardQuantity(isBank bool) (int16, int16, int16, int16, int16) {
	knightQuantity := int16(0)
	vpQuantity := int16(0)
	roadBuildingQuantity := int16(0)
	yearOfPlentyQuantity := int16(0)
	monopolyQuantity := int16(0)

	if isBank {
		knightQuantity = IQBaseKnight
		vpQuantity = IQBaseVP
		roadBuildingQuantity = IQBaseRoadBuilding
		yearOfPlentyQuantity = IQBaseYearOfPlenty
		monopolyQuantity = IQBaseMonopoly
	}

	return knightQuantity, vpQuantity, roadBuildingQuantity, yearOfPlentyQuantity, monopolyQuantity
}

func GetInitialCardQuantity(g GameMode, t CardType) int16 {
	if t == CardTypeWood ||
		t == CardTypeBrick ||
		t == CardTypeWool ||
		t == CardTypeWheat ||
		t == CardTypeOre {
		return IQBaseResource
	}

	if t == CardTypePaper ||
		t == CardTypeCloth || t == CardTypeCoin {
		return IQCKCommodity
	}

	return 0
}

func GenerateDevelopmentCardOrder() []DevelopmentCardType {
	order := make([]DevelopmentCardType, 0)
	knightQuantity, vpQuantity, roadBuildingQuantity, yearOfPlentyQuantity, monopolyQuantity := GetInitialDevelopmentCardQuantity(true)
	developmentCards := make(map[DevelopmentCardType]int16)
	developmentCards[DevelopmentCardKnight] = knightQuantity
	developmentCards[DevelopmentCardVictoryPoint] = vpQuantity
	developmentCards[DevelopmentCardRoadBuilding] = roadBuildingQuantity
	developmentCards[DevelopmentCardYearOfPlenty] = yearOfPlentyQuantity
	developmentCards[DevelopmentCardMonopoly] = monopolyQuantity

	for dCType, dCQuantity := range developmentCards {
		for i := int16(0); i < dCQuantity; i++ {
			order = append(order, dCType)
		}
	}

	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(order), func(i, j int) {
		order[i], order[j] = order[j], order[i]
	})

	return order
}

func GenerateProgessCardOrder(card CardType) []DevelopmentCardType {
	order := make([]DevelopmentCardType, 0)

	switch card {
	case CardTypePaper:
		order = []DevelopmentCardType{
			ProgressPaperAlchemist,
			ProgressPaperAlchemist,
			ProgressPaperCrane,
			ProgressPaperCrane,
			ProgressPaperEngineer,
			ProgressPaperEngineer,
			ProgressPaperInventor,
			ProgressPaperIrrigation,
			ProgressPaperIrrigation,
			ProgressPaperMedicine,
			ProgressPaperMedicine,
			ProgressPaperMining,
			ProgressPaperMining,
			ProgressPaperPrinter,
			ProgressPaperRoadBuilding,
			ProgressPaperRoadBuilding,
			ProgressPaperSmith,
		}
	case CardTypeCloth:
		order = []DevelopmentCardType{
			ProgressClothCommercialHarbor,
			ProgressClothCommercialHarbor,
			ProgressClothMasterMerchant,
			ProgressClothMasterMerchant,
			ProgressClothMerchant,
			ProgressClothMerchant,
			ProgressClothMerchant,
			ProgressClothMerchant,
			ProgressClothMerchant,
			ProgressClothMerchant,
			ProgressClothMerchantFleet,
			ProgressClothMerchantFleet,
			ProgressClothResourceMonopoly,
			ProgressClothResourceMonopoly,
			ProgressClothResourceMonopoly,
			ProgressClothResourceMonopoly,
			ProgressClothTradeMonopoly,
			ProgressClothTradeMonopoly,
		}
	case CardTypeCoin:
		order = []DevelopmentCardType{
			ProgressCoinBishop,
			ProgressCoinBishop,
			ProgressCoinConstitution,
			ProgressCoinDeserter,
			ProgressCoinDeserter,
			ProgressCoinDiplomat,
			ProgressCoinDiplomat,
			ProgressCoinIntrigue,
			ProgressCoinIntrigue,
			ProgressCoinSaboteur,
			ProgressCoinSaboteur,
			ProgressCoinSpy,
			ProgressCoinSpy,
			ProgressCoinSpy,
			ProgressCoinWarlord,
			ProgressCoinWarlord,
			ProgressCoinWedding,
			ProgressCoinWedding,
		}
	}

	rand.Seed(time.Now().UnixNano())
	rand.Shuffle(len(order), func(i, j int) {
		order[i], order[j] = order[j], order[i]
	})
	return order
}

func GetDevelopmentCardDeckType(card DevelopmentCardType) CardType {
	if card >= ProgressPaperAlchemist && card <= ProgressPaperSmith {
		return CardTypePaper
	} else if card >= ProgressClothCommercialHarbor && card <= ProgressClothTradeMonopoly {
		return CardTypeCloth
	} else if card >= ProgressCoinBishop && card <= ProgressCoinWedding {
		return CardTypeCoin
	} else {
		return 0
	}
}
