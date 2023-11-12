package game

import (
	"errors"
	"imperials/entities"
	"imperials/maps"
	"log"
	"math/rand"
	"sync"
	"time"
)

type (
	Game struct {
		ID               string
		Mode             entities.GameMode
		Initialized      bool
		Store            Store
		Settings         entities.GameSettings
		AdvancedSettings entities.AdvancedSettings

		DiceState     int
		LastRollWhite int
		LastRollRed   int
		LastRollEvent int

		Bank                 *entities.Bank
		DevelopmentCardOrder []entities.DevelopmentCardType
		NumPlayers           uint16
		Players              []*entities.Player
		Spectators           []*entities.Player
		CurrentPlayer        *entities.Player
		Robber               *entities.Robber
		Merchant             *entities.Merchant
		MerchantFleets       [9]int
		BarbarianPosition    int
		NumBarbarianAttacks  int

		Vertices           map[entities.Coordinate]*entities.Vertex
		Edges              map[entities.EdgeCoordinate]*entities.Edge
		Tiles              map[entities.Coordinate]*entities.Tile
		Graph              *entities.Graph
		Ports              []*entities.Port
		ExtraVictoryPoints *entities.ExtraVictoryPoints

		InitPhase bool
		GameOver  bool

		SpecialBuildPhase   bool
		SpecialBuildStarter *entities.Player

		Ticker      *time.Ticker
		TickerPause bool
		TickerStop  chan bool
		TimerVals   TimerValues

		DispCoordMap map[entities.Coordinate]entities.FloatCoordinate

		j  Journal
		ai AI

		OfferCounter  int
		CurrentOffers []*entities.TradeOffer

		DiceStats *entities.DiceStats

		mutex       sync.Mutex
		ActionMutex sync.Mutex
	}

	StoreGameState struct {
		ID                 string                        `msgpack:"id"`
		Settings           entities.GameSettings         `msgpack:"s"`
		AdvancedSettings   entities.AdvancedSettings     `msgpack:"as"`
		NumPlayers         uint16                        `msgpack:"n"`
		PlayerStates       []*entities.PlayerState       `msgpack:"ps"`
		PlayerSecretStates []*entities.PlayerSecretState `msgpack:"pss"`
		GameOver           bool                          `msgpack:"g"`
		Winner             int                           `msgpack:"w"`
	}

	Store interface {
		Init(id string) error
		CreateGameIfNotExists(id string) error
		CreateGameStateIfNotExists(id string, state []byte) error
		WriteGameServer(id string) error
		WriteGameStarted(id string) error
		WriteGameFinished(id string) error
		WriteGameCompletedForUser(id string) error
		WriteGamePlayers(id string, numPlayers int32) error
		WriteGameActivePlayers(id string, numPlayers int32, host string) error
		WriteGamePrivacy(id string, private bool) error
		WriteGameSettings(id string, settings []byte) error
		WriteJournalEntries(id string, entries [][]byte) error
		WriteGameState(id string, state []byte) error
		WriteGameIdForUser(gameId, userId string, settings *entities.GameSettings) error
		ReadJournal(id string) ([][]byte, error)
		ReadGamePlayers(id string) (int, error)
		ReadUser(id string) (map[string]interface{}, error)
		GetOfficalMapNames() []string
		GetAllMapNamesForUser(userId string, exclude bool) ([]string, error)
		GetMap(name string) *entities.MapDefinition
		CheckIfJournalExists(id string) (bool, error)
		TerminateGame(id string) error
	}

	TimerValues struct {
		DiceRoll     int
		Turn         int
		DiscardCards int
		PlaceRobber  int
		ChoosePlayer int
		InitVert     int
		InitEdge     int
		UseDevCard   int
		SpecialBuild int
	}
)

