import * as PIXI from "pixi.js";
import * as canvas from "./canvas";
import * as trade from "./trade";
import * as ws from "./ws";
import * as state from "./state";
import * as assets from "./assets";
import * as windows from "./windows";
import { BuildableType, CardType } from "./entities";
import CommandHub from "./commands";
import { PlayerSecretState } from "../tsg";
import { hexToUrlString } from "../utils";

/** Main button container */
export let container: PIXI.Container;

/** Secondary button container */
let container1: PIXI.Container;

/** Static button sprites */
export let buttons: {
    buildSettlement: ButtonSprite;
    buildRoad: ButtonSprite;
    buildCity: ButtonSprite;
    buyDevelopmentCard?: ButtonSprite;
    openKnightBox?: ButtonSprite;
    endTurn: ButtonSprite;

    knightBox?: {
        container: PIXI.Sprite;
        buildKnight: ButtonSprite;
        activateKnight: ButtonSprite;
        robberKnight: ButtonSprite;
        moveKnight: ButtonSprite;
    };
    openImproveBox?: ButtonSprite;
    improveBox?: {
        container: PIXI.Sprite;
        paper: ButtonSprite;
        cloth: ButtonSprite;
        coin: ButtonSprite;
        callback?: (c: CardType) => void;
    };

    buildWall?: ButtonSprite;
    specialBuild?: ButtonSprite;
};

export enum ButtonType {
    Yes = "yes",
    No = "no",
    Settlement = "settlement",
    City = "city",
    Road = "road",
    DevelopmentCard = "dcard",
    KnightBox = "knight",
    KnightBuild = "knight_build",
    KnightActivate = "knight_activate",
    KnightRobber = "knight_robber",
    KnightMove = "knight_move",
    CityImprove = "improve",
    CityImprovePaper = "improve_paper",
    CityImproveCloth = "improve_cloth",
    CityImproveCoin = "improve_coin",
    Wall = "w",
    EndTurn = "endturn",
    SpecialBuild = "specialbuild",
    Edit = "edit",
    Fullscreen = "fullscreen",
    Chat = "chat",
}

/** Counts for number of buildables left */
export const buttonCounts: {
    [key in ButtonType]?: { sprite: PIXI.Sprite; text: PIXI.Text };
} = {};

export type ButtonSprite = PIXI.Sprite & {
    setBgColor?: (color: string) => void;
    setEnabled: (enabled: boolean | undefined, tintOnly?: boolean) => void;
    onClick: (callback: ((button: ButtonSprite) => void) | undefined) => void;
    reactDisable?: boolean;
    reEnableTimer?: number;
    tooltip?: windows.TooltipHandler;
};

/** Invalidate cache */
function rerender() {
    // Originally: invalidate bitmap cache
}

/**
 * Create a new button sprite
 * @param type button type
 * @param width width of button
 * @param height height of button
 * @param bgColor background color of button
 * @param done callback when button graphic is initialized
 * @param mask shape of button mask
 * @returns
 */
