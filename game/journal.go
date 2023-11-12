package game

import (
	"imperials/entities"
	"log"
	"sort"

	"github.com/mitchellh/mapstructure"
	"github.com/vmihailenco/msgpack/v5"
)

type (
	JournalEntry struct {
		Type   int           `msgpack:"t"`
		Fields []interface{} `msgpack:"f"`
		Index  int           `msgpack:"i"`
	}

	Journal struct {
		playing bool
		g       *Game
		pending chan []byte
		index   int
	}

	PortEntry struct {
		Type  entities.PortType
		C     entities.EdgeCoordinate
		Ratio int16
	}
)

func (j *Journal) Init() {
	j.pending = make(chan []byte, 1024)
}

func (j *Journal) Flush() {
	if len(j.pending) == 0 {
		return
	}

	arr := make([][]byte, 0)

	for len(j.pending) > 0 {
		arr = append(arr, <-j.pending)
	}

	err := j.g.Store.WriteJournalEntries(j.g.ID, arr)
	if err != nil {
		log.Println(err)
		return
	}
}

func (j *Journal) Write(v JournalEntry) {
	if j.playing || !j.g.Initialized {
		return
	}

	j.index++
	v.Index = j.index

	b, err := msgpack.Marshal(v)
	if err != nil {
		log.Println(err)
		return
	}

	select {
	case j.pending <- b:
	default:
	}
}

func (j *Journal) Play() {
	j.playing = true
	defer j.setNotPlaying()

	byteEntries, err := j.g.Store.ReadJournal(j.g.ID)
	if err != nil {
		log.Println("error reading journal:", err)
		return
	}

	entries := make([]JournalEntry, len(byteEntries))

	for i, e := range byteEntries {
		err := msgpack.Unmarshal(e, &entries[i])
		if err != nil {
			log.Println("invalid line in journal, failed to play")
			return
		}
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Index < entries[j].Index
	})

	for i, e := range entries {
		if e.Index != i+1 {
			log.Println("missing entries in journal, failed to play")
			return
		}

		j.play(&e)
		j.index = e.Index
	}

	log.Println("Journal replay done")
}

func (j *Journal) setNotPlaying() {
	j.playing = false
}

const (
	JCreateTile            = 1001
	JGenVerticesTiles      = 1002
	JSetTileType           = 1003
	JDevelopmentCardOrder  = 1004
	JDevelopmentCardCursor = 1005
	JSetPorts              = 1006
	JSetInitPhase          = 1007
	JSetGameSettings       = 1008
	JSetAdvancedSettings   = 1009

	JSetRobber       = 1101
	JVertexBuild     = 1102
	JEdgeBuild       = 1103
	JCityImprove     = 1104
	JSetKnightActive = 1105
	JBuildWall       = 1106
	JBuildMetropolis = 1107
	JMerchantFleet   = 1108
	JMerchant        = 1109
	JGiveProgress    = 1110
	JMovePlacement   = 1111

	JEndTurn       = 1201
	JRollDice      = 1202
	JRollEventDice = 1203
	JSpecialBuild  = 1204

	JUpdateCard              = 1301
	JUpdateResources         = 1302
	JUpdateDevelopmentCard   = 1303
	JReinsertDevelopmentCard = 1304

	JSetUsername = 1401
	JSetId       = 1402
)

func (j *Journal) play(e *JournalEntry) {
	switch e.Type {
	case JCreateTile:
		j.PCreateTile(e)
	case JGenVerticesTiles:
		j.PGenVerticesEdges(e)
	case JSetTileType:
		j.PSetTileType(e)
	case JSetRobber:
		j.PSetRobber(e)
	case JVertexBuild:
		j.PVertexBuild(e)
	case JEdgeBuild:
		j.PEdgeBuild(e)
	case JCityImprove:
		j.PCityImprove(e)
	case JSetKnightActive:
		j.PSetKnightActive(e)
	case JBuildWall:
		j.PBuildWall(e)
	case JBuildMetropolis:
		j.PBuildMetropolis(e)
	case JMerchantFleet:
		j.PMerchantFleet(e)
	case JMerchant:
		j.PMerchant(e)
	case JGiveProgress:
		j.PGiveProgress(e)
	case JMovePlacement:
		j.PMovePlacement(e)
	case JEndTurn:
		j.PEndTurn(e)
	case JRollDice:
		j.PRollDice(e)
	case JRollEventDice:
		j.PRollEventDice(e)
	case JSpecialBuild:
		j.PSpecialBuild(e)
	case JUpdateCard:
		j.PUpdateCard(e)
	case JUpdateDevelopmentCard:
		j.PUpdateDevelopmentCard(e)
	case JReinsertDevelopmentCard:
		j.PReinsertDevelopmentCard(e)
	case JUpdateResources:
		j.PUpdateResources(e)
	case JDevelopmentCardOrder:
		j.PDevelopmentCardOrder(e)
	case JDevelopmentCardCursor:
		j.PDevelopmentCardCursor(e)
	case JSetPorts:
		j.PSetPorts(e)
	case JSetInitPhase:
		j.PSetInitPhase(e)
	case JSetUsername:
		j.PSetUsername(e)
	case JSetId:
		j.PSetId(e)
	case JSetGameSettings:
		j.PSetGameSettings(e)
	case JSetAdvancedSettings:
		j.PSetAdvancedSettings(e)
	}
}

