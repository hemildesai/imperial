import * as PIXI from "pixi.js";
import * as assets from "./assets";
import * as board from "./board";
import * as state from "./state";
import * as actions from "./actions";
import * as buttons from "./buttons";
import * as canvas from "./canvas";
import { sound } from "@pixi/sound";
import { DieRollState } from "../tsg";
import { getCommandHub } from "./ws";

let redDiceSprite: PIXI.Sprite;
let redDiceInner: PIXI.Sprite;
let whiteDiceSprite: PIXI.Sprite;
let whiteDiceInner: PIXI.Sprite;
let eventDiceSprite: PIXI.Sprite;
let eventDiceInner: PIXI.Sprite;
let diceContainer: PIXI.Container;

let stopFlashTimer: number = 0;

/**
 * Get a border for the dice
 * @param s Length of side of square
 * @returns PIXI.Graphics
 */
function getBorder(s: number) {
    const border = new PIXI.Graphics();
    border.lineStyle({ color: 0, width: 2 });
    border.beginFill(0, 0);
    border.drawRoundedRect(0, 0, s, s, 10 * (s / 64));
    border.endFill();
    return border;
}

/**
 * Stop flashing the dice and send the roll command
 */
function rollDice() {
    setFlashing(false);
    stopFlashTimer = window.setTimeout(() => setFlashing(true), 2000);
    getCommandHub().rollDice();
}

/**
 * Render the dice sprites.
 * @param redRoll Red die roll
 * @param whiteRoll White die roll
 * @param eventRoll Event die roll
 */
export async function render(
    redRoll: number,
    whiteRoll: number,
    eventRoll: number,
) {
    const SIZE = 64;

    if (!diceContainer || diceContainer.destroyed) {
        diceContainer = new PIXI.Container();
        diceContainer.x = canvas.getWidth() - 108;
        diceContainer.y = canvas.getHeight() - 174;
        diceContainer.zIndex = 1100;
        canvas.app.stage.addChild(diceContainer);

        redDiceSprite = new PIXI.Sprite();
        redDiceInner = new PIXI.Sprite();
        redDiceInner.width = SIZE;
        redDiceInner.height = SIZE;
        redDiceInner.interactive = true;
        redDiceInner.cursor = "pointer";
        redDiceInner.on("pointerdown", rollDice);
        diceContainer.addChild(redDiceSprite);
        redDiceSprite.addChild(redDiceInner);
        redDiceSprite.addChild(getBorder(SIZE));

        whiteDiceSprite = new PIXI.Sprite();
        whiteDiceInner = new PIXI.Sprite();
        whiteDiceInner.width = SIZE;
        whiteDiceInner.height = SIZE;
        whiteDiceSprite.x = SIZE + 10;
        whiteDiceInner.interactive = true;
        whiteDiceInner.cursor = "pointer";
        whiteDiceInner.on("pointerdown", rollDice);
        diceContainer.addChild(whiteDiceSprite);
        whiteDiceSprite.addChild(whiteDiceInner);
        whiteDiceSprite.addChild(getBorder(SIZE));

        diceContainer.pivot.x = (whiteDiceInner.width + whiteDiceSprite.x) / 2;
        diceContainer.pivot.y = whiteDiceInner.height / 2;
    }

    if (eventRoll && (!eventDiceInner || eventDiceInner.destroyed)) {
        eventDiceSprite = new PIXI.Sprite();
        eventDiceInner = new PIXI.Sprite();
        eventDiceInner.width = (SIZE * 2) / 3;
        eventDiceInner.height = (SIZE * 2) / 3;
        eventDiceSprite.x = 90;
        eventDiceSprite.y = -SIZE + 10;
        diceContainer.addChild(eventDiceSprite);
        eventDiceSprite.addChild(eventDiceInner);
        eventDiceSprite.addChild(getBorder((SIZE * 2) / 3));
    }

    assets.assignTexture(redDiceInner, assets.diceRed[redRoll]);
    assets.assignTexture(whiteDiceInner, assets.diceWhite[whiteRoll]);

    if (eventRoll) {
        eventRoll = Math.min(4, eventRoll);
        assets.assignTexture(eventDiceInner, assets.diceEvent[eventRoll]);
    }

    canvas.app.markDirty();
}

const diceFlashFun = (delta: number) => {
    if (!diceContainer || diceContainer.destroyed) return;

    (<number>redDiceInner.tint) -= 0x111111;
    if (<number>redDiceInner.tint < 0x666666) {
        redDiceInner.tint = 0xffffff;
    }
    whiteDiceInner.tint = redDiceInner.tint;

    diceContainer.render(canvas.app.renderer as PIXI.Renderer);
};

let flashing = false;

/**
 * Set the flashing state of the dice.
 * @param flash True to flash the dice, false to stop flashing
 */
export function setFlashing(flash: boolean) {
    redDiceInner.interactive = flash;

    if (stopFlashTimer) {
        window.clearTimeout(stopFlashTimer);
        stopFlashTimer = 0;
    }

    if (flash) {
        if (!flashing) {
            flashing = true;
            canvas.app.slowTicker.add(diceFlashFun);
        }
    } else {
        flashing = false;
        canvas.app.slowTicker.remove(diceFlashFun);

        if (diceContainer && !diceContainer.destroyed) {
            redDiceInner.tint = 0xcccccc;
            whiteDiceInner.tint = 0xcccccc;
        }
    }

    canvas.app.markDirty();
}

/**
 * Render the dice roll state and play sound.
 * @param redRoll Red die roll
 * @param whiteRoll White die roll
 * @param eventRoll Event die roll
 */
export async function rolled(
    redRoll: number,
    whiteRoll: number,
    eventRoll: number,
) {
    render(redRoll, whiteRoll, eventRoll);
    sound.play("soundDice");
}

/**
 * Handle the dice roll state message.
 * @param diceResp Dice roll response
 * @returns {void}
 */
export function handleMessage(diceResp: DieRollState) {
    if (diceResp.IsInit) {
        render(diceResp.RedRoll, diceResp.WhiteRoll, diceResp.EventRoll);
        return;
    }

    state.addPendingCardMoves(diceResp.GainInfo);
    rolled(diceResp.RedRoll, diceResp.WhiteRoll, diceResp.EventRoll);
    board.flashTile(diceResp.RedRoll + diceResp.WhiteRoll);
    actions.clearChooseDice();

    if (buttons.buttons.improveBox) {
        buttons.buttons.improveBox.callback = undefined;
    }
}
