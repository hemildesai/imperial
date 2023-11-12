import * as PIXI from "pixi.js";
import * as board from "./board";
import * as buttons from "./buttons";
import { loadAssets } from "./assets";
import { ICoordinate } from "../tsg";
import { toggleFullscreen } from "../utils";

type AppType = PIXI.Application & {
    /** Needs re-render */
    dirty: boolean;
    /** Mark an object or the entire stage as dirty and re-render */
    markDirty: (c?: PIXI.DisplayObject) => void;
    /** Mark an object or the entire stage as clean */
    markClean: (c?: PIXI.DisplayObject) => void;
    /**Render an object and its children.*/
    renderRecursive: (o: PIXI.DisplayObject) => void;
    /** Invalidate the cache for an object */
    invalidateBitmapCache: (o: PIXI.DisplayObject) => void;
    /** Generate a render texture */
    generateRenderTexture: (
        container: PIXI.Container,
        opts?: {
            height?: number;
            width?: number;
        },
    ) => PIXI.RenderTexture;
    /** Render texture */
    rtex?: PIXI.RenderTexture;
    /** Slower ticker at lower FPS */
    slowTicker: PIXI.Ticker;
};

let app: AppType;
PIXI.Application.prototype.render = () => undefined;

export { app };

/**
 * Initialize the canvas
 * @param div Element to attach the canvas to
 * @param done Callback when done
 */
export async function initialize(div: HTMLDivElement, done?: () => void) {
    const newApp = new PIXI.Application({
        backgroundColor: 0x0077be,
        width: 1200,
        height: 800,
        antialias: true,
        autoDensity: true,
        resolution: 1.25,
        sharedTicker: false,
        autoStart: false,
        clearBeforeRender: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
    });

    app = newApp as any;
    app.dirty = true;
    (<any>window).imperialsApp = newApp;

    window.addEventListener("resize", resize);

    // Slow ticker
    app.slowTicker = new PIXI.Ticker();
    app.slowTicker.maxFPS = 16;
    app.slowTicker.start();

    // Mark only some children as dirty
    const dirtyChildren = new Set<PIXI.DisplayObject>();
    app.markDirty = (c?: PIXI.DisplayObject) => {
        if (c) {
            dirtyChildren.add(c);
        } else {
            app.dirty = true;
        }
    };

    app.markClean = (c?: PIXI.DisplayObject) => {
        if (c) {
            dirtyChildren.delete(c);
        } else {
            app.dirty = false;
        }
    };

    app.renderRecursive = (o: PIXI.DisplayObject) => {
        o.render(app.renderer as PIXI.Renderer);

        if (o instanceof PIXI.Container) {
            o.children.forEach((s) => app.renderRecursive(s));
        }
    };

    const invalidateCache = new Set<PIXI.DisplayObject>();
    app.invalidateBitmapCache = (o: PIXI.DisplayObject) => {
        invalidateCache.add(o);
        app.markDirty();
    };

    app.generateRenderTexture = (
        container: PIXI.Container,
        opts?: {
            height?: number;
            width?: number;
        },
    ) => {
        const renderTexture = PIXI.RenderTexture.create({
            width: opts?.width ?? container.width,
            height: opts?.height ?? container.height,
        });
        app.renderer.render(container, {
            renderTexture: renderTexture,
            clear: true,
        });
        return renderTexture;
    };

    app.ticker.add(() => {
        if (app.dirty) {
            app.dirty = false;

            if (invalidateCache.size > 0) {
                Array.from(invalidateCache)
                    .filter((d) => !d.destroyed)
                    .forEach((d) => {
                        // re-render invalidated objects
                        d.cacheAsBitmap = false;
                        d.cacheAsBitmap = true;
                        app.renderer.render(d);
                    });
                invalidateCache.clear();
            }

            // compose the scene and render dirty children
            app.renderer.render(app.stage);
            dirtyChildren.forEach(app.renderRecursive);
        }
    }, PIXI.UPDATE_PRIORITY.LOW);
    app.ticker.start();

    div.appendChild(app.view as HTMLCanvasElement);
    app.stage.sortableChildren = true;
    resize();
    await loadAssets();
    startup(done);
}

/**
 * Destroy the canvas and app
 * @param done Callback when done
 */
export function cleanup(done?: () => void) {
    const wapp: AppType | undefined = (<any>window).imperialsApp;

    try {
        wapp?.ticker.stop();
        wapp?.ticker.destroy();
    } catch (e) {
        console.warn(e);
    }

    try {
        wapp?.slowTicker?.stop();
        wapp?.slowTicker?.destroy();
    } catch (e) {
        console.warn(e);
    }

    try {
        wapp?.stage?.destroy({
            children: true,
            texture: true,
            baseTexture: true,
        });
    } catch (e) {
        console.warn(e);
    }

    try {
        wapp?.renderer.destroy(true);
    } catch (e) {
        console.warn(e);
    }

    (wapp?.view as HTMLCanvasElement)?.remove();
    window.removeEventListener("resize", resize);
    done?.();
}

/**
 * Initialize the board and other state
 * @param done Callback when done
 */
async function startup(done?: () => void) {
    board.initialize();
    addFullscreenButton();
    resize();
    done?.();
}

/**
 * Initialize the fullscreen button
 */
function addFullscreenButton() {
    const fsbtn = buttons.getButtonSprite(
        buttons.ButtonType.Fullscreen,
        30,
        30,
    );
    fsbtn.setEnabled(true);
    fsbtn.onClick(toggleFullscreen);
    fsbtn.x = getWidth() - 38;
    fsbtn.y = getHeight() - 38;
    app.stage.addChild(fsbtn);
}

/**
 * Get scaling ratio for display coordinates
 */
export function getScaleRatio() {
    return Math.min(
        window.innerWidth / getWidth(),
        window.innerHeight / getHeight(),
    );
}

/**
 * Resize the canvas to the current window size
 */
const resize = () => {
    if (!app?.view) return;

    const ratio = getScaleRatio();
    const canvas = app.view as HTMLCanvasElement;
    canvas.style!.height = `${800 * ratio}px`;
    canvas.style!.width = `${1200 * ratio}px`;
    canvas.parentElement!.style.height = canvas.style.height;
    canvas.parentElement!.style.width = canvas.style.width;
    app.markDirty();
};

/**
 * @returns The height of the canvas
 */
export function getHeight() {
    return app.view.height / app.renderer.resolution;
}

/**
 * @returns The width of the canvas
 */
export function getWidth() {
    return app.view.width / app.renderer.resolution;
}

/**
 * Get a scaled value for display from a display coordinate
 * @param C Coordinate to convert
 */
export function getScaled(C: ICoordinate) {
    return {
        x: C.X * 30,
        y: C.Y * 30,
    };
}
