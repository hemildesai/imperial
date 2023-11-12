package entities

const (
	PlayerActionTypeSelectCards       = "sc"
	PlayerActionTypeSelectCardsDone   = "sc*"
	PlayerActionTypeChooseTile        = "ct"
	PlayerActionTypeChoosePlayer      = "cp"
	PlayerActionTypeChooseVertex      = "cv"
	PlayerActionTypeChooseEdge        = "ce"
	PlayerActionTypeChooseDice        = "cd"
	PlayerActionTypeChooseImprovement = "ci"

	MessageTypeTileFog            = "tf"
	MessageTypePlayerSecretState  = "ss"
	MessageTypeGameState          = "gs"
	MessageTypeVertexPlacement    = "vp"
	MessageTypeVertexPlacementRem = "vpr"
	MessageTypeEdgePlacement      = "ep"
	MessageTypeEdgePlacementRem   = "epr"
	MessageTypeCardMove           = "cm"
	MessageTypeTradeOffer         = "to"
	MessageTypeTradeCloseOffers   = "tco"
	MessageTypeGameOver           = "gameover"
	MessageTypeChat               = "cht"
	MessageTypeSpectatorList      = "spec"
	MessageTypeError              = "err"
	MessageTypeEndsess            = "endsess"

	WsMsgLocationLobby = "l"
	WsMsgLocationGame  = "g"
	WsMsgLocationChat  = "c"
)

type Message struct {
	Type     string      `msgpack:"t"`
	Data     interface{} `msgpack:"data"`
	Location string      `msgpack:"l"`
}

type PlayerAction struct {
	Type      string      `msgpack:"t"`
	Data      interface{} `msgpack:"d"`
	CanCancel bool        `msgpack:"c"`
	Message   string      `msgpack:"m"`
}

type PlayerActionChooseTile struct {
	Allowed []*Tile `msgpack:"a"`
}

type PlayerActionSelectCards struct {
	AllowedTypes []int `msgpack:"a"`
	Quantity     int   `msgpack:"q"`
	NotSelfHand  bool  `msgpack:"n"`
	Getting      []int `msgpack:"g"`
	Hand         []int `msgpack:"h"`
	IsDevHand    bool  `msgpack:"d"`
}

type PlayerActionChoosePlayer struct {
	Choices []bool `msgpack:"c"`
}

type PlayerActionChooseVertex struct {
	Allowed []*Vertex `msgpack:"v"`
}

type PlayerActionChooseEdge struct {
	Allowed []*Edge `msgpack:"e"`
}