func (game *Game) Initialize(id string, numPlayers uint16) (*Game, error) {
	game.mutex.Lock()
	defer game.mutex.Unlock()
	if game.Initialized {
		return game, errors.New("already initialized this game")
	}

	defer func() {
		if game.CurrentPlayer != nil {
			game.CurrentPlayer.TimeLeft = game.TimerVals.Turn
		}
	}()

	gameMode := game.Settings.Mode
	if gameMode != entities.Base && gameMode != entities.CitiesAndKnights {
		gameMode = entities.Base
	}

	game.Initialized = true
	game.Mode = gameMode
	game.ID = id

	// Init
	game.ai.g = game
	game.j.g = game
	game.j.Init()
	if val, err := game.Store.CheckIfJournalExists(id); err == nil && val {
		game.j.playing = true // Prevent anything from being written during init if journal exists
	}
	game.InitPhase = true

	rand.Seed(time.Now().UnixNano())

	// Start game ticker
	game.Ticker = time.NewTicker(1000 * time.Millisecond)
	go game.TickWatcher()
	game.TimerVals = TimerValues{
		DiceRoll:     int(10 * entities.SpeedMultiplier[game.Settings.Speed]),
		Turn:         int(60 * entities.SpeedMultiplier[game.Settings.Speed]),
		DiscardCards: int(20 * entities.SpeedMultiplier[game.Settings.Speed]),
		PlaceRobber:  int(15 * entities.SpeedMultiplier[game.Settings.Speed]),
		InitVert:     int(60 * entities.SpeedMultiplier[game.Settings.Speed]),
		InitEdge:     int(20 * entities.SpeedMultiplier[game.Settings.Speed]),
		ChoosePlayer: int(10 * entities.SpeedMultiplier[game.Settings.Speed]),
		UseDevCard:   int(20 * entities.SpeedMultiplier[game.Settings.Speed]),
		SpecialBuild: int(20 * entities.SpeedMultiplier[game.Settings.Speed]),
	}

	// Dice init
	game.DiceState = 0
	game.LastRollRed = 1
	game.LastRollWhite = 1
	if game.Settings.Mode == entities.CitiesAndKnights {
		game.LastRollEvent = 4
	}
	game.NumPlayers = numPlayers

	// Graph objects
	game.InitGraph()
	game.InitWithGameMode()
	game.DiceStats = &entities.DiceStats{}

	// At this point, all data structures should be initialized
	// Check if journal exists and start processing journal instead if yes
	if game.j.playing {
		game.j.playing = false
		game.InitGraph()
		game.j.Play()
		return game, nil
	}

	// Ensure map name
	if game.Settings.MapDefn == nil {
		game.Settings.MapDefn = maps.GetBaseMap()
	}

	// Initialize graph
	err := generateNewMap(game)
	if err != nil {
		game.Initialized = false
		return nil, err
	}

	game.Ports = make([]*entities.Port, 0)
	game.generatePorts()

	return game, nil
}

func (game *Game) InitWithGameMode() error {
	// Re-call this function
	game.j.WSetAdvancedSettings()
	game.j.WSetGameSettings()

	// Create players
	players, err := entities.GetNewPlayers(game.Mode, game.NumPlayers)
	if err != nil {
		return err
	}
	game.Players = players
	game.CurrentPlayer = players[0]

	// Init bank
	game.Bank, _ = entities.GetNewBank(game.Mode)

	// Extra points
	game.ExtraVictoryPoints = &entities.ExtraVictoryPoints{}
	game.SetExtraVictoryPoints()

	if game.Mode == entities.CitiesAndKnights {
		// Merchant
		game.Merchant = &entities.Merchant{}
		game.MerchantFleets = [9]int{-1, 4, 4, 4, 4, 4, 4, 4, 4}

		// Barbarian
		game.BarbarianPosition = 7
		game.NumBarbarianAttacks = 0
		game.ExtraVictoryPoints.AvailableDefenderPoints = 8
		game.ExtraVictoryPoints.DefenderPoints = make([]*entities.Player, game.ExtraVictoryPoints.AvailableDefenderPoints)

		// Metropolis
		game.ExtraVictoryPoints.Metropolis = make(map[entities.CardType]*entities.Player)
		game.ExtraVictoryPoints.Metropolis[entities.CardTypePaper] = nil
		game.ExtraVictoryPoints.Metropolis[entities.CardTypeCloth] = nil
		game.ExtraVictoryPoints.Metropolis[entities.CardTypeCoin] = nil

		// Bank
		game.j.WDevelopmentCardOrder(game.Bank.DevelopmentCardOrder[entities.CardTypePaper], entities.CardTypePaper)
		game.j.WDevelopmentCardOrder(game.Bank.DevelopmentCardOrder[entities.CardTypeCloth], entities.CardTypeCloth)
		game.j.WDevelopmentCardOrder(game.Bank.DevelopmentCardOrder[entities.CardTypeCoin], entities.CardTypeCoin)
	} else {
		game.BarbarianPosition = -1
		game.j.WDevelopmentCardOrder(game.Bank.DevelopmentCardOrder[0], 0)
	}

	return nil
}

func (game *Game) InitGraph() {
	game.Tiles = make(map[entities.Coordinate]*entities.Tile)
	game.Vertices = make(map[entities.Coordinate]*entities.Vertex)
	game.Edges = make(map[entities.EdgeCoordinate]*entities.Edge)
	game.DispCoordMap = make(map[entities.Coordinate]entities.FloatCoordinate)
	game.Graph = &entities.Graph{
		Tiles:    game.Tiles,
		Vertices: game.Vertices,
		Edges:    game.Edges,
	}
	game.Robber = &entities.Robber{}
	game.CurrentOffers = make([]*entities.TradeOffer, 0)
}

// Clean up and terminate the game
// Mutex must be locked
func (g *Game) Terminate() {
	log.Println("Terminating Game", g.ID)

	if !g.Initialized {
		return
	}

	g.Initialized = false
	g.TickerStop <- true

	for _, p := range g.Players {
		p.Initialized = false
		if p.PendingAction != nil {
			p.SendExpect(nil)
		}
	}

	g.j.Flush()
}

