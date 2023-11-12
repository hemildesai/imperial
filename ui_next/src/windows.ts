import * as PIXI from "pixi.js";
import * as canvas from "./canvas";
import * as buttons from "./buttons";
import { getCardTexture } from "./hand";

let currentErrorWindow: PIXI.Container | undefined;

/**
 * Create a new window background sprite
 * @param width Width of the window
 * @param height Height of the window
 */
export function getWindowSprite(width: number, height: number) {
    const s = new PIXI.Sprite();
    const g = new PIXI.Graphics();
    g.lineStyle({
        color: 0,
        width: 2,
    });
    g.beginFill(0xffffff);
    g.alpha = 0.9;
    g.drawRoundedRect(0, 0, width, height, 4);
    g.endFill();
    s.addChild(g);
    return s;
}

export class YesNoWindow {
    private _yesEnabled: boolean = false;
    private _noEnabled: boolean = false;
    public orientation: "vertical" | "horizontal" = "vertical";

    public container = new PIXI.Container();
    public _yesButton?: buttons.ButtonSprite;
    public _noButton?: buttons.ButtonSprite;

    private yesFun?: () => void;
    private noFun?: () => void;

    constructor(private x: number, private y: number) {
        return this;
    }

    /**
     * Set callback for yes button and make it enabled.
     * @param fun callback
     */
    public onYes(fun: () => void) {
        this.yesEnabled = true;
        this.yesFun = fun;
        return this;
    }

    /**
     * Set callback for no button and make it enabled.
     * @param fun callback
     */
    public onNo(fun: () => void) {
        this.noEnabled = true;
        this.noFun = fun;
        return this;
    }

    /**
     * Render the window
     */
    public render() {
        if (this._yesButton || this._noButton) {
            return this;
        }

        this.container.addChild(getWindowSprite(42, 80));
        this.container.x = this.x;
        this.container.y = this.y;

        this._yesButton = buttons.getButtonSprite(
            buttons.ButtonType.Yes,
            32,
            32,
        );
        this._noButton = buttons.getButtonSprite(buttons.ButtonType.No, 32, 32);
        this._yesButton.setEnabled(this._yesEnabled);
        this._noButton.setEnabled(this._noEnabled);
        this.container.addChild(this._yesButton);
        this.container.addChild(this._noButton);

        // Yes
        this._yesButton.x = 5;
        this._yesButton.y = 5;
        this._yesButton.onClick(() => this.yesFun?.());

        // No
        this._noButton.x = 5;
        this._noButton.y = 2 * 4 + 35;
        this._noButton.onClick(() => this.noFun?.());

        return this;
    }

    public get yesEnabled() {
        return this._yesEnabled;
    }

    public set yesEnabled(enabled: boolean) {
        if (
            this._yesEnabled !== enabled ||
            this._yesButton?.cursor !== (enabled ? "pointer" : "default")
        ) {
            this._yesButton?.setEnabled(enabled);
        }
        this._yesEnabled = enabled;
    }

    public get noEnabled() {
        return this._noEnabled;
    }

    public set noEnabled(enabled: boolean) {
        if (
            this._noEnabled !== enabled ||
            this._noButton?.cursor !== (enabled ? "pointer" : "default")
        ) {
            this._noButton?.setEnabled(enabled);
        }
        this._noEnabled = enabled;
    }

    /**
     * Destroy the window and its children
     */
    public destroy() {
        this.container.destroy({ children: true });
    }
}

/**
 * Show an error message to the user.
 * Only one error message is shown at a time.
 * @param titleMessage Title of the window
 * @param message Error message
 */
