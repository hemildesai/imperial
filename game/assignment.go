package game

import (
	"imperials/entities"
	"math/rand"
	"reflect"
	"time"
)

func (g *Game) assignTileTypes(types []entities.TileType) {
	rand.Seed(time.Now().UnixNano())
	for i := range types {
		j := rand.Intn(i + 1)
		types[i], types[j] = types[j], types[i]
	}

	i := 0
	for _, t := range g.Tiles {
		if t.Type == entities.TileTypeRandom || t.Type == entities.TileTypeFog {
			if len(types) > i {
				t.Type = types[i]
				i++
			} else {
				t.Type = entities.TileTypeDesert
			}
		}
	}
}

func (g *Game) assignNumbers(allNumbers []uint16) {
	rand.Seed(time.Now().UnixNano())

	redNumbers := make([]uint16, 0)
	whiteNumbers := make([]uint16, 0)
	for _, num := range allNumbers {
		if num == 6 || num == 8 {
			redNumbers = append(redNumbers, num)
		} else {
			whiteNumbers = append(whiteNumbers, num)
		}
	}

	tileCoords := make(map[entities.Coordinate]*entities.Tile)
	allTileCoords := make(map[entities.Coordinate]*entities.Tile)
	for _, t := range g.Tiles {
		if t.Type != entities.TileTypeDesert && t.Type != entities.TileTypeSea {
			tileCoords[t.Center] = t
			allTileCoords[t.Center] = t
		} else {
			if !t.Fog {
				g.Robber.Move(t)
				g.j.WSetRobber(t)
			}
		}
	}

	if g.Robber.Tile == nil {
		for _, t := range g.Tiles {
			if !t.Fog {
				g.Robber.Move(t)
				g.j.WSetRobber(t)
				break
			}
		}
	}

	for _, num := range redNumbers {
		if len(tileCoords) == 0 {
			whiteNumbers = append(whiteNumbers, num)
			continue
		}

		coords := reflect.ValueOf(tileCoords).MapKeys()
		C := coords[rand.Intn(len(tileCoords))].Interface().(entities.Coordinate)
		tileCoords[C].Number = num
		g.j.WSetTileType(tileCoords[C])
		delete(tileCoords, C)
		delete(allTileCoords, C)
		delete(tileCoords, entities.Coordinate{X: C.X + 2, Y: C.Y - 4})
		delete(tileCoords, entities.Coordinate{X: C.X + 4, Y: C.Y})
		delete(tileCoords, entities.Coordinate{X: C.X + 2, Y: C.Y + 4})
		delete(tileCoords, entities.Coordinate{X: C.X - 2, Y: C.Y + 4})
		delete(tileCoords, entities.Coordinate{X: C.X - 4, Y: C.Y})
		delete(tileCoords, entities.Coordinate{X: C.X - 2, Y: C.Y - 4})
	}

	for _, num := range whiteNumbers {
		if len(allTileCoords) == 0 {
			break
		}

		coords := reflect.ValueOf(allTileCoords).MapKeys()
		C := coords[rand.Intn(len(allTileCoords))].Interface().(entities.Coordinate)
		allTileCoords[C].Number = num
		g.j.WSetTileType(allTileCoords[C])
		delete(allTileCoords, C)
	}
}
