package entities

import (
	"errors"
	"fmt"
	"math/rand"
	"sync/atomic"

	"github.com/vmihailenco/msgpack/v5"
)

type (
	Player struct {
		Id               string            `msgpack:"-"`
		Username         string            `msgpack:"u"`
		Color            string            `msgpack:"c"`
		Order            uint16            `msgpack:"o"`
		RandInt          int               `msgpack:"-"`
		CurrentHand      *Hand             `msgpack:"-"`
		VertexPlacements []VertexBuildable `msgpack:"-"`
		EdgePlacements   []EdgeBuildable   `msgpack:"-"`
		Initialized      bool              `msgpack:"-"`

		PendingAction  *PlayerAction    `msgpack:"-"`
		MessageChannel chan []byte      `msgpack:"-"`
		Expect         chan interface{} `msgpack:"-"`

		BuildablesLeft map[BuildableType]int `msgpack:"-"`

		Improvements         map[int]int         `msgpack:"-"`
		UsingDevCard         DevelopmentCardType `msgpack:"-"`
		ChoosingProgressCard bool                `msgpack:"-"`

		LongestRoad int `msgpack:"-"`

		TimeLeft     int  `msgpack:"-"`
		SpecialBuild bool `msgpack:"-"`

		IsBot           int32 `msgpack:"-"`
		InactiveSeconds int32 `msgpack:"-"`
		IsSpectator     bool  `msgpack:"-"`

		Embargos []bool `msgpack:"-"`
	}

	GameState struct {
		CurrentPlayerOrder uint16         `msgpack:"c"`
		NeedDice           bool           `msgpack:"d"`
		Robber             *Robber        `msgpack:"r"`
		PlayerStates       []*PlayerState `msgpack:"p"`

		BarbarianPosition int       `msgpack:"bp"`
		BarbarianStrength int       `msgpack:"bs"`
		BarbarianKnights  int       `msgpack:"bk"`
		Merchant          *Merchant `msgpack:"tm"`
	}

	PlayerState struct {
		Id                  string      `msgpack:"id"`
		Username            string      `msgpack:"u"`
		Order               uint16      `msgpack:"o"`
		Color               string      `msgpack:"c"`
		RandInt             int         `msgpack:"r"`
		NumCards            int16       `msgpack:"n"`
		NumDevelopmentCards int16       `msgpack:"d"`
		Current             bool        `msgpack:"t"`
		HasPendingAction    bool        `msgpack:"a"`
		VictoryPoints       int         `msgpack:"v"`
		LongestRoad         int         `msgpack:"j"`
		Knights             *int16      `msgpack:"k"`
		TimeLeft            int         `msgpack:"i"`
		Improvements        map[int]int `msgpack:"ci"`
		DiscardLimit        int16       `msgpack:"l"`
		IsBot               bool        `msgpack:"b,omitempty"`

		HasLongestRoad bool `msgpack:"lr,omitempty"`
		HasLargestArmy bool `msgpack:"la,omitempty"`

		DevCardVp *int16 `msgpack:"dv,omitempty"`
	}

	LobbyPlayerState struct {
		Username      string `msgpack:"u"`
		Color         string `msgpack:"c"`
		Order         uint16 `msgpack:"o"`
		Ready         bool   `msgpack:"r"`
		GamesStarted  int32  `msgpack:"s"`
		GamesFinished int32  `msgpack:"f"`
	}

	AllowedActionsMap struct {
		BuildSettlement    bool `msgpack:"s,omitempty"`
		BuildCity          bool `msgpack:"c,omitempty"`
		BuildRoad          bool `msgpack:"r,omitempty"`
		BuyDevelopmentCard bool `msgpack:"d,omitempty"`
		Trade              bool `msgpack:"t,omitempty"`
		EndTurn            bool `msgpack:"e,omitempty"`

		BuildKnight    bool `msgpack:"kb,omitempty"`
		ActivateKnight bool `msgpack:"ka,omitempty"`
		RobberKnight   bool `msgpack:"kr,omitempty"`
		MoveKnight     bool `msgpack:"km,omitempty"`
		BuildWall      bool `msgpack:"w,omitempty"`
		ImprovePaper   bool `msgpack:"ip,omitempty"`
		ImproveCloth   bool `msgpack:"il,omitempty"`
		ImproveCoin    bool `msgpack:"ic,omitempty"`

		SpecialBuild bool `msgpack:"sb,omitempty"`
	}

	PlayerSecretState struct {
		Cards            map[CardType]int      `msgpack:"c"`
		DevelopmentCards []int                 `msgpack:"d"`
		BuildablesLeft   map[BuildableType]int `msgpack:"b"`
		VictoryPoints    int                   `msgpack:"v"`
		AllowedActions   AllowedActionsMap     `msgpack:"a"`
		TradeRatios      []int                 `msgpack:"r"`
	}

	TradeOffer struct {
		Id            int                `msgpack:"i"`
		CreatedBy     uint16             `msgpack:"c"`
		CurrentPlayer uint16             `msgpack:"p"`
		Details       *TradeOfferDetails `msgpack:"d"`
		Acceptances   []int              `msgpack:"a"`
		Destroyed     bool               `msgpack:"y"`
	}

	TradeOfferDetails struct {
		Give [9]int `msgpack:"g"`
		Ask  [9]int `msgpack:"a"`
	}
)