func (g *Game) HasPlayerPendingAction() bool {
	if g.GameOver {
		return true
	}

	for _, p := range g.Players {
		if p.PendingAction != nil {
			return true
		}
	}
	return false
}

func (g *Game) TickWatcher() {
	g.TickerStop = make(chan bool)
	i := 0
	for {
		select {
		case <-g.Ticker.C:
			go g.Tick()

			i++
			if i > 5 {
				go g.j.Flush()
				i = 0
			}
		case <-g.TickerStop:
			g.Ticker.Stop()
			return
		}
	}
}

func (g *Game) Tick() {
	defer g.Unlock()
	if !g.Lock() {
		return
	}

	// Is the ticker running
	if g.TickerPause {
		return
	}

	g.CurrentPlayer.TimeLeft--
	if g.CurrentPlayer.TimeLeft > 0 {
		if g.ai.Tick() {
			return
		}

		if !g.CurrentPlayer.GetIsBot() {
			return
		}
	}

	// Timeout occured

	// Clear pending action
	// The action MUST be a cancelable action
	if g.CurrentPlayer.PendingAction != nil {
		g.CurrentPlayer.ClearExpect()
		g.CurrentPlayer.SendExpect(nil)
		return
	}

	// Check if game is over
	if g.GameOver {
		return
	}

	// Check if need to roll dice
	if g.DiceState == 0 {
		g.RollDice(g.CurrentPlayer, 0, 0)
		return
	}

	// End the turn
	if g.CanEndTurn() == nil {
		g.EndTurn(g.CurrentPlayer)
		return
	}
}

func (g *Game) ReplacePlayer(p *entities.Player) (*entities.Player, error) {
	defer g.Unlock()
	if !g.Lock() {
		return nil, errors.New("game not initialized")
	}

	for _, player := range g.Players {
		if player.Id == p.Id {
			// Re-initialize the player's channel
			close(player.MessageChannel)
			player.MessageChannel = make(chan []byte, 1024)
			return player, nil
		}
	}

	return nil, errors.New("player not found")
}

func (g *Game) AddSpectator(p *entities.Player) error {
	defer g.Unlock()
	if !g.Lock() {
		return errors.New("game not initialized")
	}

	p.Order = 256
	p.IsSpectator = true
	g.Spectators = append(g.Spectators, p)
	g.BroadcastMessage(g.GetSpectatorListMessage())
	return nil
}

func (g *Game) RemoveSpectator(p *entities.Player) error {
	changed := false
	newSlice := make([]*entities.Player, 0)
	for _, pc := range g.Spectators {
		if pc != p {
			newSlice = append(newSlice, pc)
		} else {
			changed = true
		}
	}

	if changed {
		g.Spectators = newSlice
		g.BroadcastMessage(g.GetSpectatorListMessage())
	}

	return nil
}

func (g *Game) GetSpectatorListMessage() *entities.Message {
	res := make([]string, len(g.Spectators))
	for i, s := range g.Spectators {
		res[i] = s.Username
	}

	return &entities.Message{
		Type: entities.MessageTypeSpectatorList,
		Data: res,
	}
}

func (g *Game) SetUsername(p *entities.Player, username string) {
	p.Username = username
	g.j.WSetUsername(p, username)

	if p.Username[len(p.Username)-1:] == "*" {
		p.SetIsBot(true)
	}
}

func (g *Game) SetId(p *entities.Player, id string) {
	p.Id = id
	g.j.WSetId(p, id)
}

func (g *Game) SendError(err error, p *entities.Player) {
	if err != nil {
		p.SendMessage(&entities.Message{
			Type: entities.MessageTypeError,
			Data: err.Error(),
		})
	}
}

func (g *Game) Lock() bool {
	g.mutex.Lock()
	return g.Initialized
}

func (g *Game) Unlock() {
	g.mutex.Unlock()
}

func (g *Game) GenerateStoreGameState() *StoreGameState {
	storeGameState := &StoreGameState{
		ID:               g.ID,
		Settings:         g.Settings,
		AdvancedSettings: g.AdvancedSettings,
		NumPlayers:       g.NumPlayers,
		GameOver:         g.GameOver,
	}
	storeGameState.PlayerStates = make([]*entities.PlayerState, 0)
	storeGameState.PlayerSecretStates = make([]*entities.PlayerSecretState, 0)

	for _, p := range g.Players {
		playerState := g.GetPlayerState(p)
		playerSecretState := g.GetPlayerSecretState(p)
		storeGameState.PlayerStates = append(storeGameState.PlayerStates, playerState)
		storeGameState.PlayerSecretStates = append(storeGameState.PlayerSecretStates, &playerSecretState)
	}

	return storeGameState
}

func (g *Game) FindPlayerWithUsername(username string) (*entities.Player, error) {
	for _, p := range g.Players {
		if p.Username == username {
			return p, nil
		}
	}

	return nil, errors.New("player not found")
}
