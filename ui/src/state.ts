import * as PIXI from "pixi.js";
import * as assets from "./assets";
import * as canvas from "./canvas";
import * as chat from "./chat";
import * as buttons from "./buttons";
import * as board from "./board";
import * as hand from "./hand";
import * as anim from "./animation";
import * as actions from "./actions";
import * as windows from "./windows";
import * as trade from "./trade";
import { sound } from "@pixi/sound";
import { cancelPendingAction } from "./actions";
import { getThisPlayerOrder } from "./ws";
import {
    CardMoveInfo,
    GameSettings,
    GameState,
    PlayerAction,
    PlayerState,
} from "../tsg";
import { CardType } from "./entities";
import CommandHub from "./commands";
import { hexToUrlString } from "../utils";

type InitializableSprite = PIXI.Sprite & { initialized?: boolean };

// Players
let container: PIXI.Container;
type IconText = { img: PIXI.Sprite; text: PIXI.Text };
export let players: {
    bg: PIXI.Graphics;

    avatar: InitializableSprite & { dirty?: boolean };
    name: PIXI.Text;
    victoryPoint: IconText;
    road: IconText;
    cards: IconText;
    dcard: IconText;
    knights: IconText;
    bot: PIXI.Sprite;
    improvements: { [key: number]: PIXI.Sprite[] };
}[];

// Bank
export let bankContainer: PIXI.Container;

// Barbarian
let barbarianContainer: PIXI.Container;
let barbarianSprite: PIXI.Container & anim.Translatable;
let barbarianStrength: PIXI.Sprite;
let barbarianKnights: PIXI.Sprite;

// Pending action
let pendingActionContainer: PIXI.Container;
let pendingActionText: PIXI.Text;
let pendingActionCancel: buttons.ButtonSprite;
let currentPendingAction: Partial<PlayerAction> | undefined;

// Persistent state
export let lastKnownStates: PlayerState[] | null = null;
export let lastKnownGameState: GameState | null = null;
let lastKnownSecretVictoryPoints: number = 0;

const WINDOW_WIDTH = 250;
let WINDOW_SCALE = 1.08;

export enum GameMode {
    Base = 1,
    CitiesAndKnights = 2,
}

// Game settings
export let settings: GameSettings;

export function setSettings(s: GameSettings) {
    settings = s;
}

/**
 * Initialize the players list UI
 * @param commandHub Command hub
 */
function intialize(commandHub: CommandHub) {
    // State window
    const WINDOW_HEIGHT = lastKnownStates!.length * 80 + 15;

    players = new Array(6);
    if ((lastKnownStates?.length || 4) > 4) {
        WINDOW_SCALE = 1;
    }

    container = new PIXI.Container();
    container.x = canvas.getWidth() - WINDOW_WIDTH * WINDOW_SCALE - 20;
    container.y = 20;
    container.cacheAsBitmapResolution = 2;
    container.cacheAsBitmapMultisample = PIXI.MSAA_QUALITY.HIGH;
    canvas.app.stage.addChild(container);
    container.scale.set(WINDOW_SCALE);

    // Window
    container.addChild(windows.getWindowSprite(WINDOW_WIDTH, WINDOW_HEIGHT));

    // Pending action window
    pendingActionContainer = new PIXI.Container();
    pendingActionContainer.x = 20;
    pendingActionContainer.y = 20;
    pendingActionContainer.zIndex = 1300;
    pendingActionContainer.visible = false;

    pendingActionText = new PIXI.Text("", {
        fontFamily: "sans-serif",
        fontSize: 20,
        fill: 0x000000,
        align: "left",
    });
    pendingActionText.x = 10;
    pendingActionText.y = 20;
    pendingActionText.anchor.y = 0.5;

    pendingActionContainer.addChild(windows.getWindowSprite(450, 40));
    pendingActionContainer.addChild(pendingActionText);
    canvas.app.stage.addChild(pendingActionContainer);

    pendingActionCancel = buttons.getButtonSprite(buttons.ButtonType.No, 38);
    pendingActionCancel.x = pendingActionContainer.width - 40;
    pendingActionCancel.y = 1;
    pendingActionCancel.anchor.x = 0;
    pendingActionCancel.interactive = true;
    pendingActionCancel.cursor = "pointer";
    pendingActionCancel.setEnabled(true);
    pendingActionCancel.on("pointerdown", cancelPendingAction);
    pendingActionContainer.addChild(pendingActionCancel);

    // Render buttons here so we know the player's color
    buttons.render(commandHub);
    chat.initialize();
    trade.initialize();

    bankContainer = new PIXI.Container();
    bankContainer.addChild(windows.getWindowSprite(90, 90));
    const bankSprite = new PIXI.Sprite();
    assets.assignTexture(bankSprite, assets.bank);
    bankSprite.scale.set(0.2);
    bankSprite.anchor.x = 0.5;
    bankSprite.anchor.y = 0.5;
    bankSprite.x = 45;
    bankSprite.y = 45;
    bankContainer.x = canvas.getWidth() - 20 - 90;
    bankContainer.y = WINDOW_HEIGHT * WINDOW_SCALE + container.y + 20;
    bankContainer.zIndex = 900;
    bankContainer.addChild(bankSprite);
    canvas.app.stage.addChild(bankContainer);

    canvas.app.slowTicker.add(() => {
        if (!lastKnownStates || !container) return;

        for (const state of lastKnownStates) {
            const avatar = players[state.Order]?.avatar;

            if (!state.HasPendingAction || avatar.alpha < 0.9) {
                if (avatar.dirty) {
                    avatar.dirty = false;
                    canvas.app.markClean(avatar);
                }
                continue;
            }

            (<number>avatar.tint) -= 0x111111;
            if (<number>avatar.tint < 0x444444) {
                avatar.tint = 0xffffff;
            }

            canvas.app.renderRecursive(avatar);

            if (!avatar.dirty) {
                avatar.dirty = true;
                canvas.app.markDirty(avatar);
            }
        }
    });
}

