package entities

import (
	"math"
)

type Road struct {
	Owner    *Player       `msgpack:"p"`
	Location *Edge         `msgpack:"e"`
	Type     BuildableType `msgpack:"t"`
}

func NewRoad(e *Edge) *Road {
	r := &Road{Location: e}
	r.Type = BTRoad
	return r
}

func (r *Road) GetType() BuildableType {
	return BTRoad
}

func (r *Road) SetOwner(p *Player) {
	r.Owner = p
}

func (r *Road) GetOwner() *Player {
	return r.Owner
}

func (r *Road) GetLocation() *Edge {
	return r.Location
}

func (p *Player) GetBuildLocationsRoad(g *Graph, init bool) []*Edge {
	edges := make(map[*Edge]bool)

	for _, vp := range p.VertexPlacements {
		v := vp.GetLocation()

		hasRoad := func(v *Vertex) bool {
			for _, e := range g.GetAdjacentVertexEdges(v) {
				if e.Placement != nil {
					return true
				}
			}
			return false
		}

		if init && hasRoad(v) {
			continue
		}

		for _, e := range g.GetAdjacentVertexEdges(v) {
			if e.Placement == nil {
				edges[e] = true
			}
		}
	}

	addVertex := func(c *Coordinate) {
		v, _ := g.GetVertex(*c)
		if v != nil && (v.Placement == nil || v.Placement.GetOwner() == p) {
			for _, adjE := range g.GetAdjacentVertexEdges(v) {
				if adjE.Placement == nil {
					edges[adjE] = true
				}
			}
		}
	}

	if !init {
		for _, ep := range p.EdgePlacements {
			e := ep.GetLocation()

			addVertex(&e.C.C1)
			addVertex(&e.C.C2)
		}
	}

	keys := make([]*Edge, 0, len(edges))
	for k := range edges {
		keys = append(keys, k)
	}
	return keys
}

func (r *Road) GetVertices(g *Graph) (v1, v2 *Vertex) {
	e := r.GetLocation()
	v1, err1 := g.GetVertex(e.C.C1)
	v2, err2 := g.GetVertex(e.C.C2)

	if err1 != nil || err2 != nil {
		panic("invalid road")
	}

	return v1, v2
}

func (r *Road) GetAdjacentRoads(g *Graph, v *Vertex) []*Road {
	adjRoads := make(map[*Road]bool)
	v1, v2 := r.GetVertices(g)

	if v1 != v && v2 != v {
		return make([]*Road, 0)
	}

	adjRoadsForVertex := func(v *Vertex) {
		adjEdges := g.GetAdjacentVertexEdges(v)

		for _, adj := range adjEdges {
			if adj.Placement != nil && adj.Placement.GetType() == BTRoad && adj.Placement.GetOwner() == r.GetOwner() && adj.Placement != r {
				adjRoads[adj.Placement.(*Road)] = true
			}
		}
	}

	if v.Placement == nil || v.Placement.GetOwner() == r.GetOwner() {
		adjRoadsForVertex(v)
	}

	keys := make([]*Road, 0, len(adjRoads))
	for k := range adjRoads {
		keys = append(keys, k)
	}
	return keys
}

func (p *Player) GetLongestRoad(g *Graph) int {
	if len(p.EdgePlacements) == 0 {
		return 0
	}

	longest := 0

	var dfs func(r *Road, v *Vertex, start bool, visited map[EdgeBuildable]bool) int
	dfs = func(r *Road, v *Vertex, start bool, visited map[EdgeBuildable]bool) int {
		if !start && visited[r] {
			return 0
		}

		visited[r] = true

		var currentLength int
		if !start {
			currentLength = 1
		} else {
			currentLength = 0
		}
		longestSubPath := 0

		for _, adjRoad := range r.GetAdjacentRoads(g, v) {
			if !visited[adjRoad] {
				v1, v2 := adjRoad.GetVertices(g)
				var adjV *Vertex
				if v1 == v {
					adjV = v2
				} else {
					adjV = v1
				}

				currentLongestSubPath := dfs(adjRoad, adjV, false, visited)
				longestSubPath = int(math.Max(float64(longestSubPath), float64(currentLongestSubPath)))
			}
		}

		currentLength += longestSubPath

		return currentLength
	}

	for _, ep := range p.EdgePlacements {
		visited := make(map[EdgeBuildable]bool)
		v1, v2 := ep.(*Road).GetVertices(g)
		longestPath1 := dfs(ep.(*Road), v1, true, visited)
		longestPath2 := dfs(ep.(*Road), v2, true, visited)

		currentLength := int(math.Max(float64(longestPath1), float64(longestPath2))) + 1
		if currentLength > longest {
			longest = currentLength
		}
	}

	return longest
}
