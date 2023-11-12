package entities

import (
	"errors"
)

const (
	TileTypeWood   TileType = 1
	TileTypeBrick  TileType = 2
	TileTypeWool   TileType = 3
	TileTypeWheat  TileType = 4
	TileTypeOre    TileType = 5
	TileTypeDesert TileType = 0

	TileTypeFog    TileType = 6
	TileTypeSea    TileType = 7
	TileTypeNone   TileType = 8
	TileTypeRandom TileType = 9
	TileTypeGold   TileType = 21
)

type (
	TileType   uint16
	Coordinate struct {
		X int `msgpack:"x"`
		Y int `msgpack:"y"`
	}

	FloatCoordinate struct {
		X float64 `msgpack:"x"`
		Y float64 `msgpack:"y"`
	}

	EdgeCoordinate struct {
		C1 Coordinate `msgpack:"c1"`
		C2 Coordinate `msgpack:"c2"`
	}

	Vertex struct {
		C             Coordinate      `msgpack:"c"`
		Placement     VertexBuildable `msgpack:"-"`
		AdjacentTiles []*Tile         `msgpack:"-"`
	}

	Edge struct {
		C             EdgeCoordinate `msgpack:"c"`
		Placement     EdgeBuildable  `msgpack:"-"`
		AdjacentTiles []*Tile        `msgpack:"-"`
		IsBeach       bool           `msgpack:"b"`
		Orientation   uint16         `msgpack:"o"`
	}

	Tile struct {
		Center Coordinate `msgpack:"c"`
		Type   TileType   `msgpack:"t"`
		Number uint16     `msgpack:"n"`
		Fog    bool       `msgpack:"f"`
	}

	Graph struct {
		Vertices map[Coordinate]*Vertex
		Edges    map[EdgeCoordinate]*Edge
		Tiles    map[Coordinate]*Tile
	}

	MapDefinition struct {
		Name            string           `json:"name"`
		Numbers         []uint16         `json:"numbers"`
		Order           []bool           `json:"order"`
		Ports           []PortType       `json:"ports"`
		PortCoordinates []EdgeCoordinate `json:"port_coordinates"`
		Map             [][]int          `json:"map"`
		RandomTiles     []TileType       `json:"tiles"`
	}
)

func (tile *Tile) GetVertexCoordinates() []Coordinate {
	c := tile.Center
	coords := make([]Coordinate, 6)

	coords[0] = Coordinate{X: c.X, Y: c.Y - 3}
	coords[1] = Coordinate{X: c.X + 2, Y: c.Y - 1}
	coords[2] = Coordinate{X: c.X + 2, Y: c.Y + 1}
	coords[3] = Coordinate{X: c.X, Y: c.Y + 3}
	coords[4] = Coordinate{X: c.X - 2, Y: c.Y + 1}
	coords[5] = Coordinate{X: c.X - 2, Y: c.Y - 1}

	return coords
}

func (tile *Tile) GetEdgeCoordinates() []EdgeCoordinate {
	coords := make([]EdgeCoordinate, 6)

	vertices := tile.GetVertexCoordinates()

	coords[0] = EdgeCoordinate{C1: vertices[0], C2: vertices[1]}
	coords[1] = EdgeCoordinate{C1: vertices[1], C2: vertices[2]}
	coords[2] = EdgeCoordinate{C1: vertices[2], C2: vertices[3]}
	coords[3] = EdgeCoordinate{C1: vertices[3], C2: vertices[4]}
	coords[4] = EdgeCoordinate{C1: vertices[4], C2: vertices[5]}
	coords[5] = EdgeCoordinate{C1: vertices[5], C2: vertices[0]}

	return coords
}

func (g *Graph) GetTilePlacements(tile *Tile) []VertexBuildable {
	placements := make([]VertexBuildable, 0)

	for _, vc := range tile.GetVertexCoordinates() {
		if v, ok := g.Vertices[vc]; ok {
			if v.Placement != nil {
				placements = append(placements, v.Placement)
			}
		}
	}

	return placements
}

func (g *Graph) GetVertex(c Coordinate) (*Vertex, error) {
	v, ok := g.Vertices[c]
	if ok {
		return v, nil
	} else {
		return nil, errors.New("no such vertex")
	}
}

func (g *Graph) GetEdge(ec EdgeCoordinate) (*Edge, error) {
	e, ok := g.Edges[ec]
	if ok {
		return e, nil
	}

	ecflip := EdgeCoordinate{C1: ec.C2, C2: ec.C1}
	e, ok = g.Edges[ecflip]
	if ok {
		return e, nil
	}

	return nil, errors.New("no such edge")
}

func (g *Graph) GetAdjacentVertices(v *Vertex) []*Vertex {
	c := v.C
	vertices := make([]*Vertex, 0)

	if adj, _ := g.GetVertex(Coordinate{X: c.X, Y: c.Y - 2}); adj != nil {
		vertices = append(vertices, adj)
	}

	if adj, _ := g.GetVertex(Coordinate{X: c.X + 2, Y: c.Y - 2}); adj != nil {
		vertices = append(vertices, adj)
	}

	if adj, _ := g.GetVertex(Coordinate{X: c.X + 2, Y: c.Y + 2}); adj != nil {
		vertices = append(vertices, adj)
	}

	if adj, _ := g.GetVertex(Coordinate{X: c.X, Y: c.Y + 2}); adj != nil {
		vertices = append(vertices, adj)
	}

	if adj, _ := g.GetVertex(Coordinate{X: c.X - 2, Y: c.Y + 2}); adj != nil {
		vertices = append(vertices, adj)
	}

	if adj, _ := g.GetVertex(Coordinate{X: c.X - 2, Y: c.Y - 2}); adj != nil {
		vertices = append(vertices, adj)
	}

	return vertices
}

func (g *Graph) GetAdjacentVertexEdges(v *Vertex) []*Edge {
	vertices := g.GetAdjacentVertices(v)
	edges := make([]*Edge, 0)

	for _, adj := range vertices {
		e, _ := g.GetEdge(EdgeCoordinate{C1: v.C, C2: adj.C})
		if e != nil {
			edges = append(edges, e)
		}
	}

	return edges
}

func (g *Graph) GetAdjacentEdges(e *Edge) []*Edge {
	v1, err1 := g.GetVertex(e.C.C1)
	v2, err2 := g.GetVertex(e.C.C2)

	if err1 != nil || err2 != nil {
		return []*Edge{}
	}

	edges1 := g.GetAdjacentVertexEdges(v1)
	edges2 := g.GetAdjacentVertexEdges(v2)

	edges1 = append(edges1, edges2...)
	edges := make([]*Edge, 0)

	for _, adj := range edges1 {
		if adj != e {
			edges = append(edges, adj)
		}
	}

	return edges
}

func (g *Graph) GetBeachEdges() []*Edge {
	edges := make([]*Edge, 0)

	for _, e := range g.Edges {
		if e.IsBeach {
			edges = append(edges, e)
		}
	}

	return edges
}