/**
 * Invalidate the cache of player list
 */
function rerender() {
    canvas.app.invalidateBitmapCache(container);
}

/**
 * Render the player list and game state
 * @param gs Game state
 * @param commandHub Command hub
 */
export function renderGameState(gs: GameState, commandHub: CommandHub) {
    const states = gs.PlayerStates;
    lastKnownStates = states;

    if (lastKnownGameState) {
        // Chime cause its your turn
        if (
            gs.CurrentPlayerOrder == getThisPlayerOrder() &&
            lastKnownGameState.CurrentPlayerOrder != getThisPlayerOrder()
        ) {
            sound.play("soundRing");
        }

        // Close boxes if its no longer your turn
        if (
            gs.CurrentPlayerOrder != getThisPlayerOrder() &&
            lastKnownGameState.CurrentPlayerOrder == getThisPlayerOrder()
        ) {
            if (buttons.buttons.improveBox) {
                buttons.buttons.improveBox.container.visible = false;
            }
            if (buttons.buttons.knightBox) {
                buttons.buttons.knightBox.container.visible = false;
            }
        }
    }
    lastKnownGameState = gs;

    if (!container || container.destroyed) {
        intialize(commandHub);
    }

    states.forEach((state) => {
        // Clear pending action if not found
        if (state.Order === getThisPlayerOrder()) {
            if (!state.HasPendingAction) {
                actions.resetPendingAction();
            }
        }

        // Initialize state sprite
        if (!players[state.Order]) {
            players[state.Order] = {} as any;
            const spriteset = players[state.Order];

            const offset = state.Order * 80;

            {
                const g = new PIXI.Graphics();
                g.beginFill(0xaaaaaa);
                g.alpha = 0.5;
                g.drawRect(0, 8 + offset, WINDOW_WIDTH - 2, 79);
                g.endFill();
                container.addChild(g);
                spriteset.bg = g;
                g.visible = false;
            }

            spriteset.avatar = getPlayerAvatarSprite(state.Order, rerender);
            spriteset.avatar.x = 17;
            spriteset.avatar.y = 17 + offset;
            spriteset.avatar.on("pointerdown", (e) =>
                playerClickEvent?.(e, state.Order),
            );
            container.addChild(spriteset.avatar);

            const createText = (
                x: number,
                y: number,
                icon: assets.ICON,
                title: string,
            ) => {
                const imgc = new PIXI.Container();
                imgc.interactive = true;
                imgc.x = x;
                imgc.y = y + offset;
                new windows.TooltipHandler(imgc, title);
                container.addChild(imgc);

                const img = new PIXI.Sprite();
                assets.assignTexture(img, assets.icons[icon]);
                img.scale.set(0.09);
                img.anchor.y = 0.5;
                imgc.addChild(img);

                const text = new PIXI.Text(``, {
                    fontFamily: "sans-serif",
                    fontSize: 16,
                    fill: 0x000000,
                    align: "left",
                });
                text.x = 25;
                text.anchor.y = 0.5;
                text.y = 1;
                imgc.addChild(text);
                return { img, text };
            };

            // User name
            spriteset.name = new PIXI.Text(state.Username, {
                fontFamily: "sans-serif",
                fontSize: 13,
                fill: 0x000000,
                align: "left",
                fontWeight: "bold",
            });
            spriteset.name.x = 72;
            spriteset.name.y = 12 + offset;
            container.addChild(spriteset.name);

            // Bot identifier
            spriteset.bot = new PIXI.Sprite();
            assets.assignTexture(spriteset.bot, assets.bot);
            spriteset.bot.scale.set(0.13);
            spriteset.bot.anchor.y = 0.5;
            spriteset.bot.x = spriteset.name.x + spriteset.name.width + 4;
            spriteset.bot.y = spriteset.name.y + spriteset.name.height / 2;
            spriteset.bot.visible = false;
            container.addChild(spriteset.bot);

            const baseX = -5;
            spriteset.victoryPoint = createText(
                baseX + 75,
                40,
                assets.ICON.VP,
                "Current number of victory points of the player",
            );
            spriteset.road = createText(
                baseX + 135,
                40,
                assets.ICON.ROAD,
                "Length of the longest road of this player",
            );
            spriteset.knights = createText(
                baseX + 190,
                40,
                assets.ICON.KNIGHT,
                "Active number of Warriors with allegiance to this player",
            );
            spriteset.cards = createText(
                baseX + 72,
                66,
                assets.ICON.CARDS,
                "Number of resource cards this player currently holds",
            );
            spriteset.dcard = createText(
                baseX + 134,
                66,
                assets.ICON.DCARD,
                "Number of action cards this player currently holds",
            );

            // City improvements
            if (settings.Mode == GameMode.CitiesAndKnights) {
                const p = players[state.Order];
                p.improvements = {};

                let j = 0;
                for (const t of [
                    [CardType.Paper, 0x00aa00],
                    [CardType.Cloth, 0xf7c12a],
                    [CardType.Coin, 0x0000aa],
                ]) {
                    p.improvements[t[0]] = [];

                    for (let i = 0; i < 5; i++) {
                        const g = new PIXI.Graphics()
                            .beginFill(t[1])
                            .drawRoundedRect(0, 0, 6, 6, 1)
                            .endFill();
                        const tex = canvas.app.generateRenderTexture(g);

                        const s = new PIXI.Sprite(tex);
                        s.x = baseX + 188 + 8 * i;
                        s.y = 8 * j + 56 + offset;
                        container.addChild(s);
                        s.alpha = 0.15;

                        p.improvements[t[0]].push(s);
                    }

                    j++;
                }
            }
        }

        const vp =
            getThisPlayerOrder() == state.Order
                ? Math.max(lastKnownSecretVictoryPoints, state.VictoryPoints)
                : state.VictoryPoints;

        const p = players[state.Order];
        p.victoryPoint.text.text = `${vp}`;
        p.road.text.text = `${state.LongestRoad}`;
        p.knights.text.text = `${state.Knights}`;
        p.cards.text.text = `${state.NumCards}`;
        p.dcard.text.text = `${state.NumDevelopmentCards}`;
        p.bg.visible = state.Current;
        p.bot.visible = !!state.IsBot;

        // Highlight extra points
        if (state.HasLongestRoad) {
            p.road.img.tint = 0xc99200;
            p.road.text.style.fill = 0xc99200;
        } else {
            p.road.img.tint = 0x000000;
            p.road.text.style.fill = 0x000000;
        }

        // Highlight extra points / most active knights
        if (state.HasLargestArmy) {
            p.knights.img.tint = 0xc99200;
            p.knights.text.style.fill = 0xc99200;
        } else {
            p.knights.img.tint = 0x000000;
            p.knights.text.style.fill = 0x000000;
        }

        // Highlight too many cards
        if (state.NumCards > state.DiscardLimit) {
            p.cards.img.tint = 0xdd0000;
            p.cards.text.style.fill = 0xdd0000;
        } else {
            p.cards.img.tint = 0x000000;
            p.cards.text.style.fill = 0x000000;
        }

        if (settings.Mode == GameMode.CitiesAndKnights) {
            Object.keys(state.Improvements).forEach((k) => {
                if (p.improvements[Number(k)]) {
                    for (let i = 0; i < state.Improvements[Number(k)]!; i++) {
                        p.improvements[Number(k)][i].alpha = 1;
                    }
                }

                if (state.Order == getThisPlayerOrder()) {
                    const ib = buttons.buttons.improveBox!;
                    let key: keyof typeof ib;
                    switch (Number(k)) {
                        case CardType.Paper:
                            key = "paper";
                            break;
                        case CardType.Cloth:
                            key = "cloth";
                            break;
                        case CardType.Coin:
                            key = "coin";
                            break;
                        default:
                            key = "paper";
                    }
                    const buttonSprite = <buttons.ButtonSprite>(
                        buttons.buttons.improveBox![key]
                    );
                    buttonSprite.tooltip!.setCards(
                        new Array(
                            (state.Improvements[Number(k)] ?? 0) + 1,
                        ).fill(Number(k)),
                    );
                }
            });
        }

        if (!state.HasPendingAction) {
            players[state.Order].avatar.tint = 0xffffff;
        }
    });

    renderTimers(); // implicitly calls rerender
    renderBarbarian(gs);
}