export function getButtonSprite(
    type: ButtonType,
    width: number,
    height?: number,
    bgColor?: string,
    done?: () => void,
    mask: "circle" | "rounded-rect" = "rounded-rect",
): ButtonSprite {
    const s = new PIXI.Sprite();
    const outer = <ButtonSprite>s;
    s.interactive = true;
    outer.setEnabled = (enabled: boolean | undefined, tintOnly?: boolean) => {
        if (outer.reEnableTimer) {
            window.clearTimeout(outer.reEnableTimer);
            outer.reEnableTimer = 0;
        }
        setButtonEnabled(outer, Boolean(enabled), tintOnly);
        outer.tooltip?.hide();
    };

    outer.onClick = (callback) => {
        outer.on("pointerdown", (e) => {
            if (outer.cursor !== "pointer") {
                return;
            }

            if (outer.tooltip) {
                outer.tooltip.hide();
            }

            if (outer.cursor === "pointer" && outer.reactDisable) {
                // is enabled
                setButtonEnabled(outer, false);
                outer.reEnableTimer = window.setTimeout(() => {
                    if (!outer.destroyed) {
                        setButtonEnabled(outer, true);
                    }
                }, 2000);
            }

            e.stopPropagation();
            callback?.(outer);
        });
    };

    const simg = assets.buttons[type];
    const h = height || (width / simg.width) * simg.height;

    const drawShape = (g: PIXI.Graphics) => {
        switch (mask) {
            case "rounded-rect":
                g.drawRoundedRect(
                    0,
                    0,
                    simg.width,
                    simg.height,
                    simg.width / 10,
                );
                break;
            case "circle":
                g.drawCircle(
                    simg.width / 2,
                    simg.width / 2,
                    Math.min(simg.width, simg.width) / 2,
                );
                break;
        }
    };

    const bg = new PIXI.Sprite();
    bg.scale.set(width / simg.width, h / simg.height);
    outer.addChild(bg);

    outer.setBgColor = (color: string) => {
        const cText = hexToUrlString(color);
        assets.assignTexture(bg, assets.buttonsBg[cText], () => {
            const g = new PIXI.Graphics();
            g.beginTextureFill({
                texture: bg.texture,
            });
            drawShape(g);
            g.endFill();
            bg.texture = canvas.app.generateRenderTexture(g);
        });
    };

    if (bgColor) {
        outer.setBgColor(bgColor);
    }

    const image = new PIXI.Sprite();
    outer.addChild(image);
    assets.assignTexture(image, simg, () => {
        const g = new PIXI.Graphics();
        g.beginTextureFill({ texture: image.texture });
        drawShape(g);
        g.endFill();
        image.texture = canvas.app.generateRenderTexture(g);
    });
    image.scale.set(width / simg.width, h / simg.height);
    image.zIndex = 1;

    outer.setEnabled(outer.cursor === "pointer");

    if (!bgColor) {
        done?.();
    }

    return outer;
}

/**
 * Create count sprite for button
 * @param width width of count
 * @param height height of count
 * @param fontsize font size of count
 */
export function getCountSprite(
    width: number,
    height: number,
    fontsize: number,
) {
    const sprite = new PIXI.Sprite();
    const g = new PIXI.Graphics()
        .beginFill(0x064dd1)
        .drawRoundedRect(0, 0, width, height, 4)
        .endFill();
    sprite.texture = canvas.app.generateRenderTexture(g);

    const text = new PIXI.Text("0", {
        fontFamily: "sans-serif",
        fontSize: fontsize,
        fill: 0xffffff,
        align: "center",
    });
    text.y = height / 2;
    text.x = -width / 2;
    text.zIndex = 2;
    text.anchor.x = 0.5;
    text.anchor.y = 0.5;
    sprite.addChild(text);

    return { sprite, text };
}

/**
 * Render all the buttons.
 * Since this depends on game mode, must be called
 * only after state is initialized
 * @param commandHub Command hub
 */
