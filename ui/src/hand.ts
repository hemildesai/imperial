import * as PIXI from "pixi.js";
import * as assets from "./assets";
import * as trade from "./trade";
import * as canvas from "./canvas";
import * as buttons from "./buttons";
import * as windows from "./windows";
import * as anim from "./animation";
import * as state from "./state";
import * as board from "./board";
import * as tsg from "../tsg";
import { getCommandHub, getThisPlayerOrder, isSpectator } from "./ws";
import { CardType, DevelopmentCardType } from "./entities";

export let handWindow: HandWindow | undefined;

const cardTextures: { [t in CardType]: PIXI.Texture } = {} as any;
const currentCards: number[] = [];

/** Development card confirmation */
let devConfirmationWindow: PIXI.Container;
let devConfirmationSprite: PIXI.Sprite;
let devConfirmationYesNoWindow: windows.YesNoWindow;
let usingDevCardType: number;

/**
 * Draw a card texture to a sprite
 * @param t card type
 * @param sprite sprite to draw to
 * @param width width of the sprite
 * @param borderWidth border width of the sprite
 * @returns
 */
export function getCardTexture(
    t: CardType,
    sprite: PIXI.Sprite,
    width = 48,
    borderWidth = 12,
) {
    const simg = assets.cards[t];
    const scale = width / simg.width;

    const inner = new PIXI.Sprite();
    inner.zIndex = -1;
    sprite.addChild(inner);
    sprite.sortableChildren = true;

    // This is very hacky; the hand cards use a border of 12, so we
    // cache the texture when this parameter is used. Further, we cache
    // the the graphic as a texture with a lower resolution to improve
    // the anti-aliasing.
    const shouldCache = borderWidth === 12;

    if (shouldCache && cardTextures[t]?.valid) {
        inner.texture = cardTextures[t];
    } else {
        assets.assignTexture(inner, simg, () => {
            // Mask the card texture to remove corners
            const g = new PIXI.Graphics()
                .lineStyle({ color: 0, width: borderWidth })
                .beginTextureFill({ texture: inner.texture })
                .drawRoundedRect(0, 0, simg.width, simg.height, simg.width / 12)
                .endFill();

            // Generate texture from masked graphic
            inner.texture = canvas.app.generateRenderTexture(g);

            // Cache texture if hand card
            if (shouldCache) {
                cardTextures[t] = inner.texture;
            }
        });
    }

    inner.scale.set(scale);
}

/** Class to display a hand of cards in a window */
export class HandWindow {
    private _interactive: boolean = false;
    public readonly cards: number[] = new Array(9).fill(0);
    private readonly clickableCardTypes: boolean[] = new Array(9).fill(true);

    public readonly developmentCards: number[] = new Array(31).fill(0);
    public readonly developmentCardsUsable: boolean[] = new Array(31).fill(
        true,
    );

    public readonly container = new PIXI.Container();
    public readonly cardSprites: {
        [key: number]: (anim.TranslatableSprite & {
            ratioOverlay?: PIXI.Container;
        })[];
    } = {};

    private ratios: number[] = new Array(9).fill(0);
    private showingRatios: boolean = false;
    public noRatioStride = false;

    /** Callback when a card is clicked */
    public clickCallback?: (cardType: number) => void;

    /**
     * Width of each card in the hand.
     * Must be set before the hand is rendered.
     */
    public cardWidth = 48;

    private readonly X_DELTA = 8;
    private readonly MAX_SOFT = 2;

    /**
     * Create a new hand window
     * @param parent Container to add to
     * @param width Width of the hand
     * @param height Height of the hand
     * @param hasCounts Add count sprites to each card
     * @param shouldAnimate Should the hand cards animate
     */
    constructor(
        private parent: PIXI.Container,
        private width: number,
        private height: number,
        private hasCounts: boolean = true,
        private shouldAnimate: boolean = true,
    ) {
        this.container.addChild(windows.getWindowSprite(width, height));
        this.render();
        this.parent.addChild(this.container);
    }