/**
 * Show a pending action for this player
 * @param action Action to render
 */
export function showPendingAction(action?: Partial<PlayerAction>) {
    canvas.app.markDirty();
    pendingActionText.text = action?.Message || "";
    pendingActionContainer.visible = Boolean(action?.Message);
    pendingActionCancel.visible = Boolean(action?.CanCancel);

    if (
        action &&
        !currentPendingAction &&
        lastKnownStates &&
        !lastKnownStates[getThisPlayerOrder()]?.Current
    ) {
        sound.play("soundRing");
    }

    currentPendingAction = action;
}

type PlayerClickEvent = (event: any, order: number) => void;
let playerClickEvent: PlayerClickEvent | null = null;

/**
 * Set the event handler for when a player avatar is clicked
 * @param e Click event
 */
export function setPlayerClickEvent(e: PlayerClickEvent | null) {
    playerClickEvent = e;
}

/**
 * Highlight players to click on
 * @param boolmatrix boolean matrix of player clickability
 */
export function highlightPlayers(boolmatrix?: boolean[]) {
    canvas.app.markDirty();
    for (let i = 0; i < (boolmatrix?.length ?? players.length); i++) {
        if (!players[i]?.avatar) {
            continue;
        }

        players[i].avatar.alpha = boolmatrix?.[i] ?? true ? 1 : 0.5;
        players[i].avatar.tint = boolmatrix?.[i] ?? true ? 0xffffff : 0x333333;
        players[i].avatar.cursor = Boolean(boolmatrix?.[i])
            ? "pointer"
            : "default";
        players[i].avatar.interactive = Boolean(boolmatrix?.[i]);
    }
    rerender();
}

