package entities

type (
	Bank struct {
		Hand                  *Hand
		DevelopmentCardOrder  map[CardType][]DevelopmentCardType
		DevelopmentCardCursor int
	}
)

func GetNewBank(gameMode GameMode) (*Bank, error) {
	bank := &Bank{DevelopmentCardCursor: 0}

	// Create bank
	hand, err := GetNewHand(gameMode, true)
	if err != nil {
		return nil, err
	}
	bank.Hand = hand

	bank.DevelopmentCardOrder = make(map[CardType][]DevelopmentCardType)

	// Create development card order
	if gameMode == Base {
		bank.DevelopmentCardOrder[0] = GenerateDevelopmentCardOrder()
	} else if gameMode == CitiesAndKnights {
		bank.DevelopmentCardOrder[CardTypePaper] = GenerateProgessCardOrder(CardTypePaper)
		bank.DevelopmentCardOrder[CardTypeCloth] = GenerateProgessCardOrder(CardTypeCloth)
		bank.DevelopmentCardOrder[CardTypeCoin] = GenerateProgessCardOrder(CardTypeCoin)
	}

	return bank, nil
}