export function render(commandHub: CommandHub) {
    const lks = state.lastKnownStates?.[ws.getThisPlayerOrder()];

    const BUTTON_WIDTH = 66,
        BUTTON_Y = 12,
        BUTTON_X_DELTA = 74,
        COUNT_WIDTH = 20,
        COUNT_HEIGHT = 19,
        COUNT_FONTSIZE = 13,
        C_HEIGHT = 90;

    // Initialize sprites
    container = new PIXI.Container();
    buttons = {} as any;
    container.visible = !ws.isSpectator();

    // Get player's color
    const playerColor = lks?.Color || "#ff0000";

    // Container
    canvas.app.stage.addChild(container);
    container.on("removed", () => {
        state.lastKnownStates?.splice(0, state.lastKnownStates.length);
    });

    // Monkey patch to rerender
    const rerenderAnd = (callback: () => void) => () => {
        rerender();
        callback();
    };

    container.addChild(
        windows.getWindowSprite(
            BUTTON_Y * 2 + BUTTON_X_DELTA * 4 + BUTTON_WIDTH,
            C_HEIGHT,
        ),
    );
    container.x = canvas.getWidth() - (BUTTON_Y + BUTTON_X_DELTA * 5) - 30;
    container.y = canvas.getHeight() - 120;

    // Build settlement
    {
        buttons.buildSettlement = getButtonSprite(
            ButtonType.Settlement,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.buildSettlement.interactive = true;
        buttons.buildSettlement.cursor = "pointer";
        buttons.buildSettlement.reactDisable = true;
        buttons.buildSettlement.x = BUTTON_Y;
        buttons.buildSettlement.y = BUTTON_Y;
        buttons.buildSettlement.zIndex = 10;
        buttons.buildSettlement.onClick(
            rerenderAnd(commandHub.buildSettlement),
        );
        container.addChild(buttons.buildSettlement);
        const cs = getCountSprite(COUNT_WIDTH, COUNT_HEIGHT, COUNT_FONTSIZE);
        buttonCounts[ButtonType.Settlement] = cs;
        cs.sprite.anchor.x = 1;
        cs.sprite.x = BUTTON_WIDTH;
        cs.sprite.zIndex = 10;
        buttons.buildSettlement.sortableChildren = true;
        buttons.buildSettlement.addChild(cs.sprite);
        buttons.buildSettlement.tooltip = new windows.TooltipHandler(
            buttons.buildSettlement,
            "Build a village",
        ).setCards([1, 2, 3, 4]);
    }

    // Build city
    {
        buttons.buildCity = getButtonSprite(
            ButtonType.City,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.buildCity.interactive = true;
        buttons.buildCity.cursor = "pointer";
        buttons.buildCity.reactDisable = true;
        buttons.buildCity.x = BUTTON_Y + BUTTON_X_DELTA * 1;
        buttons.buildCity.y = BUTTON_Y;
        buttons.buildCity.zIndex = 10;
        buttons.buildCity.onClick(rerenderAnd(commandHub.buildCity));
        container.addChild(buttons.buildCity);
        const cs = getCountSprite(COUNT_WIDTH, COUNT_HEIGHT, COUNT_FONTSIZE);
        buttonCounts[ButtonType.City] = cs;
        cs.sprite.anchor.x = 1;
        cs.sprite.x = BUTTON_WIDTH;
        cs.sprite.zIndex = 10;
        buttons.buildCity.sortableChildren = true;
        buttons.buildCity.addChild(cs.sprite);
        buttons.buildCity.tooltip = new windows.TooltipHandler(
            buttons.buildCity,
            "Build a town",
        ).setCards([4, 4, 5, 5, 5]);
    }

    // Build road
    {
        buttons.buildRoad = getButtonSprite(
            ButtonType.Road,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.buildRoad.interactive = true;
        buttons.buildRoad.cursor = "pointer";
        buttons.buildRoad.reactDisable = true;
        buttons.buildRoad.x = BUTTON_Y + BUTTON_X_DELTA * 2;
        buttons.buildRoad.y = BUTTON_Y;
        buttons.buildRoad.zIndex = 10;
        buttons.buildRoad.onClick(rerenderAnd(commandHub.buildRoad));
        container.addChild(buttons.buildRoad);
        const cs = getCountSprite(COUNT_WIDTH, COUNT_HEIGHT, COUNT_FONTSIZE);
        buttonCounts[ButtonType.Road] = cs;
        cs.sprite.anchor.x = 1;
        cs.sprite.x = BUTTON_WIDTH;
        cs.sprite.zIndex = 10;
        buttons.buildRoad.sortableChildren = true;
        buttons.buildRoad.addChild(cs.sprite);
        buttons.buildRoad.tooltip = new windows.TooltipHandler(
            buttons.buildRoad,
            "Build a road",
        ).setCards([1, 2]);
    }

    // Buy Development Card
    if (state.settings.Mode == state.GameMode.Base) {
        buttons.buyDevelopmentCard = getButtonSprite(
            ButtonType.DevelopmentCard,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.buyDevelopmentCard.interactive = true;
        buttons.buyDevelopmentCard.cursor = "pointer";
        buttons.buyDevelopmentCard.reactDisable = true;
        buttons.buyDevelopmentCard.x = BUTTON_Y + BUTTON_X_DELTA * 3;
        buttons.buyDevelopmentCard.y = BUTTON_Y;
        buttons.buyDevelopmentCard.zIndex = 10;
        buttons.buyDevelopmentCard.onClick(
            rerenderAnd(commandHub.buyDevelopmentCard),
        );
        container.addChild(buttons.buyDevelopmentCard);
        buttons.buyDevelopmentCard.tooltip = new windows.TooltipHandler(
            buttons.buyDevelopmentCard,
            "Buy an action card",
        ).setCards([3, 4, 5]);
    }

    // Build wall
    if (state.settings.Mode == state.GameMode.CitiesAndKnights) {
        buttons.buildWall = getButtonSprite(
            ButtonType.Wall,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.buildWall.interactive = true;
        buttons.buildWall.cursor = "pointer";
        buttons.buildWall.reactDisable = true;
        buttons.buildWall.x = BUTTON_Y + BUTTON_X_DELTA * 3;
        buttons.buildWall.y = BUTTON_Y;
        buttons.buildWall.zIndex = 10;
        buttons.buildWall.onClick(rerenderAnd(commandHub.buildWall));
        container.addChild(buttons.buildWall);
        const cs = getCountSprite(COUNT_WIDTH, COUNT_HEIGHT, COUNT_FONTSIZE);
        buttonCounts[ButtonType.Wall] = cs;
        cs.sprite.anchor.x = 1;
        cs.sprite.x = BUTTON_WIDTH;
        cs.sprite.zIndex = 10;
        buttons.buildWall.sortableChildren = true;
        buttons.buildWall.addChild(cs.sprite);
        buttons.buildWall.tooltip = new windows.TooltipHandler(
            buttons.buildWall,
            "Buy a town fence",
        ).setCards([2, 2]);
    }

    // Second container
    if (state.settings.Mode == state.GameMode.CitiesAndKnights) {
        container1 = new PIXI.Container();
        container1.addChild(
            windows.getWindowSprite(
                BUTTON_X_DELTA * 1 + BUTTON_WIDTH + 2 * BUTTON_Y,
                C_HEIGHT,
            ),
        );

        container1.x = container.x + BUTTON_X_DELTA * 1 - 18;
        container1.y = container.y - C_HEIGHT - 10;
        container1.zIndex = 1300;
        container1.visible = !ws.isSpectator();
        canvas.app.stage.addChild(container1);
    }

    // Knight Box
    if (state.settings.Mode == state.GameMode.CitiesAndKnights) {
        buttons.openKnightBox = getButtonSprite(
            ButtonType.KnightBox,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.openKnightBox.setEnabled(true);
        buttons.openKnightBox.x = BUTTON_Y;
        buttons.openKnightBox.y = BUTTON_Y;
        buttons.openKnightBox.zIndex = 10;
        buttons.openKnightBox.onClick(() => {
            if (buttons.knightBox?.container) {
                buttons.knightBox.container.visible =
                    !buttons.knightBox.container.visible;
                if (
                    buttons.knightBox.container.visible &&
                    buttons.improveBox?.container
                ) {
                    buttons.improveBox.container.visible = false;
                }
            }
            canvas.app.markDirty();
        });
        container1.addChild(buttons.openKnightBox);
        buttons.openKnightBox.tooltip = new windows.TooltipHandler(
            buttons.openKnightBox,
            "Build, upgrade, activate and use Warriors",
        );

        // Knight box
        const kbc = windows.getWindowSprite(
            BUTTON_X_DELTA * 3 + BUTTON_Y * 2 + BUTTON_WIDTH,
            C_HEIGHT,
        );
        kbc.x = container.x + BUTTON_X_DELTA * 0;
        kbc.y = container1.y - C_HEIGHT - 10;
        kbc.zIndex = 1400;
        kbc.visible = false;
        canvas.app.stage.addChild(kbc);
        buttons.knightBox = {
            container: kbc,
        } as any;

        {
            // Knight build
            const b = getButtonSprite(
                ButtonType.KnightBuild,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.knightBox!.buildKnight = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.x = BUTTON_Y;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(commandHub.buildKnight));
            kbc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Build or upgrade a warrior",
            ).setCards([3, 5]);
        }

        {
            // Knight activate
            const b = getButtonSprite(
                ButtonType.KnightActivate,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.knightBox!.activateKnight = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.reactDisable = true;
            b.x = BUTTON_Y + BUTTON_X_DELTA * 1;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(commandHub.activateKnight));
            kbc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Activate a warrior",
            ).setCards([4]);
        }

        {
            // Knight robber
            const b = getButtonSprite(
                ButtonType.KnightRobber,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.knightBox!.robberKnight = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.reactDisable = true;
            b.x = BUTTON_Y + BUTTON_X_DELTA * 2;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(commandHub.robberKnight));
            kbc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Chase away the robber using a warrior",
            );
        }

        {
            // Knight move
            const b = getButtonSprite(
                ButtonType.KnightMove,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.knightBox!.moveKnight = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.reactDisable = true;
            b.x = BUTTON_Y + BUTTON_X_DELTA * 3;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(commandHub.moveKnight));
            kbc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Move a warrior to a different position",
            );
        }
    }

    // City improvement
    if (state.settings.Mode == state.GameMode.CitiesAndKnights) {
        const b = getButtonSprite(
            ButtonType.CityImprove,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.openImproveBox = b;
        b.setEnabled(true);
        b.x = BUTTON_Y + BUTTON_X_DELTA;
        b.y = BUTTON_Y;
        b.zIndex = 10;
        b.onClick(() => {
            if (buttons.improveBox?.container) {
                buttons.improveBox.container.visible =
                    !buttons.improveBox.container.visible;
                if (
                    buttons.improveBox.container.visible &&
                    buttons.knightBox?.container
                ) {
                    buttons.knightBox.container.visible = false;
                }
            }
            canvas.app.markDirty();
        });
        container1.addChild(b);
        b.tooltip = new windows.TooltipHandler(
            b,
            "Build improvements and wonders",
        );

        const ibc = windows.getWindowSprite(
            BUTTON_X_DELTA * 2 + BUTTON_WIDTH + 2 * BUTTON_Y,
            C_HEIGHT,
        );
        ibc.x = container.x + BUTTON_X_DELTA * 0;
        ibc.y = container1.y - C_HEIGHT - 10;
        ibc.zIndex = 1400;
        ibc.visible = false;
        canvas.app.stage.addChild(ibc);
        buttons.improveBox = {
            container: ibc,
        } as any;

        const clickImprove = (c: CardType) => {
            if (buttons.improveBox?.callback) {
                buttons.improveBox.callback(c);
            } else {
                commandHub.buildCityImprovement(c);
            }
        };

        {
            // Paper
            const b = getButtonSprite(
                ButtonType.CityImprovePaper,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.improveBox!.paper = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.reactDisable = true;
            b.x = BUTTON_Y;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(() => clickImprove(CardType.Paper)));
            ibc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Build scientific improvements",
            );
        }

        {
            // Cloth
            const b = getButtonSprite(
                ButtonType.CityImproveCloth,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.improveBox!.cloth = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.reactDisable = true;
            b.x = BUTTON_Y + BUTTON_X_DELTA;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(() => clickImprove(CardType.Cloth)));
            ibc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Build mercantile improvements",
            );
        }

        {
            // Coin
            const b = getButtonSprite(
                ButtonType.CityImproveCoin,
                BUTTON_WIDTH,
                0,
                playerColor,
                rerender,
            );
            buttons.improveBox!.coin = b;
            b.interactive = true;
            b.cursor = "pointer";
            b.reactDisable = true;
            b.x = BUTTON_Y + BUTTON_X_DELTA * 2;
            b.y = BUTTON_Y;
            b.zIndex = 10;
            b.onClick(rerenderAnd(() => clickImprove(CardType.Coin)));
            ibc.addChild(b);
            b.tooltip = new windows.TooltipHandler(
                b,
                "Build militaristic improvements",
            );
        }
    }

    // End Turn
    {
        buttons.endTurn = getButtonSprite(
            ButtonType.EndTurn,
            BUTTON_WIDTH,
            0,
            playerColor,
            rerender,
        );
        buttons.endTurn.interactive = true;
        buttons.endTurn.cursor = "pointer";
        buttons.endTurn.reactDisable = true;
        buttons.endTurn.x = BUTTON_Y + BUTTON_X_DELTA * 4;
        buttons.endTurn.y = BUTTON_Y;
        buttons.endTurn.zIndex = 10;
        buttons.endTurn.onClick(rerenderAnd(commandHub.endTurn));
        container.addChild(buttons.endTurn);
        buttons.endTurn.tooltip = new windows.TooltipHandler(
            buttons.endTurn,
            "End the current turn",
        );
    }

    // Special Build phase request
    if (state.settings.SpecialBuild) {
        const b = getButtonSprite(
            ButtonType.SpecialBuild,
            128 / 3,
            0,
            playerColor,
            rerender,
        );
        buttons.specialBuild = b;
        b.reactDisable = true;
        b.setEnabled(true);
        b.x = canvas.getWidth() - 40 - 100;
        b.y = canvas.getHeight() - 260;
        b.zIndex = 1000;
        b.onClick(rerenderAnd(commandHub.specialBuild));
        canvas.app.stage.addChild(b);
        b.tooltip = new windows.TooltipHandler(
            b,
            "Request a special build phase",
        );
    }
}

/**
 * Set the enabled state of the buttons.
 * @param sprite Button sprite
 * @param enabled Whether the button is enabled
 * @param tintOnly Do not change the sprite interactive state
 * @returns
 */
function setButtonEnabled(
    sprite: PIXI.Sprite | undefined,
    enabled: boolean,
    tintOnly = false,
) {
    if (!sprite || sprite.destroyed) {
        return;
    }

    if (!tintOnly) {
        sprite.cursor = enabled ? "pointer" : "default";
    }
    sprite.tint = enabled ? 0xffffff : 0x666666;

    // Recursively set tint to all children
    const setTint = (parent: any) => {
        parent.tint = sprite.tint;
        parent.children.forEach(setTint);
    };
    setTint(sprite);
}

/**
 * Update the enabled state of the buttons from player secret.
 * @param state Player state
 */
export function updateButtonsSecretState(state: PlayerSecretState) {
    for (const i in state.BuildablesLeft) {
        const t = Number(i) as BuildableType;
        const bt = (ButtonType as any)[BuildableType[t]] as ButtonType;

        if (buttonCounts[bt]) {
            buttonCounts[bt]!.text.text = `${state.BuildablesLeft[t]}`;
        }
    }

    buttons.buildSettlement.setEnabled(state.AllowedActions?.BuildSettlement);
    buttons.buildCity.setEnabled(state.AllowedActions?.BuildCity);
    buttons.buildRoad.setEnabled(state.AllowedActions?.BuildRoad);
    buttons.buyDevelopmentCard?.setEnabled(
        state.AllowedActions?.BuyDevelopmentCard,
    );
    buttons.endTurn.setEnabled(state.AllowedActions?.EndTurn);

    trade.setTradeAllowed(Boolean(state.AllowedActions?.Trade));

    // C&K
    buttons.knightBox?.buildKnight.setEnabled(
        state.AllowedActions?.BuildKnight,
    );
    buttons.knightBox?.activateKnight.setEnabled(
        state.AllowedActions?.ActivateKnight,
    );
    buttons.knightBox?.robberKnight.setEnabled(
        state.AllowedActions?.RobberKnight,
    );
    buttons.knightBox?.moveKnight.setEnabled(state.AllowedActions?.MoveKnight);

    const anyKnight =
        state.AllowedActions?.ActivateKnight ||
        state.AllowedActions?.RobberKnight ||
        state.AllowedActions?.MoveKnight ||
        state.AllowedActions?.BuildKnight;
    buttons.openKnightBox?.setEnabled(anyKnight, true);

    buttons.improveBox?.paper.setEnabled(state.AllowedActions?.ImprovePaper);
    buttons.improveBox?.cloth.setEnabled(state.AllowedActions?.ImproveCloth);
    buttons.improveBox?.coin.setEnabled(state.AllowedActions?.ImproveCoin);

    const anyImprove =
        state.AllowedActions?.ImprovePaper ||
        state.AllowedActions?.ImproveCloth ||
        state.AllowedActions?.ImproveCoin;
    buttons.openImproveBox?.setEnabled(anyImprove, true);

    buttons.buildWall?.setEnabled(state.AllowedActions?.BuildWall);
    buttons.specialBuild?.setEnabled(
        Boolean(state.AllowedActions?.SpecialBuild),
    );

    rerender();
}
