package entities

type (
	BuildableType   uint16
	VertexBuildable interface {
		GetType() BuildableType
		SetOwner(p *Player)
		GetOwner() *Player
		GetLocation() *Vertex
		SetLocation(*Vertex)
	}
	EdgeBuildable interface {
		GetType() BuildableType
		SetOwner(p *Player)
		GetOwner() *Player
		GetLocation() *Edge
	}

	// Update this with all possible fields
	VertexPlacement struct {
		Owner      *Player       `msgpack:"p"`
		Location   *Vertex       `msgpack:"l"`
		Type       BuildableType `msgpack:"t"`
		Metropolis CardType      `msgpack:"m"`
		Activated  bool          `msgpack:"a"`
		Wall       bool          `msgpack:"w"`
	}
)

const (
	BTSettlement BuildableType = 1
	BTCity       BuildableType = 2
	BTRoad       BuildableType = 3
	BTKnight1    BuildableType = 4
	BTKnight2    BuildableType = 5
	BTKnight3    BuildableType = 6
	BTWall       BuildableType = 7
)
