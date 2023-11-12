package server

import (
	"errors"
	"fmt"
	"log"
	"strings"
)

const (
	HelpMsg = `

Commands: !help, !embargo, !toggle, !stats
`

	EmbargoMsg = `

    Embargo is a game mechanic that allows you to automatically reject trades with certain players by default.

    Embargo is activated against a player by typing !embargo [username] in the chat.

    Embargo is deactivated by typing !embargo [username] again.

	Activate Embargo against all players using !embargo (enable_all|-ea).

	Deactivate Embargo against all players using !embargo (disable_all|-da).

	Type "!embargo status" to see who is currently embarged.
`

	ToggleMsg = `

	Toggle allows you to toggle controls on and off.

	The available controls are: chat

	Type "!toggle [control]" to toggle the control.
`

	StatsMsg = `

	Stats allows you to view different stats pertaining to the current game.

	Available stats are: dice

	Type "!stats [stat]" to view the stat.
`
)

func processCommand(command string, ws *WsClient) (string, error) {
	if strings.HasPrefix(command, "!help") {
		return HelpMsg, nil
	} else if strings.HasPrefix(command, "!embargo") {
		cmd := strings.Split(command, " ")
		if len(cmd) != 2 {
			return EmbargoMsg, nil
		} else {
			// Process embargo
			output, err := processEmbargo(cmd, ws)
			if err != nil {
				log.Println("Error processing !embargo: ", err)
				return "", nil
			}

			return output, nil
		}
	} else if strings.HasPrefix(command, "!toggle") {
		cmd := strings.Split(command, " ")
		if len(cmd) != 2 {
			return ToggleMsg, nil
		} else {
			// Process toggle
			if cmd[1] == "chat" {
				ws.ChatEnabled = !ws.ChatEnabled
				if ws.ChatEnabled {
					return "\n\nChat enabled\n", nil
				} else {
					return "\n\nChat disabled\n", nil
				}
			} else {
				return "", errors.New("invalid toggle")
			}
		}
	} else if strings.HasPrefix(command, "!stats") {
		cmd := strings.Split(command, " ")
		if len(cmd) != 2 {
			return StatsMsg, nil
		} else {
			// Process stats
			output, err := processStats(cmd, ws)
			if err != nil {
				log.Println("Error processing !stats: ", err)
				return "", nil
			}

			return output, nil
		}
	} else {
		return "", errors.New("unknown command")
	}
}

func processEmbargo(cmd []string, ws *WsClient) (string, error) {
	g := &ws.Hub.Game
	defer g.Unlock()
	if !g.Lock() {
		return "", errors.New("game not initialized")
	}

	username := cmd[1]
	if username == ws.Player.Username {
		return "", errors.New("cannot embargo yourself")
	}

	if username == "enable_all" || username == "-ea" {
		for _, p := range g.Players {
			if p.Username == ws.Player.Username {
				continue
			}
			ws.Player.Embargos[p.Order] = true
		}
		return "\n\nStarted embargo against all players\n", nil
	}

	if username == "disable_all" || username == "-da" {
		for _, p := range g.Players {
			if p.Username == ws.Player.Username {
				continue
			}
			ws.Player.Embargos[p.Order] = false
		}
		return "\n\nStopped embargo against all players\n", nil
	}

	if username == "status" {
		output := "\n\n"

		for _, p := range g.Players {
			if p.Username == ws.Player.Username {
				continue
			}
			output += fmt.Sprintf("%s: %t\n", p.Username, ws.Player.Embargos[p.Order])
		}
		return output, nil
	}

	p, err := g.FindPlayerWithUsername(username)

	if err != nil {
		return "", err
	}

	ws.Player.Embargos[p.Order] = !ws.Player.Embargos[p.Order]

	if ws.Player.Embargos[p.Order] {
		return "\n\nStarted embargo against " + p.Username + "\n", nil
	} else {
		return "\n\nStopped embargo against " + p.Username + "\n", nil
	}
}

func processStats(cmd []string, ws *WsClient) (string, error) {
	g := &ws.Hub.Game
	defer g.Unlock()
	if !g.Lock() {
		return "", errors.New("game not initialized")
	}

	stat := cmd[1]
	if stat == "dice" {
		output := "\n\n"

		sum := 0
		for i := 0; i < len(g.DiceStats.Rolls); i++ {
			sum += g.DiceStats.Rolls[i]
		}

		if sum == 0 {
			output += "No dice have been rolled yet\n"
			return output, nil
		}

		for i := 1; i < len(g.DiceStats.Rolls); i++ {
			output += fmt.Sprintf("%5v: %s\n", i+1, strings.Repeat("■", int(float64(g.DiceStats.Rolls[i])/float64(sum)*40)))
		}

		return output, nil
	}

	return "", errors.New("invalid stat")
}
