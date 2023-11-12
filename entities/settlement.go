package entities

type Settlement struct {
	Owner    *Player       `msgpack:"p"`
	Location *Vertex       `msgpack:"l"`
	Type     BuildableType `msgpack:"t"`
}

func NewSettlement(v *Vertex) *Settlement {
	s := &Settlement{Location: v}
	s.Type = BTSettlement
	return s
}

func (s *Settlement) GetType() BuildableType {
	return BTSettlement
}

func (s *Settlement) SetOwner(p *Player) {
	s.Owner = p
}

func (s *Settlement) GetOwner() *Player {
	return s.Owner
}

func (s *Settlement) GetLocation() *Vertex {
	return s.Location
}

func (s *Settlement) SetLocation(v *Vertex) {
	s.Location = v
}

func (p *Player) GetBuildLocationsSettlement(g *Graph, init bool, allowFog bool) []*Vertex {
	vertices := make(map[*Vertex]bool)

	hasEmptyAdjacentVertices := func(v *Vertex) bool {
		for _, adj := range g.GetAdjacentVertices(v) {
			if adj.Placement != nil && (adj.Placement.GetType() == BTSettlement || adj.Placement.GetType() == BTCity) {
				return false
			}
		}

		return true
	}

	hasAdjacentFogTile := func(v *Vertex) bool {
		for _, tile := range v.AdjacentTiles {
			if tile.Fog {
				return true
			}
		}

		return false
	}

	if init {
		for _, v := range g.Vertices {
			if v.Placement != nil {
				continue
			}

			if !allowFog && hasAdjacentFogTile(v) {
				continue
			}

			if !hasEmptyAdjacentVertices(v) {
				continue
			}

			vertices[v] = true
		}
	} else {
		checkVertex := func(c *Coordinate) {
			v, _ := g.GetVertex(*c)
			if v != nil && v.Placement == nil && hasEmptyAdjacentVertices(v) && !hasAdjacentFogTile(v) {
				vertices[v] = true
			}
		}

		for _, ep := range p.EdgePlacements {
			e := ep.GetLocation()

			checkVertex(&e.C.C1)
			checkVertex(&e.C.C2)
		}
	}

	keys := make([]*Vertex, 0, len(vertices))
	for k := range vertices {
		keys = append(keys, k)
	}
	return keys
}
