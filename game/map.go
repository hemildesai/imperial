package game

import (
	"errors"
	"imperials/entities"
	"log"
	"math"
	"math/rand"
	"time"
)

const (
	DispXFactor = 1.73205080757 / 1.5 // sqrt(3) / 1.5
)

func generateNewMap(g *Game) error {
	if err := generateMapInner(g, g.Settings.MapDefn); err != nil {
		return err
	}

	g.j.WGenVerticesEdges()
	g.generateVertices()
	g.generateEdges()

	return nil
}

func generateMapInner(g *Game, defn *entities.MapDefinition) error {
	// Check validity of numbers
	for _, num := range defn.Numbers {
		if num < 2 || num > 12 || num == 7 {
			return errors.New("invalid number")
		}
	}

	// Check if number in tiles is valid tile type
	tileCount := 0
	for _, row := range defn.Map {
		for _, tile := range row {
			tileCount++
			tileType := entities.TileType(tile)
			if tileType < entities.TileTypeDesert || (tileType > entities.TileTypeRandom && tileType != entities.TileTypeGold) {
				return errors.New("invalid tile type")
			}
		}
	}

	// Check if at least 5 tiles
	if tileCount < 5 {
		return errors.New("not enough tiles")
	}

	// Check validity of random tiles
	for _, tile := range defn.RandomTiles {
		tileType := entities.TileType(tile)
		if tileType < entities.TileTypeDesert || (tileType > entities.TileTypeOre && tileType != entities.TileTypeGold) {
			return errors.New("invalid tile type")
		}
	}

	// check if port is valid port type
	for _, port := range defn.Ports {
		if port < entities.PortTypeWood || port > entities.PortTypeAny {
			return errors.New("invalid port type")
		}
	}

	startX, startY, odd := 2, 3, true
	dispStartX := 3.0

	for i := 0; i < len(defn.Map); i++ {
		odd = defn.Order[i]
		x, y := startX, startY
		dispX := dispStartX

		for j := 0; j < len(defn.Map[i]); j++ {
			center := entities.Coordinate{X: x, Y: y}

			if defn.Map[i][j] != int(entities.TileTypeNone) {
				g.addTile(center, dispX)
				g.Tiles[center].Type = entities.TileType(defn.Map[i][j])
				if g.Tiles[center].Type == entities.TileTypeFog {
					g.Tiles[center].Fog = true
				}
				g.j.WCreateTile(g.Tiles[center], dispX)
			}

			x += 4
			dispX += 4 * DispXFactor
		}

		factor := 2
		if odd {
			factor = -2
		}

		startX += factor
		dispStartX += float64(factor) * DispXFactor
		startY += 4
	}

	g.assignTileTypes(defn.RandomTiles)
	g.assignNumbers(defn.Numbers)

	return nil
}

func (g *Game) addTile(center entities.Coordinate, dispX float64) {
	tile := &entities.Tile{Center: center, Type: 0, Number: 0}
	g.Tiles[center] = tile
	g.DispCoordMap[center] = entities.FloatCoordinate{X: dispX, Y: float64(center.Y)}
}

func (g *Game) generateVertices() {
	for _, tile := range g.Tiles {
		theta := math.Pi / 2

		for _, c := range tile.GetVertexCoordinates() {
			vertex := g.addVertex(c)
			vertex.AdjacentTiles = append(vertex.AdjacentTiles, tile)

			if _, ok := g.DispCoordMap[c]; !ok {
				fc := g.DispCoordMap[tile.Center]
				g.DispCoordMap[c] = entities.FloatCoordinate{
					X: fc.X + (8.0/3.0)*math.Cos(theta),
					Y: fc.Y - (8.0/3.0)*math.Sin(theta),
				}
			}

			theta -= math.Pi / 3
		}
	}
}

func (g *Game) addVertex(c entities.Coordinate) *entities.Vertex {
	vertex, err := g.Graph.GetVertex(c)
	if err != nil {
		vertex = &entities.Vertex{
			C:             c,
			AdjacentTiles: make([]*entities.Tile, 0),
		}
		g.Vertices[c] = vertex
	}
	return vertex
}

func (g *Game) generateEdges() {
	for _, tile := range g.Tiles {
		for i, c := range tile.GetEdgeCoordinates() {
			edge := g.addEdge(c)
			edge.Orientation = uint16(i)
			edge.AdjacentTiles = append(edge.AdjacentTiles, tile)
		}
	}

	// TODO: tile may also be sea hex
	for _, e := range g.Edges {
		e.IsBeach = (len(e.AdjacentTiles) == 1)
	}
}

func (g *Game) addEdge(ec entities.EdgeCoordinate) *entities.Edge {
	edge, err := g.Graph.GetEdge(ec)
	if err != nil {
		edge = &entities.Edge{
			C:             ec,
			AdjacentTiles: make([]*entities.Tile, 0),
		}
		g.Edges[ec] = edge
	}
	return edge
}

func (g *Game) generatePorts() {
	types := g.Settings.MapDefn.Ports
	initialBeachEdges := g.Graph.GetBeachEdges()
	beachEdges := make([]*entities.Edge, 0)

	if len(g.Settings.MapDefn.PortCoordinates) > 0 {
		for _, c := range g.Settings.MapDefn.PortCoordinates {
			if e, err := g.Graph.GetEdge(c); err == nil && e.IsBeach {
				beachEdges = append(beachEdges, e)
			}
		}
	} else {
		for _, e := range initialBeachEdges {
			allowed := true
			for _, t := range e.AdjacentTiles {
				if t.Fog {
					allowed = false
					break
				}
			}

			if allowed {
				beachEdges = append(beachEdges, e)
			}
		}
	}

	rand.Seed(time.Now().UnixNano())

	for _, portType := range types {
		if len(beachEdges) == 0 {
			break
		}

		edge := beachEdges[rand.Intn(len(beachEdges))]

		vertex1, err1 := g.Graph.GetVertex(edge.C.C1)
		vertex2, err2 := g.Graph.GetVertex(edge.C.C2)

		if err1 != nil || err2 != nil {
			log.Println("error getting vertex while creating port:", err1, err2)
			continue
		}
		ratio := 2
		if portType == entities.PortTypeAny {
			ratio = 3
		}

		port := &entities.Port{
			Type:     portType,
			Vertices: []*entities.Vertex{vertex1, vertex2},
			Edge:     edge,
			Ratio:    int16(ratio),
		}
		g.Ports = append(g.Ports, port)

		newEdges := make([]*entities.Edge, 0)
		for _, e := range beachEdges {
			if e.C.C1 != edge.C.C1 && e.C.C2 != edge.C.C1 && e.C.C1 != edge.C.C2 && e.C.C2 != edge.C.C2 {
				newEdges = append(newEdges, e)
			}
		}
		beachEdges = newEdges
	}

	g.j.WSetPorts()
}