/**
 * Get the avatar image for a player
 * @param order player order
 * @param rendered callback after image is rendered
 */
export function getPlayerAvatarSprite(order: number, rendered?: () => void) {
    const button: InitializableSprite = new PIXI.Sprite();
    const color = lastKnownStates ? lastKnownStates[order].Color : "black";
    const randInt = lastKnownStates ? lastKnownStates[order].RandInt : 10;
    const cstr = hexToUrlString(color);

    const variant = Math.ceil((randInt / 10000) * 5);
    PIXI.Texture.fromURL(`/assets/avatars/${cstr}/${variant}.jpg`).then((t) => {
        if (button.destroyed) return;

        // main avatar image
        button.texture = t;

        // black border
        const border = new PIXI.Graphics();
        border.lineStyle({ color: 0, width: 15 });
        border.beginFill(0, 0);
        border.drawRoundedRect(0, 0, 400, 600, 40);
        border.endFill();
        button.addChild(border);

        // set scale and flags
        button.scale.set(0.1);
        button.initialized = true;
        canvas.app.markDirty();
        rendered?.();
    });
    return button;
}

/** Animation from tiles to hand */
let pendingCardMoves: CardMoveInfo[] = [];

/**
 * Add pending animation moves for cards
 * @param moves list of move infos
 */
