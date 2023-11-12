package entities

type GameMode uint16

const (
	Base               GameMode = 1
	CitiesAndKnights   GameMode = 2
	IQBaseResource     int16    = 24
	IQBaseKnight       int16    = 14
	IQBaseVP           int16    = 5
	IQBaseRoadBuilding int16    = 2
	IQBaseYearOfPlenty int16    = 2
	IQBaseMonopoly     int16    = 2

	IQCKCommodity int16 = 12

	SlowSpeed   string = "slow"
	NormalSpeed string = "normal"
	FastSpeed   string = "fast"
)

type GameSettings struct {
	Mode          GameMode
	Private       bool
	MapName       string
	DiscardLimit  int16
	VictoryPoints int
	SpecialBuild  bool
	MaxPlayers    int
	EnableKarma   bool
	Speed         string
	Advanced      bool
	MapDefn       *MapDefinition `json:"-" msgpack:"-"`
}

type AdvancedSettings struct {
	RerollOn7 bool
}

var SpeedMultiplier = map[string]float32{
	SlowSpeed:   2,
	NormalSpeed: 1,
	FastSpeed:   0.5,
}
