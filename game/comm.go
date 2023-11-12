package game

import (
	"errors"
	"imperials/entities"
	"time"
)

func (g *Game) BroadcastMessage(msg *entities.Message) {
	if g.j.playing || !g.Initialized {
		return
	}

	for _, p := range append(g.Players, g.Spectators...) {
		p.SendMessage(msg)
	}
}

func (g *Game) BroadcastState() {
	g.BroadcastMessage(&entities.Message{
		Type: entities.MessageTypeGameState,
		Data: g.GetGameState(),
	})
}

func (g *Game) SendPlayerSecret(p *entities.Player) {
	if g.j.playing || !g.Initialized {
		return
	}

	p.SendMessage(&entities.Message{
		Type: entities.MessageTypePlayerSecretState,
		Data: g.GetPlayerSecretState(p),
	})
}

func (g *Game) SetPendingAction(p *entities.Player, action *entities.PlayerAction) {
	p.PendingAction = action
	if action != nil {
		p.SendAction(action)
		g.SendPlayerSecret(p)
		g.SendPlayerSecret(g.CurrentPlayer)
		g.BroadcastState()
	}
}

// Block for action and return player response
// Expects a locked mutex and unlocks it while waiting
// On return, mutex will be locked again
// time is the time for a non-cancelable action. Set to zero for cancelable.
func (g *Game) BlockForAction(
	p *entities.Player, timeout int, action *entities.PlayerAction,
) (interface{}, error) {
	// Do not resume the ticker if it was already paused
	// For example when multiple actions are concurrent
	pauseTicker := !g.TickerPause && timeout > 0
	if pauseTicker {
		g.TickerPause = true
	}

	var exp interface{}
	exp = nil

	oldTimeLeft := p.TimeLeft
	if timeout > 0 {
		p.TimeLeft = timeout
	}

	g.SetPendingAction(p, action)
	p.ClearExpect()

	g.Unlock()

	getExpectWithTimeout := func(g *Game, p *entities.Player) interface{} {
		expire := time.NewTicker(1000 * time.Millisecond)
		defer expire.Stop()

		for {
			select {
			case expect := <-p.Expect:
				return expect
			case <-expire.C:
				var timeLeft int
				g.Lock()
				p.TimeLeft--
				timeLeft = p.TimeLeft
				g.Unlock()
				if timeLeft == 0 || p.GetIsBot() {
					return nil
				}
			}
		}
	}

	if timeout > 0 {
		exp = getExpectWithTimeout(g, p)
	} else {
		exp = <-p.Expect
	}

	if !g.Lock() {
		return nil, errors.New("failed to get lock or not initialized")
	}

	if timeout > 0 {
		p.TimeLeft = oldTimeLeft
	}

	if pauseTicker {
		g.TickerPause = false
	}

	p.ClearPendingAction()
	g.SendPlayerSecret(p)
	g.SendPlayerSecret(g.CurrentPlayer)
	g.BroadcastState()
	return exp, nil
}

func (g *Game) resetTimeLeft() {
	for _, p := range g.Players {
		p.TimeLeft = 0
	}
}
