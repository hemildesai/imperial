package entities

type (
	PortType uint16

	Port struct {
		Type     PortType  `msgpack:"t"`
		Vertices []*Vertex `msgpack:"v"`
		Edge     *Edge     `msgpack:"e"`
		Ratio    int16     `msgpack:"r"`
	}
)

const (
	PortTypeAny   PortType = 6
	PortTypeWood  PortType = 1
	PortTypeBrick PortType = 2
	PortTypeWool  PortType = 3
	PortTypeWheat PortType = 4
	PortTypeOre   PortType = 5
)

func GetPorts(mode GameMode) []PortType {
	types := []PortType{
		PortTypeAny,
		PortTypeAny,
		PortTypeAny,
		PortTypeAny,
		PortTypeBrick,
		PortTypeWood,
		PortTypeWool,
		PortTypeWheat,
		PortTypeOre,
	}
	return types
}
