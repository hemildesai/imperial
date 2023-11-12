package entities

type Knight struct {
	Owner     *Player       `msgpack:"p"`
	Location  *Vertex       `msgpack:"l"`
	Type      BuildableType `msgpack:"t"`
	Activated bool          `msgpack:"a"`
	CanUse    bool          `msgpack:"-"`
}

func NewKnight(v *Vertex, t BuildableType) *Knight {
	k := &Knight{Location: v}
	k.Type = t
	return k
}

func (k *Knight) GetType() BuildableType {
	return k.Type
}

func (k *Knight) SetOwner(p *Player) {
	k.Owner = p
}

func (k *Knight) GetOwner() *Player {
	return k.Owner
}

func (k *Knight) GetLocation() *Vertex {
	return k.Location
}

func (k *Knight) SetLocation(v *Vertex) {
	k.Location = v
}

func (p *Player) GetBuildLocationsKnight(g *Graph, allowUpgrade bool) []*Vertex {
	vertices := make(map[*Vertex]bool)

	checkVertex := func(c *Coordinate) {
		v, _ := g.GetVertex(*c)
		if v != nil {
			if v.Placement == nil {
				if p.BuildablesLeft[BTKnight1] > 0 {
					vertices[v] = true
				}
			} else if allowUpgrade && v.Placement.GetOwner() == p {
				if v.Placement.GetType() == BTKnight1 && p.BuildablesLeft[BTKnight2] > 0 {
					vertices[v] = true
				}

				if v.Placement.GetType() == BTKnight2 && p.BuildablesLeft[BTKnight3] > 0 {
					if p.Improvements[int(CardTypeCoin)] >= 3 {
						vertices[v] = true
					}
				}
			}
		}
	}

	for _, ep := range p.EdgePlacements {
		e := ep.GetLocation()

		checkVertex(&e.C.C1)
		checkVertex(&e.C.C2)
	}

	keys := make([]*Vertex, 0, len(vertices))
	for k := range vertices {
		keys = append(keys, k)
	}
	return keys
}

func (p *Player) GetActivateLocationsKnight(g *Graph) []*Vertex {
	vertices := make([]*Vertex, 0)
	for _, vp := range p.VertexPlacements {
		if vp.GetType() >= BTKnight1 && vp.GetType() <= BTKnight3 && !vp.(*Knight).Activated {
			vertices = append(vertices, vp.GetLocation())
		}
	}
	return vertices
}

func (p *Player) GetActivatedKnightStrength() int {
	count := 0
	for _, vp := range p.VertexPlacements {
		if vp.GetType() >= BTKnight1 && vp.GetType() <= BTKnight3 && vp.(*Knight).Activated {
			count += int(vp.GetType()) - int(BTKnight1) + 1
		}
	}
	return count
}

func (p *Player) KnightDFS(g *Graph, from *Vertex, curr map[*Vertex]bool) map[*Vertex]bool {
	if curr == nil {
		curr = make(map[*Vertex]bool)
		curr[from] = true
	} else {
		if curr[from] {
			return curr
		}

		if from.Placement == nil || from.Placement.GetOwner() == p {
			curr[from] = true
		} else {
			if from.Placement.GetType() == BTKnight1 || from.Placement.GetType() == BTKnight2 {
				curr[from] = true
			}
			return curr
		}
	}

	adjs := g.GetAdjacentVertices(from)
	for _, adj := range adjs {
		e, _ := g.GetEdge(EdgeCoordinate{C1: adj.C, C2: from.C})
		if e != nil && e.Placement != nil && e.Placement.GetOwner() == p {
			p.KnightDFS(g, adj, curr)
		}
	}

	return curr
}