func (j *Journal) WCreateTile(tile *entities.Tile, dispX float64) {
	j.Write(JournalEntry{Type: JCreateTile, Fields: []interface{}{tile.Center, dispX, tile.Fog}})
}

func (j *Journal) PCreateTile(e *JournalEntry) {
	var center entities.Coordinate
	var fog bool
	mapstructure.Decode(e.Fields[2], &fog)
	mapstructure.Decode(e.Fields[0], &center)
	j.g.addTile(center, e.Fields[1].(float64))
	j.g.Tiles[center].Fog = fog
}

func (j *Journal) WGenVerticesEdges() {
	j.Write(JournalEntry{Type: JGenVerticesTiles, Fields: []interface{}{}})
}

func (j *Journal) PGenVerticesEdges(e *JournalEntry) {
	j.g.generateVertices()
	j.g.generateEdges()
}

func (j *Journal) WSetTileType(tile *entities.Tile) {
	j.Write(JournalEntry{Type: JSetTileType, Fields: []interface{}{tile.Center, tile.Type, tile.Number}})
}

func (j *Journal) PSetTileType(e *JournalEntry) {
	var center entities.Coordinate
	mapstructure.Decode(e.Fields[0], &center)

	if tile, ok := j.g.Tiles[center]; ok {
		tile.Type = entities.TileType(e.Fields[1].(uint16))
		tile.Number = uint16(e.Fields[2].(uint16))
	}
}

func (j *Journal) PSetRobber(e *JournalEntry) {
	var center entities.Coordinate
	mapstructure.Decode(e.Fields[0], &center)
	tile := j.g.Tiles[center]
	if j.g.Robber == nil {
		j.g.Robber = &entities.Robber{Tile: tile}
	}
	j.g.Robber.Move(tile)
}

func (j *Journal) WSetRobber(tile *entities.Tile) {
	j.Write(JournalEntry{Type: JSetRobber, Fields: []interface{}{tile.Center}})
}

func (j *Journal) PVertexBuild(e *JournalEntry) {
	var C entities.Coordinate
	var playerOrder uint16
	var bt entities.BuildableType
	var force bool

	mapstructure.Decode(e.Fields[0], &C)
	mapstructure.Decode(e.Fields[1], &playerOrder)
	mapstructure.Decode(e.Fields[2], &bt)

	if len(e.Fields) >= 4 {
		mapstructure.Decode(e.Fields[3], &force)
	}

	vertex, _ := j.g.Graph.GetVertex(C)
	if vertex == nil {
		return
	}

	if bt == 0 {
		if vertex.Placement != nil {
			bt = vertex.Placement.GetType()

			// Return wall
			if bt == entities.BTCity && vertex.Placement.(*entities.City).Wall {
				vertex.Placement.GetOwner().BuildablesLeft[entities.BTWall]++
			}

			// Return buildable type
			_, ok := vertex.Placement.GetOwner().BuildablesLeft[bt]
			if ok {
				vertex.Placement.GetOwner().BuildablesLeft[bt]++
			}
		}
		vertex.RemovePlacement()
		return
	}

	player := j.g.Players[playerOrder]

	if !force {
		switch bt {
		case entities.BTSettlement:
			err := j.g.BuildSettlement(player, C)
			if err != nil {
				log.Println("error building settlement when playing journal: ", err)
			}
			return
		case entities.BTCity:
			err := j.g.BuildCity(player, C)
			if err != nil {
				log.Println("error building city when playing journal: ", err)
			}
			return
		}

		if bt >= entities.BTKnight1 && bt <= entities.BTKnight3 {
			err := j.g.BuildKnight(player, C)
			if err != nil {
				log.Println("error building knight when playing journal: ", err)
			}
			return
		}
	} else {
		player.BuildAtVertex(vertex, bt)
		_, ok := player.BuildablesLeft[bt]
		if ok {
			player.BuildablesLeft[bt]--
		}
	}
}

