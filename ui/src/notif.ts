import * as tsg from "../tsg";
import * as canvas from "./canvas";
import * as PIXI from "pixi.js";
import * as anim from "./animation";
import * as state from "./state";
import { sound } from "@pixi/sound";
import { getCardTexture } from "./hand";

let devCardSprite:
    | (PIXI.Sprite & { info?: tsg.DevCardUseInfo } & anim.Translatable)
    | undefined;

const CARD_WIDTH = 150;

/**
 * Show a development card while it is being used
 * @param info dev card use info
 */
export function showDevCardUse(info: tsg.DevCardUseInfo) {
    if (!info.CardType) {
        removeCard();
        return;
    }

    if (devCardSprite?.info?.CardType != info.CardType) {
        removeCard();
        devCardSprite = new PIXI.Sprite();
        getCardTexture(info.CardType + 100, devCardSprite, CARD_WIDTH, 4);
        devCardSprite.info = info;

        devCardSprite.x = canvas.getWidth() - 480;
        devCardSprite.y = 40;
        devCardSprite.zIndex = 2000;

        canvas.app.stage.addChild(devCardSprite);
        canvas.app.markDirty();

        // Animate blur
        const filter = new PIXI.filters.BlurFilter(16);
        devCardSprite.filters = [filter];
        const interval = setInterval(() => {
            filter.blur -= 2;
            if (devCardSprite && filter.blur <= 0) {
                window.clearInterval(interval);
                devCardSprite.filters = [];
            }
            canvas.app.markDirty();
        }, 14);

        // Sound
        sound.play("soundPlayCard");
    }

    if (info.Time) {
        setTimeout(() => removeCard(), info.Time);
    }
}

/**
 * Clear the development card use sprite
 */
function removeCard() {
    if (!devCardSprite || devCardSprite.destroyed) {
        return;
    }

    const destOrder = devCardSprite?.info?.DestOrder;
    if (destOrder !== undefined) {
        devCardSprite.targetScale = 40 / CARD_WIDTH;
        if (destOrder == -1) {
            devCardSprite.targetX = state.bankContainer.x;
            devCardSprite.targetY = state.bankContainer.y;
        } else {
            const pos = state.players[destOrder].avatar.getGlobalPosition();
            devCardSprite.targetX = pos.x;
            devCardSprite.targetY = pos.y;
        }

        anim.requestTranslationAnimation([devCardSprite], undefined, (s) => {
            s?.destroy({ children: true });
            canvas.app.markDirty();
        });
    } else {
        devCardSprite.destroy({ children: true });
        canvas.app.markDirty();
    }

    devCardSprite = undefined;
}
