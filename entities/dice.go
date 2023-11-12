package entities

type (
	DieRollState struct {
		RedRoll          int            `msgpack:"r"`
		WhiteRoll        int            `msgpack:"w"`
		EventRoll        int            `msgpack:"e"`
		PlayerHandDeltas []*Hand        `msgpack:"-"`
		GainInfo         []CardMoveInfo `msgpack:"g"`
		IsInit           bool           `msgpack:"ii,omitempty"`
	}

	DiceStats struct {
		Rolls      [12]int `msgpack:"r"`
		EventRolls [6]int  `msgpack:"e"`
	}
)

type GameOverMessage struct {
	Players []*PlayerState `msgpack:"p"`
	Winner  uint16         `msgpack:"w"`
}