    /**
     * Set which cards can be clicked
     * @param types quantities of each card type
     */
    public setClickableCardTypes(types?: number[]) {
        for (let i = 0; i < this.clickableCardTypes.length; i++) {
            const val = types ? types.includes(i) : true;
            this.clickableCardTypes[i] = val;
            const sprites = this.cardSprites[i];
            if (!sprites) {
                continue;
            }

            for (const s of sprites) {
                s.interactive = val;
                s.cursor = val ? "pointer" : "default";
                s.tint = val ? 0xffffff : 0x666666;
                s.children.forEach((c) =>
                    c instanceof PIXI.Sprite ? (c.tint = s.tint) : false,
                );
            }
        }
    }

    /**
     * Get total number of cards in hand
     */
    public cardCount() {
        let s = 0;
        for (const c of this.cards) {
            s += c;
        }
        return s;
    }

    /**
     * Get total number of development cards in hand
     */
    public devCardCount() {
        let s = 0;
        for (const c of this.developmentCards) {
            s += c;
        }
        return s;
    }

    /**
     * Render the hand window
     * @param skipAnimation if true, don't animate the cards
     */
    public render(skipAnimation: boolean = false) {
        canvas.app.markDirty();
        let dx = 10;

        const renderCardType = (ct: number, quantity: number) => {
            if (quantity < 0) return;

            if (!this.cardSprites[ct]) {
                this.cardSprites[ct] = [];
            }

            while (this.cardSprites[ct].length < quantity) {
                const cardSprite = new PIXI.Sprite();
                cardSprite.interactive = this._interactive;
                cardSprite.cursor = "pointer";
                cardSprite.visible = false;
                getCardTexture(ct, cardSprite, this.cardWidth);
                cardSprite.on("pointerdown", (event) => {
                    event?.stopPropagation();
                    if (this.clickableCardTypes[ct] || ct >= 100) {
                        this.clickCallback?.(ct);
                    }
                });
                this.cardSprites[ct].push(cardSprite);

                // Card count
                if (this.hasCounts && ct < 100) {
                    const btn = buttons.getCountSprite(19, 20, 13);
                    btn.sprite.anchor.x = 1;
                    btn.sprite.x = this.cardWidth;
                    btn.sprite.zIndex = 1;
                    btn.text.text = `${
                        this.cardSprites[ct].indexOf(cardSprite) + 1
                    }`;
                    cardSprite.addChild(btn.sprite);
                }

                // Dev card hover
                if (ct >= 100) {
                    cardSprite.interactive = true;
                    new windows.TooltipHandler(
                        cardSprite,
                        getDevCardText(ct - 100),
                    );
                }

                cardSprite.visible = false;
                this.container.addChild(cardSprite);
            }

            for (let i = quantity; i < this.cardSprites[ct].length; i++) {
                this.cardSprites[ct][i].visible = false;
                this.cardSprites[ct][i]
                    .listeners("mouseout")
                    .forEach((f) => f(null as any));
            }

            if (quantity == 0) {
                return;
            }

            for (let i = 0; i < quantity; i++) {
                const s = this.cardSprites[ct][i];
                s.targetX = dx;
                s.targetY = (this.height - 72 * (this.cardWidth / 48)) / 2;

                dx += this.X_DELTA;
                if (quantity > this.MAX_SOFT && i != quantity - 1) {
                    dx -=
                        ((quantity - this.MAX_SOFT) * this.X_DELTA) / quantity;
                }

                if (ct > 100) {
                    // Dev card
                    const usable = this.developmentCardsUsable[ct - 100];
                    s.cursor = usable ? "pointer" : "default";
                    s.tint = usable ? 0xffffff : 0x666666;
                    s.children.forEach((c) =>
                        c instanceof PIXI.Sprite ? (c.tint = s.tint) : false,
                    );
                }

                if (s.visible == false) {
                    // new card
                    s.x = s.targetX;
                    s.y = s.targetY;

                    for (const g of state.getPendingCardMoves()) {
                        if (
                            g.CardType == ct &&
                            g.GainerOrder === getThisPlayerOrder()
                        ) {
                            let source: PIXI.Container | undefined;

                            if (g.Tile) {
                                source =
                                    board.getBoard().tiles[
                                        board.coordStr(g.Tile.Center)
                                    ].sprite;
                            } else if (g.GiverOrder >= 0) {
                                source = state.players[g.GiverOrder]?.avatar;
                            } else {
                                source = state.bankContainer;
                            }

                            if (source) {
                                const sourcePos = source.getGlobalPosition();
                                const spos = s.getGlobalPosition();
                                s.x += sourcePos.x - spos.x;
                                s.y += sourcePos.y - spos.y;
                            }

                            s.pauseAnim = true;
                            state.setTimerForCardAnim(source, () => {
                                s.pauseAnim = false;
                            });

                            state.deductPendingCardMoves(g);
                            break;
                        }
                    }
                }
                s.visible = true;

                // Add trade ratio overlay
                // console.log(this.showingRatios, this.ratios);
                if (this.showingRatios) {
                    if (
                        (!s.ratioOverlay || s.ratioOverlay.destroyed) &&
                        (this.noRatioStride || (i + 1) % this.ratios[ct] === 0)
                    ) {
                        s.ratioOverlay = this.getRatioOverlay(this.ratios[ct]);
                        s.addChild(s.ratioOverlay);
                    }

                    if (s.ratioOverlay) {
                        s.ratioOverlay.visible = true;
                    }
                }

                if (!this.shouldAnimate || skipAnimation) {
                    s.x = s.targetX;
                }
            }

            dx += (44 * this.cardWidth) / 48;
        };

        for (let c = 1; c < this.cards.length; c++) {
            renderCardType(c, this.cards[c]);
        }

        if (this.cardCount() > 0) {
            dx += 10;
        }

        const develBase = 100;
        for (let c = 1; c < this.developmentCards.length; c++) {
            renderCardType(develBase + c, this.developmentCards[c]);
        }

        anim.requestTranslationAnimation(this.getAllSprites(), 6, (curr) => {
            if (!curr && !this.getAllSprites().some((s) => s.animating)) {
                if (!this.shouldAnimate && !this.container.destroyed) {
                    canvas.app.markDirty();
                }
            }
        });
    }

