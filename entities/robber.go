package entities

type (
	Robber struct {
		Tile *Tile `msgpack:"t"`
	}
)

func (r *Robber) Move(tile *Tile) {
	r.Tile = tile
}

type (
	Merchant struct {
		Tile  *Tile   `msgpack:"t"`
		Owner *Player `msgpack:"p"`
	}
)

func (r *Merchant) Move(owner *Player, tile *Tile) {
	r.Owner = owner
	r.Tile = tile
}
