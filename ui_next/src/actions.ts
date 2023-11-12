import * as trade from "./trade";
import * as ws from "./ws";
import * as assets from "./assets";
import * as socketTypes from "./sock";
import * as board from "./board";
import * as state from "./state";
import * as tsg from "../tsg";
import * as canvas from "./canvas";
import * as windows from "./windows";
import * as PIXI from "pixi.js";
import * as buttons from "./buttons";

export enum PlayerActionType {
    SelectCards = "sc",
    SelectCardsDone = "sc*",
    ChooseTile = "ct",
    ChoosePlayer = "cp",
    ChooseVertex = "cv",
    ChooseEdge = "ce",
    ChooseDice = "cd",
    ChooseImprovement = "ci",
}

let chooseDiceWindow: PIXI.Container | undefined;

/**
 * Handle a player action
 * @param action Action to perform
 */
export function handle(action: tsg.PlayerAction) {
    resetPendingAction();
    state.showPendingAction(action);

    switch (action.Type) {
        case PlayerActionType.SelectCards:
            action.Data = new tsg.PlayerActionSelectCards(action.Data);
            trade.handleSelectCardsAction(action);
            break;

        case PlayerActionType.SelectCardsDone:
            trade.closeTradeOffer();
            break;

        case PlayerActionType.ChooseTile:
            chooseTile(new tsg.PlayerActionChooseTile(action.Data));
            break;

        case PlayerActionType.ChoosePlayer:
            choosePlayer(new tsg.PlayerActionChoosePlayer(action.Data));
            break;

        case PlayerActionType.ChooseVertex:
            chooseVertex(new tsg.PlayerActionChooseVertex(action.Data));
            break;

        case PlayerActionType.ChooseEdge:
            chooseEdge(new tsg.PlayerActionChooseEdge(action.Data));
            break;

        case PlayerActionType.ChooseDice:
            chooseDice();
            break;

        case PlayerActionType.ChooseImprovement:
            chooseImprovement();
            break;

        default:
            console.error(action);
    }
}

/**
 * Send a nil response to the server
 */
export function cancelPendingAction() {
    ws.getCommandHub().sendGameMessage({
        t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
        ar_data: null,
    });
    resetPendingAction();
}

/**
 * Clear the pending action state
 */
export function resetPendingAction() {
    board.resetEdgeHighlights();
    board.resetVertexHighlights();
    board.resetTileHighlights();
    state.highlightPlayers();
    state.showPendingAction();
}

/**
 * Respond with the selected cards
 * @param cards Array of card quantities
 */
export function respondSelectCards(cards: number[]) {
    ws.getCommandHub().sendGameMessage({
        t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
        ar_data: cards,
    });
}

/**
 * Ask the player to choose a tile
 * @param a PlayerActionChooseTile
 */
export function chooseTile(a: tsg.PlayerActionChooseTile) {
    board.highlightTiles(a.Allowed);
    board.setTileClickEvent((_, tile) => {
        resetPendingAction();
        ws.getCommandHub().sendGameMessage({
            t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
            ar_data: tile.Center.encode(),
        });
    });
}

/**
 * Ask the player to choose a player
 * @param a PlayerActionChoosePlayer
 */
export function choosePlayer(a: tsg.PlayerActionChoosePlayer) {
    state.highlightPlayers(a.Choices);
    state.setPlayerClickEvent((_, o) => {
        resetPendingAction();
        ws.getCommandHub().sendGameMessage({
            t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
            ar_data: o,
        });
    });
}

/**
 * Ask the player to choose a vertex
 * @param a PlayerActionChooseVertex
 */
export function chooseVertex(a: tsg.PlayerActionChooseVertex) {
    board.highlightVertices(a.Allowed);

    board.setVertexClickEvent((_, v) => {
        resetPendingAction();
        ws.getCommandHub().sendGameMessage({
            t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
            ar_data: v.C.encode(),
        });
    });
}

/**
 * Ask the player to choose an edge
 * @param a PlayerActionChooseEdge
 */
export function chooseEdge(a: tsg.PlayerActionChooseEdge) {
    board.highlightEdges(a.Allowed);

    board.setEdgeClickEvent((_, e) => {
        resetPendingAction();
        ws.getCommandHub().sendGameMessage({
            t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
            ar_data: e.C.encode(),
        });
    });
}

/**
 * Ask the player to choose a dice roll
 */
export function chooseDice() {
    clearChooseDice();

    const DICE_WIDTH = 40;
    const WIDTH = 20 + (DICE_WIDTH + 5) * 6;
    const HEIGHT = 2 * DICE_WIDTH + 25;
    const w = windows.getWindowSprite(WIDTH, HEIGHT);
    const respond = new windows.YesNoWindow(WIDTH + 10, 12.5);
    respond.render();
    w.addChild(respond.container);
    chooseDiceWindow = w;

    let whiteSel = 0;
    let redSel = 0;

    const check = () => {
        if (whiteSel && redSel) {
            respond.onYes(() => {
                ws.getCommandHub().sendGameMessage({
                    t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
                    ar_data: [redSel, whiteSel],
                });
                resetPendingAction();
                clearChooseDice();
            });
            canvas.app.markDirty();
        }
    };

    const whiteSprites: PIXI.Sprite[] = [];
    const redSprites: PIXI.Sprite[] = [];

    [1, 2, 3, 4, 5, 6].forEach((i) => {
        const white = new PIXI.Sprite();
        assets.assignTexture(white, assets.diceWhite[i]);
        white.scale.set(DICE_WIDTH / white.width);
        white.x = 10 + (DICE_WIDTH + 5) * (i - 1);
        white.y = 10;
        white.interactive = true;
        white.cursor = "pointer";
        white.tint = 0x888888;
        white.on("pointerdown", (event) => {
            event.stopPropagation();
            whiteSprites.forEach((s) => (s.tint = 0x888888));
            white.tint = 0xffffff;
            whiteSel = i;
            check();
            canvas.app.markDirty();
        });
        w.addChild(white);
        whiteSprites.push(white);

        const red = new PIXI.Sprite();
        assets.assignTexture(red, assets.diceRed[i]);
        red.scale.set(DICE_WIDTH / red.width);
        red.x = 10 + (DICE_WIDTH + 5) * (i - 1);
        red.y = 55;
        red.interactive = true;
        red.cursor = "pointer";
        red.tint = 0x888888;
        red.on("pointerdown", (event) => {
            event.stopPropagation();
            redSprites.forEach((s) => (s.tint = 0x888888));
            red.tint = 0xffffff;
            redSel = i;
            check();
            canvas.app.markDirty();
        });
        w.addChild(red);
        redSprites.push(red);
    });

    w.zIndex = 1500;
    w.x = 20;
    w.y = canvas.getHeight() - 140 - HEIGHT;
    canvas.app.stage.addChild(w);
}

/**
 * Clear the choose dice window
 */
export function clearChooseDice() {
    if (chooseDiceWindow && !chooseDiceWindow.destroyed) {
        chooseDiceWindow.destroy();
    }
    canvas.app.markDirty();
}

/**
 * Ask the player to choose an improvement type
 */
export function chooseImprovement() {
    buttons.buttons.improveBox!.container.visible = true;
    buttons.buttons.knightBox!.container.visible = false;
    buttons.buttons.improveBox!.callback = (c: number) => {
        resetPendingAction();
        ws.getCommandHub().sendGameMessage({
            t: socketTypes.MSG_TYPE.ACTION_RESPONSE,
            ar_data: c,
        });
        buttons.buttons.improveBox!.callback = undefined;
    };
}