    /**
     * Get a flat list of all sprites in the hand
     */
    private getAllSprites() {
        return Object.values(this.cardSprites).flat();
    }

    /**
     * Get a flat list of all resource sprites in the hand
     */
    private getAllResouceSprites() {
        return Object.keys(this.cardSprites)
            .map((k) => (Number(k) < 100 ? this.cardSprites[Number(k)] : []))
            .flat();
    }

    /**
     * Get a container with x:1
     * @param ratio x ratio
     * @returns
     */
    private getRatioOverlay(ratio: number) {
        const c = new PIXI.Container();
        const r = ratio;
        const color = r == 4 ? 0xaa0000 : r == 3 ? 0x777700 : 0x007700;

        c.addChild(
            new PIXI.Graphics()
                .beginFill(color)
                .drawRoundedRect(48 - 25, 73 - 16, 25, 16, 4),
        );

        const text = new PIXI.Text(`${ratio}:1`, {
            fontSize: 13,
            fontWeight: "bold",
            fill: 0xffffff,
        });
        text.x = 48 - text.width / 2 - 25 / 2;
        text.y = 73 - 16;
        c.addChild(text);
        return c;
    }

    /**
     * Update cards of a type and re-render
     * @param cardType the type of card to update
     * @param quantity delta quantity to add
     */
    public updateCards(cardType: CardType, quantity: number) {
        let cardArray: number[] = this.cards;
        if (cardType > 100) {
            cardArray = this.developmentCards;
            cardType -= 100;
        }

        if (cardArray[cardType] + quantity < 0) {
            return false;
        }
        cardArray[cardType] += quantity;
        this.render();
        return true;
    }

    /**
     * Set cards from number array
     * @param s quantity array
     */
    public setCards(s: number[]) {
        for (const i in s) {
            this.cards[i] = s[i];
        }
        this.render();
    }

    /**
     * Set if development card can be used
     * @param cardType the type of card to update
     * @param usable enable/disable
     */
    public setDevelopmentCardUsable(cardType: number, usable: boolean) {
        this.developmentCardsUsable[cardType] = usable;
    }

    /**
     * Set development cards from number array
     * @param s quantity array
     */
    public setDevelopmentCards(s: number[]) {
        for (const i in s) {
            this.developmentCards[i] = s[i];
        }
    }