func GetColor(order uint16) string {
	colors := [6]string{"#ff0000", "#00ff00", "#0000ff", "#ffff00", "#fc41ec", "#26eded"}
	if order >= 6 {
		return "#ff0000"
	}
	return colors[order]
}

func NewPlayer(g GameMode, id, username string, order uint16) (*Player, error) {
	player := &Player{Id: id, Username: username, Order: order, Initialized: true}
	player.Color = GetColor(order)

	hand, err := GetNewHand(g, false)
	if err != nil {
		return nil, err
	}
	player.CurrentHand = hand
	player.VertexPlacements = make([]VertexBuildable, 0)
	player.EdgePlacements = make([]EdgeBuildable, 0)

	player.MessageChannel = make(chan []byte, 1024)
	player.Expect = make(chan interface{}, 4)

	player.BuildablesLeft = make(map[BuildableType]int)
	player.BuildablesLeft[BTSettlement] = 5
	player.BuildablesLeft[BTCity] = 4
	player.BuildablesLeft[BTRoad] = 15

	if g == CitiesAndKnights {
		player.BuildablesLeft[BTKnight1] = 2
		player.BuildablesLeft[BTKnight2] = 2
		player.BuildablesLeft[BTKnight3] = 2
		player.BuildablesLeft[BTWall] = 3
	}

	player.Improvements = make(map[int]int)
	player.Improvements[int(CardTypePaper)] = 0
	player.Improvements[int(CardTypeCloth)] = 0
	player.Improvements[int(CardTypeCoin)] = 0

	player.RandInt = rand.Intn(9950) + 25

	return player, nil
}

func GetNewPlayers(g GameMode, numPlayers uint16) ([]*Player, error) {
	players := make([]*Player, numPlayers)

	for i := uint16(0); i < numPlayers; i++ {
		player, err := NewPlayer(g, fmt.Sprintf("Player-%d", i), fmt.Sprintf("Player-%d", i), i)
		if err != nil {
			return nil, err
		}

		for j := uint16(0); j < numPlayers; j++ {
			player.Embargos = append(player.Embargos, false)
		}
		players[i] = player
	}

	return players, nil
}

func (p *Player) BuildAtVertex(v *Vertex, t BuildableType) error {
	if v == nil {
		return errors.New("no vertex given")
	}
	if v.Placement != nil {
		return errors.New("something already built here")
	}

	switch t {
	case BTSettlement:
		v.Placement = NewSettlement(v)
	case BTCity:
		v.Placement = NewCity(v)
	case BTKnight1:
		v.Placement = NewKnight(v, t)
	case BTKnight2:
		v.Placement = NewKnight(v, t)
	case BTKnight3:
		v.Placement = NewKnight(v, t)
	default:
		return errors.New("invalid build type")
	}

	p.VertexPlacements = append(p.VertexPlacements, v.Placement)
	v.Placement.SetOwner(p)

	return nil
}