func (j *Journal) WVertexBuild(v *entities.Vertex, force bool) {
	if v.Placement == nil {
		j.Write(JournalEntry{Type: JVertexBuild, Fields: []interface{}{
			v.C, 0, 0, force,
		}})
		return
	}

	j.Write(JournalEntry{Type: JVertexBuild, Fields: []interface{}{
		v.C,
		v.Placement.GetOwner().Order,
		v.Placement.GetType(),
		force,
	}})
}

func (j *Journal) PEdgeBuild(e *JournalEntry) {
	var C entities.EdgeCoordinate
	var playerOrder uint16
	var bt entities.BuildableType

	mapstructure.Decode(e.Fields[0], &C)
	mapstructure.Decode(e.Fields[1], &playerOrder)
	mapstructure.Decode(e.Fields[2], &bt)

	edge, _ := j.g.Graph.GetEdge(C)
	if edge == nil {
		return
	}

	if bt == 0 {
		if edge.Placement != nil {
			bt = edge.Placement.GetType()
			_, ok := edge.Placement.GetOwner().BuildablesLeft[bt]
			if ok {
				edge.Placement.GetOwner().BuildablesLeft[bt]++
			}
		}
		edge.RemovePlacement()
		return
	}

	player := j.g.Players[playerOrder]

	switch entities.BuildableType(e.Fields[2].(uint16)) {
	case entities.BTRoad:
		err := j.g.BuildRoad(player, C)
		if err != nil {
			log.Println("error building road when playing journal: ", err)
		}
	}
}

func (j *Journal) WEdgeBuild(e *entities.Edge) {
	if e.Placement == nil {
		j.Write(JournalEntry{Type: JEdgeBuild, Fields: []interface{}{
			e.C, 0, 0,
		}})
		return
	}

	j.Write(JournalEntry{Type: JEdgeBuild, Fields: []interface{}{
		e.C,
		e.Placement.GetOwner().Order,
		e.Placement.GetType(),
	}})
}

func (j *Journal) PCityImprove(e *JournalEntry) {
	var order, ct, level int
	mapstructure.Decode(e.Fields[0], &order)
	mapstructure.Decode(e.Fields[1], &ct)
	mapstructure.Decode(e.Fields[2], &level)

	player := j.g.Players[order]
	player.Improvements[ct] = level
}

func (j *Journal) WCityImprove(p *entities.Player, ct entities.CardType, level int) {
	j.Write(JournalEntry{Type: JCityImprove, Fields: []interface{}{
		p.Order,
		int(ct),
		level,
	}})
}

func (j *Journal) PSetKnightActive(e *JournalEntry) {
	var C entities.Coordinate
	var activated, canuse bool

	mapstructure.Decode(e.Fields[0], &C)
	mapstructure.Decode(e.Fields[1], &activated)
	mapstructure.Decode(e.Fields[2], &canuse)

	vertex, _ := j.g.Graph.GetVertex(C)
	if vertex == nil {
		return
	}

	if vertex.Placement != nil &&
		vertex.Placement.GetType() >= entities.BTKnight1 &&
		vertex.Placement.GetType() <= entities.BTKnight3 {
		k := vertex.Placement.(*entities.Knight)
		k.Activated = activated
		k.CanUse = canuse
	}
}

func (j *Journal) WSetKnightActive(k *entities.Knight) {
	j.Write(JournalEntry{Type: JSetKnightActive, Fields: []interface{}{
		k.GetLocation().C, k.Activated, k.CanUse,
	}})
}

func (j *Journal) PBuildWall(e *JournalEntry) {
	var C entities.Coordinate
	var playerOrder uint16
	mapstructure.Decode(e.Fields[0], &C)
	mapstructure.Decode(e.Fields[1], &playerOrder)
	j.g.BuildWall(j.g.Players[playerOrder], C)
}