export function showErrorWindow(titleMessage: string, message: string) {
    console.error(titleMessage, message);

    if (currentErrorWindow && !currentErrorWindow.destroyed) {
        currentErrorWindow.destroy({ children: true });
    }

    const errorWindow = getWindowSprite(300, 300);
    errorWindow.pivot.x = 300 / 2;
    errorWindow.pivot.y = 300 / 2;
    errorWindow.x = 1200 / 2;
    errorWindow.y = window.innerHeight / 2 - 20;
    canvas.app.stage.addChild(errorWindow);
    canvas.app.markDirty();
    currentErrorWindow = errorWindow;

    const title = new PIXI.Text(titleMessage, {
        fontFamily: "sans-serif",
        fontSize: 28,
        fill: 0x000000,
        align: "center",
    });
    title.style.fontWeight = "bold";
    title.anchor.x = 0.5;
    title.x = 300 / 2;
    title.y = 30;
    errorWindow.addChild(title);

    const description = new PIXI.Text(message, {
        fontFamily: "sans-serif",
        fontSize: 16,
        fill: 0x000000,
        align: "left",
        wordWrap: true,
        wordWrapWidth: 260,
    });
    description.x = 20;
    description.y = 80;
    errorWindow.addChild(description);

    const cross = buttons.getButtonSprite(buttons.ButtonType.No, 40, 40);
    cross.pivot.x = 40;
    cross.x = 300;
    cross.y = 0;
    cross.onClick(() => {
        errorWindow.destroy({ children: true });
        canvas.app.markDirty();
    });
    cross.setEnabled(true);
    errorWindow.addChild(cross);
}

export class TooltipHandler {
    private window?: PIXI.Sprite;
    private timer: number = 0;
    private cards: number[] = [];

    /**
     * Create a new tooltip handler
     * @param target Target container to show the tooltip on
     * @param message Text to show in the tooltip
     * @param timeout Timeout in milliseconds before the tooltip is shown
     */
    constructor(
        private target: PIXI.Container,
        public message: string,
        public timeout: number = 300,
    ) {
        target.on("mouseover", () => {
            this.timer = window.setTimeout(() => {
                this.timer = 0;
                this.makeWindow();
                canvas.app.stage.addChild(this.window!);
                canvas.app.markDirty();
            }, this.timeout);
        });

        target.on("mouseout", () => {
            this.hide();
        });

        target.on("removed", () => {
            window.clearTimeout(this.timer);
        });

        return this;
    }

    /**
     * Set the cards to build
     * @param cards List of cardtypes needed to build this
     */
    public setCards(cards: number[]) {
        this.cards = cards;
        return this;
    }

    /**
     * Hide the tooltip if shown
     */
    public hide() {
        this.window?.destroy({ children: true });
        this.window = undefined;
        canvas.app.markDirty();
        window.clearTimeout(this.timer);
        return this;
    }

    /**
     * Create the tooltip window
     */
    private makeWindow() {
        const style = new PIXI.TextStyle({
            fontSize: 14,
            align: "left",
            fontFamily: "sans-serif",
            wordWrap: true,
            wordWrapWidth: 200,
        });
        const m = PIXI.TextMetrics.measureText(this.message, style);

        const cardWidth = 32;
        const cardHeight = (cardWidth * 3) / 2;
        const totalCardWidth = this.cards.length * (cardWidth + 5) + 5;
        const totalCardHeight = this.cards.length > 0 ? cardHeight + 10 : 0;

        const windowWidth = Math.max(
            Math.min(210, m.width + 10),
            totalCardWidth,
        );
        const windowHeight = m.height + totalCardHeight + 10;
        this.window = getWindowSprite(windowWidth, windowHeight);
        this.window.pivot.y = windowHeight;
        const pos = this.target.getGlobalPosition();
        this.window.x = pos.x - 10;
        this.window.y = pos.y - 5;
        this.window.zIndex = 10000;

        // Prevent going out of window
        this.window.x -= Math.max(
            0,
            this.window.x + windowWidth - canvas.getWidth() + 5,
        );
        this.window.x = Math.max(5, this.window.x);
        this.window.y = Math.max(this.window.pivot.y + 5, this.window.y);

        const text = new PIXI.Text(this.message, style);
        text.x = 5;
        text.y = 5;
        this.window.addChild(text);

        this.cards.forEach((card, i) => {
            const cardSprite = new PIXI.Sprite();
            getCardTexture(card, cardSprite, cardWidth);
            cardSprite.x =
                5 + (5 + cardWidth) * i + (windowWidth - totalCardWidth) / 2;
            cardSprite.y = m.height + 10;
            this.window!.addChild(cardSprite);
        });

        return this;
    }
}