    public setRatios(ratios: number[]) {
        for (let i = 1; i <= 8; i++) {
            if (ratios[i] !== this.ratios[i]) {
                this.ratios[i] = ratios[i];

                this.cardSprites[i].forEach((s, si) => {
                    s.ratioOverlay?.destroy({ children: true });

                    if (
                        s.visible &&
                        this.showingRatios &&
                        (this.noRatioStride || (si + 1) % ratios[i] === 0)
                    ) {
                        s.ratioOverlay = this.getRatioOverlay(ratios[i]);
                        s.addChild(s.ratioOverlay);
                        s.ratioOverlay.visible = true;
                    }
                });
            }
        }
    }

    /** Show the card overlays for all cards */
    public showRatios() {
        this.getAllSprites().forEach((s) => {
            if (s.ratioOverlay) {
                s.ratioOverlay.visible = true;
            }
        });
        this.showingRatios = true;
    }

    /** Hide the card overlays for all cards */
    public hideRatios() {
        this.getAllSprites().forEach((s) => {
            if (s.ratioOverlay) {
                s.ratioOverlay.visible = false;
            }
        });
        this.showingRatios = false;
    }

    public get interactive() {
        return this._interactive;
    }

    public set interactive(val: boolean) {
        this._interactive = val;
        this.getAllResouceSprites().forEach((s) => (s.interactive = val));
    }
}

/**
 * Render hand of player from secret state
 * @param secret player secret state
 */
export function renderPlayerHand(secret: tsg.PlayerSecretState) {
    // Bigger window than others for dev cards
    const WINDOW_WIDTH = 750;
    const WINDOW_HEIGHT = 90;

    if (!handWindow || handWindow.container.destroyed) {
        handWindow = new HandWindow(
            canvas.app.stage,
            WINDOW_WIDTH,
            WINDOW_HEIGHT,
        );
        handWindow.container.x = 20;
        handWindow.container.y = canvas.getHeight() - WINDOW_HEIGHT - 30;
        handWindow.clickCallback = cardClick;
        handWindow.container.visible = !isSpectator();
    }

    // Store actual cards
    for (const c in secret.Cards) {
        const ct = <CardType>Number(c);
        currentCards[ct] = secret.Cards[ct] ?? 0;
    }

    // Development cards
    handWindow.developmentCards.fill(0);
    for (const c of secret.DevelopmentCards) {
        if (c === undefined) continue;
        const type = c & ~(1 << 15);
        const canUse = (c & (1 << 15)) > 0;
        handWindow.developmentCards[type]++;
        handWindow.setDevelopmentCardUsable(type, canUse);
    }

    // Skip if player is trading
    if (!trade.hasOffer() && !trade.handlingSelectCardsAction) {
        // Resource cards
        handWindow?.setCards(JSON.parse(JSON.stringify(currentCards)));
    }

    handWindow.render();

    // Dev card Confirmation
    if (!devConfirmationWindow || devConfirmationWindow.destroyed) {
        devConfirmationWindow = new PIXI.Container();
        devConfirmationWindow.x = 20;
        devConfirmationWindow.y = canvas.getHeight() - WINDOW_HEIGHT - 360;
        devConfirmationWindow.visible = false;

        devConfirmationYesNoWindow = new windows.YesNoWindow(210, 100)
            .onYes(() => {
                devConfirmationWindow.visible = false;
                getCommandHub().useDevelopmentCard(usingDevCardType);
                canvas.app.markDirty();
            })
            .onNo(() => {
                usingDevCardType = 0;
                devConfirmationWindow.visible = false;
                canvas.app.markDirty();
            })
            .render();

        devConfirmationWindow.addChild(devConfirmationYesNoWindow.container);
        canvas.app.stage.addChild(devConfirmationWindow);
    }
}

/**
 * Reset the hand window
 */
export function resetWindow() {
    canvas.app.markDirty();
    handWindow?.setCards(currentCards);
    if (devConfirmationWindow) devConfirmationWindow.visible = false;
}

/**
 * Click callback for card sprites
 * @param cardType card type
 */
function cardClick(cardType: number) {
    canvas.app.markDirty();

    if (cardType < 100) {
        trade.addToCurrentOffer(cardType);
        return;
    }

    cardType -= 100;

    usingDevCardType = cardType;
    devConfirmationWindow.visible = true;

    if (devConfirmationSprite && !devConfirmationSprite.destroyed) {
        devConfirmationSprite?.destroy();
    }
    devConfirmationSprite = new PIXI.Sprite();
    getCardTexture(cardType + 100, devConfirmationSprite, 200, 4);
    devConfirmationWindow.addChild(devConfirmationSprite);

    const usable = handWindow!.developmentCardsUsable[cardType];
    devConfirmationYesNoWindow.yesEnabled = usable;
}

