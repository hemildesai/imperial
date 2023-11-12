import * as PIXI from "pixi.js";
import * as assets from "./assets";
import * as windows from "./windows";
import * as canvas from "./canvas";
import * as state from "./state";
import { getThisPlayerOrder } from "./ws";
import { PlayerState } from "../tsg";

let gameOverWindow: PIXI.Sprite;

type GameOverMessage = {
    Players: PlayerState[];
    Winner: number;
};

/**
 * Convert a numeric position to text
 * @param pos player position in rank list
 */
function positionToMessage(pos: number) {
    switch (pos) {
        case 1:
            return "You Win!";
        case 2:
            return "You are 2nd!";
        case 3:
            return "You are 3rd!";
        case 4:
            return "You are 4th!";
        case 5:
            return "You are 5th!";
        case 6:
            return "You are 6th!";
        default:
            return "Game Over";
    }
}

/**
 * Show the game over window
 * @param msg Game over message
 */
export function handleGameOver(msg: GameOverMessage) {
    if (gameOverWindow && !gameOverWindow.destroyed) {
        gameOverWindow?.destroy({ children: true });
    }

    const PLAYER_HEIGHT = 95;
    const EXTRA_HEIGHT = 80;
    const width = 450;
    const height =
        EXTRA_HEIGHT + msg.Players.length * PLAYER_HEIGHT + PLAYER_HEIGHT - 15;

    gameOverWindow = windows.getWindowSprite(width, height);
    gameOverWindow.pivot.x = width / 2;
    gameOverWindow.pivot.y = height / 4;
    gameOverWindow.x = canvas.getWidth() / 2;
    gameOverWindow.y = canvas.getHeight() / 4;
    gameOverWindow.zIndex = 2500;
    canvas.app.stage.addChild(gameOverWindow);
    canvas.app.markDirty();

    const rank =
        msg.Players.findIndex((p) => p.Order === getThisPlayerOrder()) + 1;
    const title = new PIXI.Text(positionToMessage(rank), {
        fontFamily: "sans-serif",
        fontSize: 32,
        fill: 0x000000,
        align: "center",
    });
    title.style.fontWeight = "bold";
    title.anchor.x = 0.5;
    title.x = width / 2;
    title.y = 30;
    gameOverWindow.addChild(title);

    const getPlayer = (p: PlayerState | undefined) => {
        const fields: (keyof PlayerState)[] = [
            "VictoryPoints",
            "LongestRoad",
            "DevCardVp",
            "Knights",
        ];
        const titles: assets.ICON[] = [
            assets.ICON.VP,
            assets.ICON.ROAD,
            assets.ICON.DCARD,
            assets.ICON.KNIGHT,
        ];

        const container = new PIXI.Container();
        if (p) {
            const avatar = state.getPlayerAvatarSprite(p.Order);
            avatar.x = 50;
            avatar.y = -5;
            container.addChild(avatar);

            const username = new PIXI.Text(p.Username, {
                fontFamily: "sans-serif",
                fontSize: 13,
                fill: 0x000000,
                align: "left",
                fontWeight: "bold",
            });
            username.anchor.x = 0.5;
            username.x = 70;
            username.y = 60;
            container.addChild(username);
        }

        let fid = 0;
        for (const f of fields) {
            let field: PIXI.Text | PIXI.Sprite;
            if (!p) {
                field = new PIXI.Sprite();
                assets.assignTexture(field, assets.icons[titles[fid]]);
                field.tint = 0x000000;
                field.scale.set(0.15);
            } else {
                field = new PIXI.Text(String(p[fields[fid]]), {
                    fontFamily: "sans-serif",
                    fontSize: 24,
                    fill: 0x000000,
                    align: "center",
                });
            }

            field.x = 140 + 80 * fid;
            field.y = 13;
            field.anchor.x = 0.5;
            container.addChild(field);
            fid++;

            if (msg.Winner == p?.Order) {
                (<PIXI.Text>field).style.fontWeight = "bold";
            }
        }

        return container;
    };

    let i = 0;
    for (const p of [undefined, ...msg.Players]) {
        const c = getPlayer(p);
        gameOverWindow.addChild(c);
        c.y = EXTRA_HEIGHT + PLAYER_HEIGHT * i - (i > 0 ? 20 : 0);
        i++;
    }

    canvas.app.markDirty();
}