func (j *Journal) WBuildWall(p *entities.Player, vertex *entities.Vertex) {
	j.Write(JournalEntry{Type: JBuildWall, Fields: []interface{}{
		vertex.C, p.Order,
	}})
}

func (j *Journal) PBuildMetropolis(e *JournalEntry) {
	var C entities.Coordinate
	var ct entities.CardType
	mapstructure.Decode(e.Fields[0], &C)
	mapstructure.Decode(e.Fields[1], &ct)

	vertex, _ := j.g.Graph.GetVertex(C)
	if vertex == nil {
		return
	}

	vertex.Placement.(*entities.City).Metropolis = ct
	if ct > 0 {
		j.g.ExtraVictoryPoints.Metropolis[ct] = vertex.Placement.GetOwner()
	}
}

func (j *Journal) WBuildMetropolis(vertex *entities.Vertex) {
	j.Write(JournalEntry{Type: JBuildMetropolis, Fields: []interface{}{
		vertex.C, vertex.Placement.(*entities.City).Metropolis,
	}})
}

func (j *Journal) PMerchantFleet(e *JournalEntry) {
	var ct entities.CardType
	mapstructure.Decode(e.Fields[0], &ct)
	j.g.MerchantFleets[ct] = 2
}

func (j *Journal) WMerchantFleet(ct entities.CardType) {
	j.Write(JournalEntry{Type: JMerchantFleet, Fields: []interface{}{ct}})
}

func (j *Journal) PMerchant(e *JournalEntry) {
	var C entities.Coordinate
	var playerOrder uint16
	mapstructure.Decode(e.Fields[0], &C)
	mapstructure.Decode(e.Fields[1], &playerOrder)
	j.g.Merchant.Move(j.g.Players[playerOrder], j.g.Tiles[C])
}

func (j *Journal) WMerchant() {
	j.Write(JournalEntry{Type: JMerchant, Fields: []interface{}{
		j.g.Merchant.Tile.Center, j.g.Merchant.Owner.Order,
	}})
}

func (j *Journal) PGiveProgress(e *JournalEntry) {
	var playerOrder uint16
	var deckType entities.CardType
	mapstructure.Decode(e.Fields[0], &playerOrder)
	mapstructure.Decode(e.Fields[1], &deckType)
	j.g.GiveProgressCard(deckType, int(playerOrder))
}

func (j *Journal) WGiveProgress(p *entities.Player, deckType entities.CardType) {
	j.Write(JournalEntry{Type: JGiveProgress, Fields: []interface{}{
		p.Order, deckType,
	}})
}

func (j *Journal) PMovePlacement(e *JournalEntry) {
	var fromC entities.Coordinate
	var toC entities.Coordinate
	mapstructure.Decode(e.Fields[0], &fromC)
	mapstructure.Decode(e.Fields[1], &toC)

	j.g.MovePlacement(j.g.Vertices[fromC], j.g.Vertices[toC])
}

func (j *Journal) WMovePlacement(from *entities.Vertex, to *entities.Vertex) {
	j.Write(JournalEntry{Type: JMovePlacement, Fields: []interface{}{
		from.C, to.C,
	}})
}

func (j *Journal) WEndTurn(p *entities.Player) {
	j.Write(JournalEntry{Type: JEndTurn, Fields: []interface{}{
		p.Order,
	}})
}

func (j *Journal) PEndTurn(e *JournalEntry) {
	player := j.g.Players[e.Fields[0].(uint16)]
	err := j.g.EndTurn(player)
	if err != nil {
		log.Println("Error playing end turn from journal: ", err)
	}
}

func (j *Journal) WRollDice(redRoll int, whiteRoll int) {
	j.Write(JournalEntry{Type: JRollDice, Fields: []interface{}{
		redRoll, whiteRoll,
	}})
}

func (j *Journal) PRollDice(e *JournalEntry) {
	redRoll := int(e.Fields[0].(int8))
	whiteRoll := int(e.Fields[1].(int8))
	j.g.RollDiceWith(redRoll, whiteRoll)
}

func (j *Journal) WRollEventDice(roll int) {
	j.Write(JournalEntry{Type: JRollEventDice, Fields: []interface{}{
		roll,
	}})
}

func (j *Journal) PRollEventDice(e *JournalEntry) {
	roll := int(e.Fields[0].(int8))
	j.g.RollEventDiceWith(roll)
}