func (p *Player) BuildAtEdge(e *Edge, t BuildableType) error {
	if e == nil {
		return errors.New("no edge given")
	}
	if e.Placement != nil {
		return errors.New("something already built here")
	}

	switch t {
	case BTRoad:
		e.Placement = NewRoad(e)
	default:
		return errors.New("invalid build type")
	}

	p.EdgePlacements = append(p.EdgePlacements, e.Placement)
	e.Placement.SetOwner(p)

	return nil
}

func (v *Vertex) RemovePlacement() error {
	if v.Placement == nil {
		return errors.New("no placement at this vertex")
	}

	// Remove from player placements
	newPlacements := make([]VertexBuildable, 0)
	for _, p := range v.Placement.GetOwner().VertexPlacements {
		if p != v.Placement {
			newPlacements = append(newPlacements, p)
		}
	}
	v.Placement.GetOwner().VertexPlacements = newPlacements

	v.Placement = nil

	return nil
}

func (e *Edge) RemovePlacement() error {
	if e.Placement == nil {
		return errors.New("no placement at this edge")
	}

	// Remove from player placements
	newPlacements := make([]EdgeBuildable, 0)
	for _, p := range e.Placement.GetOwner().EdgePlacements {
		if p != e.Placement {
			newPlacements = append(newPlacements, p)
		}
	}
	e.Placement.GetOwner().EdgePlacements = newPlacements

	e.Placement = nil

	return nil
}

func (p *Player) CanBuild(t BuildableType) error {
	left, ok := p.BuildablesLeft[t]
	if !ok || left <= 0 {
		return errors.New("not enough pieces left to build")
	}

	if t == BTSettlement {
		if !p.CurrentHand.HasResources(1, 1, 1, 1, 0) {
			return errors.New("not enough resources")
		}
		return nil
	}

	if t == BTCity {
		if !p.CurrentHand.HasResources(0, 0, 0, 2, 3) {
			return errors.New("not enough resources")
		}
		return nil
	}

	if t == BTRoad {
		if !p.CurrentHand.HasResources(1, 1, 0, 0, 0) {
			return errors.New("not enough resources")
		}
		return nil
	}

	if t == BTKnight1 || t == BTKnight2 || t == BTKnight3 {
		if !p.CurrentHand.HasResources(0, 0, 1, 0, 1) {
			return errors.New("not enough resources")
		}
		return nil
	}

	if t == BTWall {
		if !p.CurrentHand.HasResources(0, 2, 0, 0, 0) {
			return errors.New("not enough resources")
		}
		return nil
	}

	return errors.New("unknown type of buildable")
}

func (p *Player) CanBuyDevelopmentCard() bool {
	return p.CurrentHand.HasResources(0, 0, 1, 1, 1)
}

func (p *Player) HasInactiveKnight() bool {
	for _, vp := range p.VertexPlacements {
		if vp.GetType() >= BTKnight1 && vp.GetType() <= BTKnight3 && !vp.(*Knight).Activated {
			return true
		}
	}
	return false
}

func (p *Player) SendAction(action *PlayerAction) {
	p.SendMessage(&Message{Type: "a", Data: action})
}

func (p *Player) ClearPendingAction() {
	p.PendingAction = nil
}

func (p *Player) ClearExpect() {
	// Empty the expect channel
	for p.Initialized && len(p.Expect) > 0 {
		<-p.Expect
	}
}

func (p *Player) SendExpect(val interface{}) {
	p.ClearExpect()
	select {
	case p.Expect <- val:
	default:
	}
}

func (p *Player) SendMessage(msg *Message) {
	msg.Location = WsMsgLocationGame

	if p.Initialized {
		serialized, err := msgpack.Marshal(msg)
		if err != nil {
			return
		}
		p.SendBytes(serialized)
	}
}

func (p *Player) SendBytes(bytes []byte) {
	select {
	case p.MessageChannel <- bytes:
	default:
	}
}

func (p *Player) GetIsBot() bool {
	return atomic.LoadInt32(&p.IsBot) == 1
}

func (p *Player) SetIsBot(val bool) {
	store := int32(0)
	if val {
		store = 1
	}
	atomic.StoreInt32(&p.IsBot, store)
}

func (p *Player) ResetInactivity() {
	atomic.StoreInt32(&p.InactiveSeconds, 0)
	p.SetIsBot(false)
}