/**
 * Get tooltip text for development card
 * @param type development card type
 */
function getDevCardText(type: DevelopmentCardType) {
    switch (type) {
        case DevelopmentCardType.Knight:
            return "Warrior: Move the robber and steal a card from an adjacent player";
        case DevelopmentCardType.VictoryPoint:
            return "Victory Point: An extra point that is hidden from other players.";
        case DevelopmentCardType.Monopoly:
            return "Monopoly: Steal all cards of a type from all players";
        case DevelopmentCardType.RoadBuilding:
            return "Road Builder: Build two roads for free anywhere on the island";
        case DevelopmentCardType.YearOfPlenty:
            return "Harvest: Get any two cards from the market for free";

        case DevelopmentCardType.ProgressPaperAlchemist:
            return "Alchemist: Choose the next dice roll to your convenience";
        case DevelopmentCardType.ProgressPaperCrane:
            return "Crane: Build a town upgrade using one less commodity";
        case DevelopmentCardType.ProgressPaperEngineer:
            return "Engineer: Build one fence for free";
        case DevelopmentCardType.ProgressPaperInventor:
            return "Inventor: Swap two black numbers on the board except 2 and 12";
        case DevelopmentCardType.ProgressPaperIrrigation:
            return "Irrigation: Receive 2 Wheat for each Wheat tile with your adjacent building";
        case DevelopmentCardType.ProgressPaperMedicine:
            return "Medicine: Build a town with 2 Ore and 1 Wheat";
        case DevelopmentCardType.ProgressPaperMining:
            return "Mining: Receive 2 Ore for each Ore tile with your adjacent building";
        case DevelopmentCardType.ProgressPaperPrinter:
            return "Printer: One victory point that stays with you";
        case DevelopmentCardType.ProgressPaperRoadBuilding:
            return "Road Builder: Build two roads for free anywhere on the island";
        case DevelopmentCardType.ProgressPaperSmith:
            return "Smith: Upgrade two warriors for free";

        case DevelopmentCardType.ProgressClothCommercialHarbor:
            return "Commercial Harbor: Force each player to trade one commodity for one resource";
        case DevelopmentCardType.ProgressClothMasterMerchant:
            return "Master Merchant: Peek and steal two cards from a player with more points";
        case DevelopmentCardType.ProgressClothMerchant:
            return "Merchant: Obtain 2:1 trade for any tile and a victory point while held";
        case DevelopmentCardType.ProgressClothMerchantFleet:
            return "Merchant Fleet: Obtain 2:1 trade for any card type for one turn";
        case DevelopmentCardType.ProgressClothResourceMonopoly:
            return "Resource Monopoly: Steal upto 2 resources each of any kind from all players";
        case DevelopmentCardType.ProgressClothTradeMonopoly:
            return "Trade Monopoly: Steal upto 1 commodity each of any kind from all players";

        case DevelopmentCardType.ProgressCoinBishop:
            return "Bishop: Move the robber and steal a card from all adjacent players";
        case DevelopmentCardType.ProgressCoinConstitution:
            return "Constitution: One victory point that stays with you";
        case DevelopmentCardType.ProgressCoinDeserter:
            return "Deserter: Defect one warrior from another player chosen by the other player";
        case DevelopmentCardType.ProgressCoinDiplomat:
            return "Diplomat: Remove one road of any player. If you remove your own road, you may place it elsewhere.";
        case DevelopmentCardType.ProgressCoinIntrigue:
            return "Intrigue: Displace a warrior of another player adjacent to your road";
        case DevelopmentCardType.ProgressCoinSaboteur:
            return "Saboteur: Force all players with equal or more points to discard half their cards";
        case DevelopmentCardType.ProgressCoinSpy:
            return "Spy: Steal an action card of your choice from another player";
        case DevelopmentCardType.ProgressCoinWarlord:
            return "Warlord: Activate all warriors for free";
        case DevelopmentCardType.ProgressCoinWedding:
            return "Wedding: Force all players with more points to gift you 2 cards of their choice";

        default:
            return "";
    }
}
