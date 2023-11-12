package entities

type (
	ExtraVictoryPoints struct {
		LongestRoadHolder *Player
		LargestArmyHolder *Player
		LargestArmyCount  int16

		AvailableDefenderPoints int
		DefenderPoints          []*Player
		Metropolis              map[CardType]*Player
		PrinterHolder           *Player
		ConstitutionHolder      *Player
	}
)