export function addPendingCardMoves(moves: CardMoveInfo[]) {
    if (!moves) return;

    const gainSprites: anim.TranslatableSprite[] = [];

    for (const m of moves) {
        if (!m || m.CardType < 0) continue;

        if (m.GainerOrder === getThisPlayerOrder()) {
            pendingCardMoves.push(m);
            continue;
        }

        for (let i = 0; i < m.Quantity; i++) {
            const gainSprite: anim.TranslatableSprite = new PIXI.Sprite();
            gainSprites.push(gainSprite);

            hand.getCardTexture(m.CardType, gainSprite);

            let avatar: PIXI.Container;
            if (m.GainerOrder >= 0) {
                avatar = players[m.GainerOrder].avatar;
            } else {
                avatar = bankContainer;
            }

            if (avatar) {
                const pos = avatar.getGlobalPosition();
                gainSprite.targetX = pos.x;
                gainSprite.targetY = pos.y;
            }

            let source: PIXI.Container | undefined;

            if (m.Tile) {
                source =
                    board.getBoard().tiles[board.coordStr(m.Tile.Center)]
                        .sprite!;
            } else if (m.GiverOrder == getThisPlayerOrder()) {
                const card = hand.handWindow!.cardSprites[m.CardType][0];
                source = card!;
            } else if (m.GiverOrder >= 0) {
                const player = players[m.GiverOrder]?.avatar;
                if (player) {
                    source = player;
                }
            } else {
                source = bankContainer;
            }

            if (source) {
                const sourcePos = source.getGlobalPosition();
                gainSprite.x = sourcePos.x;
                gainSprite.y = sourcePos.y;
            }

            // Trickery to capture context inside for loop
            gainSprite.pauseAnim = true;
            setTimerForCardAnim(
                source,
                ((gs: any) => () => {
                    gs.pauseAnim = false;
                })(gainSprite),
            );

            canvas.app.stage.addChild(gainSprite);
        }
    }

    anim.requestTranslationAnimation(gainSprites, 6, (sprite) => {
        sprite?.destroy({ children: true });
        canvas.app.markDirty();
    });
}

/**
 * Get the pending card moves
 */
export function getPendingCardMoves() {
    return pendingCardMoves;
}

/**
 * Decrement the pending card moves for this type by one.
 * If there are no more moves, remove the card from the pending moves.
 * @param g card move info
 */
export function deductPendingCardMoves(g: CardMoveInfo) {
    g.Quantity--;
    if (g.Quantity <= 0) {
        pendingCardMoves.splice(pendingCardMoves.indexOf(g), 1);
    }
}

/**
 * Set a timer increasing for a source to separate cards
 * @param source Source of the card
 * @param callback Set pause anim to false in the callback
 * @returns void
 */
export function setTimerForCardAnim(source: any, callback: () => void) {
    if (!source) return callback();

    const s = <{ sourceAnimCount: number }>source;

    if (s.sourceAnimCount === undefined) {
        s.sourceAnimCount = 0;
    }

    s.sourceAnimCount++;

    window.setTimeout(() => {
        s.sourceAnimCount--;
        callback();
    }, s.sourceAnimCount * 75);
}

// If something doesn't go right, clear every 2 seconds
window.setInterval(() => {
    pendingCardMoves = [];
}, 2000);

// Timer values
let timerOverlays: PIXI.Container[] = [];

/**
 * Render the timer overlay for each avatar
 */
export function renderTimers() {
    if (!lastKnownStates || !container || container.destroyed) return;

    timerOverlays.forEach((s) => (s && !s.destroyed ? s.destroy() : undefined));
    timerOverlays = [];

    for (const s of lastKnownStates) {
        const spriteset = players[s.Order];
        if (!spriteset?.avatar?.initialized) continue;

        if (s.TimeLeft > 0) {
            s.TimeLeft -= 1;
        } else {
            continue;
        }

        const time = s.TimeLeft;
        const minutes = Math.floor(time / 60);
        const seconds = time % 60;
        const timeString = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

        const text = new PIXI.Text(timeString, {
            fontSize: 120,
            fontWeight: "bold",
            fill: 0xffffff,
        });
        text.anchor.x = 0.5;
        text.anchor.y = 1;
        text.x = 200;
        text.y = 600;
        text.zIndex = 100;

        const g = new PIXI.Graphics()
            .beginFill(0x000000, 0.6)
            .drawRoundedRect(0, text.y - text.height, 400, text.height, 40)
            .endFill();
        g.addChild(text);
        spriteset.avatar.addChild(g);
        timerOverlays.push(g);
    }

    rerender();
    canvas.app.markDirty();
}
window.setInterval(renderTimers, 1000);

/**
 * Store the victory points of the current player.
 * These may be hidden from other players in basic complexity.
 * @param vp Victory points
 */
export function setLastKnownSecretVictoryPoints(vp: number) {
    lastKnownSecretVictoryPoints = vp;
}

