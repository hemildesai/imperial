import * as canvas from "./canvas";
import * as PIXI from "pixi.js";

/** Translatable and scalable animating object */
export type Translatable = {
    x: number;
    y: number;
    scale: PIXI.ObservablePoint;
    destroyed: boolean;
    visible: boolean;

    /** Final x coordinate to animate to */
    targetX?: number;
    /** Final y coordinate to animate to */
    targetY?: number;
    /** Final scale to animate to */
    targetScale?: number;

    /** Currently animating this object */
    animating?: boolean;
    /** Pause the animation while continuing to check for updates */
    pauseAnim?: boolean;
};

export type TranslatableSprite = PIXI.Sprite & Translatable;

/**
 * Start animating multiple objects
 * Performs linear interpolation between the start and target values
 *
 * @param objects List of objects to animate
 * @param speed Speed of animation
 * @param done Callback when all objects are done animating
 * @returns
 */
export function requestTranslationAnimation<T extends Translatable>(
    objects: T[],
    speed: number = 8,
    done?: (obj?: T) => void,
) {
    const animObjects = objects.filter(
        (o) =>
            o &&
            !o.destroyed &&
            !o.animating &&
            o.visible &&
            (o.x !== o.targetX || o.y !== o.targetY),
    );
    if (!animObjects.length) return done?.();

    animObjects.map((o) => (o.animating = true));

    let frames = 0;

    let previousFrame = performance.now();

    const animate = () => {
        let anyAnimated = false;

        const ANIM_DELTA = (speed * (performance.now() - previousFrame)) / 17;
        previousFrame = performance.now();

        for (const s of animObjects) {
            // Make sure the object exists
            if (!s || !s.visible || s.destroyed || !s.animating) {
                continue;
            }

            if (s.pauseAnim) {
                anyAnimated = true;
                continue;
            }

            // Prevent duplicates
            let animated = false;

            // X animation
            if (s.targetX !== undefined && s.targetX !== s.x) {
                if (Math.abs(s.targetX - s.x) <= ANIM_DELTA) {
                    s.x = s.targetX;
                } else {
                    s.x += Math.sign(s.targetX - s.x) * ANIM_DELTA;
                }
                animated = true;
                anyAnimated = true;
            }

            // Y animation
            if (s.targetY !== undefined && s.targetY !== s.y) {
                if (Math.abs(s.targetY - s.y) <= ANIM_DELTA) {
                    s.y = s.targetY;
                } else {
                    s.y += Math.sign(s.targetY - s.y) * ANIM_DELTA;
                }
                animated = true;
                anyAnimated = true;
            }

            // Scale animation
            if (s.targetScale !== undefined && s.targetScale !== s.scale.x) {
                if (Math.abs(s.targetScale - s.scale.x) * 100 <= ANIM_DELTA) {
                    s.scale.set(s.targetScale);
                } else {
                    s.scale.set(
                        s.scale.x +
                            (Math.sign(s.targetScale - s.scale.x) *
                                ANIM_DELTA) /
                                100,
                    );
                }
                animated = true;
                anyAnimated = true;
            }

            if (!animated) {
                s.animating = false;
                done?.(s);
            }
        }

        if (!anyAnimated && frames > 0) {
            canvas.app.ticker.remove(animate);
            animObjects.map((o) => (o.animating = false));
            done?.();
        } else {
            frames++;
            canvas.app.markDirty();
        }
    };

    canvas.app.ticker.add(animate);
}