func (j *Journal) WSpecialBuild(p *entities.Player) {
	j.Write(JournalEntry{Type: JSpecialBuild, Fields: []interface{}{
		p.Order, p.SpecialBuild,
	}})
}

func (j *Journal) PSpecialBuild(e *JournalEntry) {
	var playerOrder uint16
	var sb bool
	mapstructure.Decode(e.Fields[0], &playerOrder)
	mapstructure.Decode(e.Fields[1], &sb)
	j.g.Players[playerOrder].SpecialBuild = sb
}

func (j *Journal) WUpdateCard(p *entities.Player, cardType entities.CardType, quantity int16) {
	var order int
	if p != nil {
		order = int(p.Order)
	} else {
		order = -1
	}

	j.Write(JournalEntry{Type: JUpdateCard, Fields: []interface{}{
		order, cardType, quantity,
	}})
}

func (j *Journal) PUpdateCard(e *JournalEntry) {
	p := e.Fields[0].(int8)
	cardType := entities.CardType(e.Fields[1].(uint16))
	quantity := int(e.Fields[2].(int16))

	if p != -1 {
		j.g.Players[p].CurrentHand.UpdateCards(cardType, quantity)
	} else {
		j.g.Bank.Hand.UpdateCards(cardType, quantity)
	}
}

func (j *Journal) WUpdateResources(p *entities.Player, wood int, brick int, wool int, wheat int, ore int) {
	var order int
	if p != nil {
		order = int(p.Order)
	} else {
		order = -1
	}

	j.Write(JournalEntry{Type: JUpdateResources, Fields: []interface{}{
		order, wood, brick, wool, wheat, ore,
	}})
}

func (j *Journal) PUpdateResources(e *JournalEntry) {
	var p, wood, brick, wool, wheat, ore int
	mapstructure.Decode(e.Fields[0], &p)
	mapstructure.Decode(e.Fields[1], &wood)
	mapstructure.Decode(e.Fields[2], &brick)
	mapstructure.Decode(e.Fields[3], &wool)
	mapstructure.Decode(e.Fields[4], &wheat)
	mapstructure.Decode(e.Fields[5], &ore)

	if p != -1 {
		j.g.Players[p].CurrentHand.UpdateResources(wood, brick, wool, wheat, ore)
	} else {
		j.g.Bank.Hand.UpdateResources(wood, brick, wool, wheat, ore)
	}
}

func (j *Journal) WUpdateDevelopmentCard(p *entities.Player, developmentCardType entities.DevelopmentCardType, quantity int16, numUsed int16, canUse bool) {
	var order int
	if p != nil {
		order = int(p.Order)
	} else {
		order = -1
	}

	j.Write(JournalEntry{Type: JUpdateDevelopmentCard, Fields: []interface{}{
		order, developmentCardType, quantity, numUsed, canUse,
	}})
}

func (j *Journal) PUpdateDevelopmentCard(e *JournalEntry) {
	var p int
	mapstructure.Decode(e.Fields[0], &p)
	var developmentCardType entities.DevelopmentCardType
	mapstructure.Decode(e.Fields[1], &developmentCardType)
	var quantity int16
	mapstructure.Decode(e.Fields[2], &quantity)
	var numUsed int16
	mapstructure.Decode(e.Fields[3], &numUsed)
	var canUse bool
	mapstructure.Decode(e.Fields[4], &canUse)

	if p != -1 {
		j.g.Players[p].CurrentHand.GetDevelopmentCardDeck(developmentCardType).Quantity = quantity
		j.g.Players[p].CurrentHand.GetDevelopmentCardDeck(developmentCardType).NumUsed = numUsed
		j.g.Players[p].CurrentHand.GetDevelopmentCardDeck(developmentCardType).CanUse = canUse
	}
}

func (j *Journal) WReinsertDevelopmentCard(p *entities.Player, developmentCardType entities.DevelopmentCardType) {
	j.Write(JournalEntry{Type: JReinsertDevelopmentCard, Fields: []interface{}{
		p.Order, developmentCardType,
	}})
}

func (j *Journal) PReinsertDevelopmentCard(e *JournalEntry) {
	var p int
	mapstructure.Decode(e.Fields[0], &p)
	var developmentCardType entities.DevelopmentCardType
	mapstructure.Decode(e.Fields[1], &developmentCardType)
	j.g.ReinsertDevelopmentCard(j.g.Players[p], developmentCardType, false)
}