/**
 * Render the barbarian sprites
 * @param gs Game state
 */
function renderBarbarian(gs: GameState) {
    if (gs.BarbarianPosition === -1) {
        return;
    }

    if (!barbarianContainer || barbarianContainer.destroyed) {
        barbarianContainer = new PIXI.Container();
        canvas.app.stage.addChild(barbarianContainer);

        const trackSprite = new PIXI.Sprite();
        assets.assignTexture(trackSprite, assets.barbarianTrack);
        barbarianContainer.x = 20;
        barbarianContainer.y = 60;
        barbarianContainer.addChild(trackSprite);
        trackSprite.scale.set(60 / trackSprite.width);

        barbarianSprite = new PIXI.Container();
        const shipSprite = new PIXI.Sprite();
        assets.assignTexture(shipSprite, assets.barbarianShip);
        shipSprite.scale.set(0.25);
        barbarianSprite.addChild(shipSprite);
        barbarianSprite.x = 30;
        barbarianSprite.pivot.x = shipSprite.width / 2;
        barbarianSprite.pivot.y = shipSprite.height * 0.8;
        barbarianContainer.addChild(barbarianSprite);
    }

    barbarianSprite.targetY = (1030 - 70 - gs.BarbarianPosition * 126) * 0.33;
    anim.requestTranslationAnimation([barbarianSprite]);

    if (barbarianStrength && !barbarianStrength.destroyed) {
        barbarianStrength?.destroy({ children: true });
        barbarianKnights?.destroy({ children: true });
    }

    {
        const style = new PIXI.TextStyle({
            fontSize: 13,
            fill: 0xffffff,
            align: "center",
        });

        {
            // Barbarian strength
            barbarianStrength = new PIXI.Sprite();
            barbarianStrength.x = 35;

            const text = new PIXI.Text(`${gs.BarbarianStrength}`, style);
            barbarianStrength.addChild(text);
            text.x = 10;
            text.y = 10;
            text.anchor.x = 0.5;
            text.anchor.y = 0.5;

            const g = new PIXI.Graphics()
                .beginFill(0x444444)
                .drawRoundedRect(0, 0, 20, 20, 4)
                .endFill();
            barbarianStrength.texture = canvas.app.generateRenderTexture(g);
            barbarianSprite.addChild(barbarianStrength);
        }

        {
            // Barbarian knights
            barbarianKnights = new PIXI.Sprite();
            barbarianKnights.x = 58;

            const text = new PIXI.Text(`${gs.BarbarianKnights}`, style);
            barbarianKnights.addChild(text);
            text.x = 10;
            text.y = 10;
            text.anchor.x = 0.5;
            text.anchor.y = 0.5;

            const g = new PIXI.Graphics()
                .beginFill(
                    gs.BarbarianKnights < gs.BarbarianStrength
                        ? 0xaa0000
                        : 0x00aa00,
                )
                .drawRoundedRect(0, 0, 20, 20, 4)
                .endFill();
            barbarianKnights.texture = canvas.app.generateRenderTexture(g);
            barbarianSprite.addChild(barbarianKnights);
        }
    }
}

/**
 * Spectator sprite set
 */
let spectators: {
    container: PIXI.Container;
    icon: PIXI.Sprite;
    text: PIXI.Text;
    tooltip: windows.TooltipHandler;
};

/**
 * Render the spectators icon and tooltip
 * @param list List of spectator usernames
 */
export function renderSpectators(list: string[]) {
    if (!spectators || spectators.icon.destroyed) {
        const container = new PIXI.Container();
        spectators = {
            container: container,
            icon: new PIXI.Sprite(),
            text: new PIXI.Text(
                "",
                new PIXI.TextStyle({
                    fontSize: 20,
                }),
            ),
            tooltip: new windows.TooltipHandler(container, ""),
        };

        assets.assignTexture(spectators.icon, assets.spectate);
        spectators.icon.scale.set(0.3);
        spectators.icon.y = 6;
        spectators.text.x = 35;

        container.addChild(spectators.icon);
        container.addChild(spectators.text);
        container.x = 60;
        container.y = 20;
        container.zIndex = 1;
        container.interactive = true;
        canvas.app.stage.addChild(container);
    }

    spectators.container.visible = list.length > 0;
    spectators.text.text = String(list.length);
    spectators.tooltip.message = `${list.join(", ")} ${
        list.length > 1 ? "are" : "is"
    } spectating`;
    spectators.tooltip.hide();
    canvas.app.markDirty();
}
