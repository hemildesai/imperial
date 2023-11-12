package entities

type City struct {
	Owner      *Player       `msgpack:"p"`
	Location   *Vertex       `msgpack:"l"`
	Type       BuildableType `msgpack:"t"`
	Metropolis CardType      `msgpack:"m"`
	Wall       bool          `msgpack:"w"`
}

func (c *City) GetType() BuildableType {
	return BTCity
}

func (c *City) SetOwner(p *Player) {
	c.Owner = p
}

func (s *City) GetOwner() *Player {
	return s.Owner
}

func (s *City) GetLocation() *Vertex {
	return s.Location
}

func (s *City) SetLocation(v *Vertex) {
	s.Location = v
}

func NewCity(v *Vertex) *City {
	c := &City{Location: v}
	c.Type = BTCity
	c.Metropolis = 0
	return c
}

func (p *Player) GetBuildLocationsCity(g *Graph) []*Vertex {
	vertices := make([]*Vertex, 0)

	for _, s := range p.VertexPlacements {
		if s.GetType() == BTSettlement {
			vertices = append(vertices, s.(*Settlement).Location)
		}
	}

	return vertices
}

func (p *Player) GetBuildLocationsWall(g *Graph) []*Vertex {
	vertices := make([]*Vertex, 0)

	for _, vp := range p.VertexPlacements {
		if vp.GetType() == BTCity && vp.(*City).Wall == false {
			vertices = append(vertices, vp.GetLocation())
		}
	}

	return vertices
}