func (j *Journal) WDevelopmentCardOrder(order []entities.DevelopmentCardType, stack entities.CardType) {
	j.Write(JournalEntry{Type: JDevelopmentCardOrder, Fields: []interface{}{
		stack,
		order,
	}})
}

func (j *Journal) PDevelopmentCardOrder(e *JournalEntry) {
	var stack entities.CardType
	mapstructure.Decode(e.Fields[0], &stack)

	var order []entities.DevelopmentCardType
	err := mapstructure.Decode(e.Fields[1], &order)
	if err != nil {
		return
	}

	j.g.Bank.DevelopmentCardOrder[stack] = order
}

func (j *Journal) WDevelopmentCardCursor(cursor int) {
	j.Write(JournalEntry{Type: JDevelopmentCardCursor, Fields: []interface{}{
		cursor,
	}})
}

func (j *Journal) PDevelopmentCardCursor(e *JournalEntry) {
	var cursor int
	mapstructure.Decode(e.Fields[0], &cursor)
	j.g.Bank.DevelopmentCardCursor = cursor
}

// Write a function to add journal entry for a port
func (j *Journal) WSetPorts() {
	portEntries := make([]interface{}, len(j.g.Ports))
	for i, port := range j.g.Ports {
		portEntries[i] = interface{}(PortEntry{
			Type:  port.Type,
			Ratio: port.Ratio,
			C:     port.Edge.C,
		})
	}

	j.Write(JournalEntry{Type: JSetPorts, Fields: portEntries})
}

func (j *Journal) PSetPorts(e *JournalEntry) {
	portEntries := make([]PortEntry, len(j.g.Ports))
	mapstructure.Decode(e.Fields, &portEntries)
	ports := make([]*entities.Port, len(portEntries))

	for i, portEntry := range portEntries {
		edge, err := j.g.Graph.GetEdge(portEntry.C)
		if err != nil {
			log.Println("Error setting port:", err)
			continue
		}

		vertex1, _ := j.g.Graph.GetVertex(edge.C.C1)
		vertex2, _ := j.g.Graph.GetVertex(edge.C.C2)

		ports[i] = &entities.Port{
			Type:     portEntry.Type,
			Ratio:    portEntry.Ratio,
			Edge:     edge,
			Vertices: []*entities.Vertex{vertex1, vertex2},
		}
	}

	j.g.Ports = ports
}

func (j *Journal) WSetInitPhase(initPhase bool) {
	j.Write(JournalEntry{Type: JSetInitPhase, Fields: []interface{}{
		initPhase,
	}})
}

func (j *Journal) PSetInitPhase(e *JournalEntry) {
	j.g.InitPhase = e.Fields[0].(bool)
}

func (j *Journal) WSetUsername(p *entities.Player, username string) {
	j.Write(JournalEntry{Type: JSetUsername, Fields: []interface{}{
		p.Order, username,
	}})
}

func (j *Journal) PSetUsername(e *JournalEntry) {
	order := e.Fields[0].(uint16)
	username := e.Fields[1].(string)
	j.g.SetUsername(j.g.Players[order], username)
}

func (j *Journal) WSetId(p *entities.Player, id string) {
	j.Write(JournalEntry{Type: JSetId, Fields: []interface{}{
		p.Order, id,
	}})
}

func (j *Journal) PSetId(e *JournalEntry) {
	order := e.Fields[0].(uint16)
	id := e.Fields[1].(string)

	j.g.Players[order].Id = id
}

func (j *Journal) WSetGameSettings() {
	j.Write(JournalEntry{Type: JSetGameSettings, Fields: []interface{}{
		j.g.Settings,
	}})
}

func (j *Journal) PSetGameSettings(e *JournalEntry) {
	var settings entities.GameSettings
	mapstructure.Decode(e.Fields[0], &settings)

	j.g.Settings = settings
	j.g.Mode = j.g.Settings.Mode
	j.g.InitWithGameMode()
}

func (j *Journal) WSetAdvancedSettings() {
	j.Write(JournalEntry{Type: JSetAdvancedSettings, Fields: []interface{}{
		j.g.AdvancedSettings,
	}})
}

func (j *Journal) PSetAdvancedSettings(e *JournalEntry) {
	var settings entities.AdvancedSettings
	mapstructure.Decode(e.Fields[0], &settings)

	j.g.AdvancedSettings = settings
}
