import * as PIXI from "pixi.js";
import * as canvas from "./canvas";
import * as windows from "./windows";
import { ButtonType } from "./buttons";
import { sound } from "@pixi/sound";
import type { StaticImageData } from "next/image";

export function getCachedTexture(s: StaticImageData) {
    const cached = PIXI.utils.TextureCache[s.src];
    if (cached?.valid) {
        return cached;
    }
    return undefined;
}

export async function getTexture(s: StaticImageData) {
    const cached = getCachedTexture(s);
    if (cached) {
        return cached;
    }

    return await PIXI.Texture.fromURL(s.src);
}

export function assignTexture(
    sprite: PIXI.Sprite,
    s: StaticImageData,
    done?: () => void,
) {
    // Helper to set texture
    const setTexture = (tex: PIXI.Texture) => {
        sprite.texture = tex;
        canvas.app.markDirty();
        let node: PIXI.Container = sprite;
        while (node) {
            if (node.cacheAsBitmap) {
                canvas.app.invalidateBitmapCache(node);
            }
            node = node.parent;
        }
        done?.();
    };

    const cached = getCachedTexture(s);
    if (cached) {
        return setTexture(cached);
    }

    // Create dummy
    const g = new PIXI.Graphics();
    g.beginFill(0xffffff, 0.1);
    g.drawRect(0, 0, s.width, s.height);
    sprite.texture = canvas.app.generateRenderTexture(g);

    let fullLoaded = false;
    if (s.blurDataURL?.startsWith("data:")) {
        PIXI.Texture.fromURL(s.blurDataURL, {
            width: s.width,
            height: s.height,
        }).then((tex) => {
            if (!fullLoaded) {
                sprite.texture = tex;
                canvas.app.markDirty();
            }
        });
    }

    // Requet texture
    getTexture(s).then((tex) => {
        fullLoaded = true;
        setTexture(tex);
    });
}

/************************* Tile Textures *******************************/
import tileTex0 from "../public/assets/tile-tex/0.jpg";
import tileTex1 from "../public/assets/tile-tex/1.jpg";
import tileTex2 from "../public/assets/tile-tex/2.jpg";
import tileTex3 from "../public/assets/tile-tex/3.jpg";
import tileTex4 from "../public/assets/tile-tex/4.jpg";
import tileTex5 from "../public/assets/tile-tex/5.jpg";
import tileTex21 from "../public/assets/tile-tex/21.jpg";
import tileTexFog from "../public/assets/tile-tex/fog.jpg";

export enum TILE_TEX {
    FOG = 114,
}
export const tileTex: { [key: number]: StaticImageData } = {
    0: tileTex0,
    1: tileTex1,
    2: tileTex2,
    3: tileTex3,
    4: tileTex4,
    5: tileTex5,
    21: tileTex21,
};
tileTex[TILE_TEX.FOG] = tileTexFog;

/************************* Roads *******************************/
import roadBeach from "../public/assets/tile-tex/beach.png";
import roadRoad from "../public/assets/tile-tex/road.png";
import roadIslandR from "../public/assets/tile-tex/island-r.png";
import roadIslandL from "../public/assets/tile-tex/island-l.png";
import roadRed from "../public/assets/tile-tex/road-red.png";
import roadBlue from "../public/assets/tile-tex/road-blue.png";
import roadGreen from "../public/assets/tile-tex/road-green.png";
import roadYellow from "../public/assets/tile-tex/road-yellow.png";
import roadPlum from "../public/assets/tile-tex/road-plum.png";
import roadCyan from "../public/assets/tile-tex/road-cyan.png";

export enum ROAD {
    ROAD = "road",
    ISLAND_R = "island_r",
    ISLAND_L = "island_l",
    BEACH = "beach",
}
export const road: { [key: string | ROAD]: StaticImageData } = {
    red: roadRed,
    blue: roadBlue,
    green: roadGreen,
    yellow: roadYellow,
    plum: roadPlum,
    cyan: roadCyan,
};
road[ROAD.BEACH] = roadBeach;
road[ROAD.ROAD] = roadRoad;
road[ROAD.ISLAND_R] = roadIslandR;
road[ROAD.ISLAND_L] = roadIslandL;

/******************** House *******************************************/

import houseRed from "../public/assets/house/house-red.png";
import houseBlue from "../public/assets/house/house-blue.png";
import houseGreen from "../public/assets/house/house-green.png";
import houseYellow from "../public/assets/house/house-yellow.png";
import housePlum from "../public/assets/house/house-plum.png";
import houseCyan from "../public/assets/house/house-cyan.png";

export const house: { [key: string]: StaticImageData } = {
    red: houseRed,
    blue: houseBlue,
    green: houseGreen,
    yellow: houseYellow,
    plum: housePlum,
    cyan: houseCyan,
};

/******************** City *******************************************/

import cityRed from "../public/assets/city/city-red.png";
import cityBlue from "../public/assets/city/city-blue.png";
import cityGreen from "../public/assets/city/city-green.png";
import cityYellow from "../public/assets/city/city-yellow.png";
import cityPlum from "../public/assets/city/city-plum.png";
import cityCyan from "../public/assets/city/city-cyan.png";

export const city: { [key: string]: StaticImageData } = {
    red: cityRed,
    blue: cityBlue,
    green: cityGreen,
    yellow: cityYellow,
    plum: cityPlum,
    cyan: cityCyan,
};

/******************** Knight *******************************************/

import knight1Red from "../public/assets/knight/1-red.png";
import knight1Blue from "../public/assets/knight/1-blue.png";
import knight1Green from "../public/assets/knight/1-green.png";
import knight1Yellow from "../public/assets/knight/1-yellow.png";
import knight1Plum from "../public/assets/knight/1-plum.png";
import knight1Cyan from "../public/assets/knight/1-cyan.png";
import knight2Red from "../public/assets/knight/2-red.png";
import knight2Blue from "../public/assets/knight/2-blue.png";
import knight2Green from "../public/assets/knight/2-green.png";
import knight2Yellow from "../public/assets/knight/2-yellow.png";
import knight2Plum from "../public/assets/knight/2-plum.png";
import knight2Cyan from "../public/assets/knight/2-cyan.png";
import knight3Red from "../public/assets/knight/3-red.png";
import knight3Blue from "../public/assets/knight/3-blue.png";
import knight3Green from "../public/assets/knight/3-green.png";
import knight3Yellow from "../public/assets/knight/3-yellow.png";
import knight3Plum from "../public/assets/knight/3-plum.png";
import knight3Cyan from "../public/assets/knight/3-cyan.png";

import knightDisabledS from "../public/assets/knight/disabled.png";
export const knightDisabled = knightDisabledS;

export const knight: { [level: number]: { [color: string]: StaticImageData } } =
    {
        1: {
            red: knight1Red,
            blue: knight1Blue,
            green: knight1Green,
            yellow: knight1Yellow,
            plum: knight1Plum,
            cyan: knight1Cyan,
        },
        2: {
            red: knight2Red,
            blue: knight2Blue,
            green: knight2Green,
            yellow: knight2Yellow,
            plum: knight2Plum,
            cyan: knight2Cyan,
        },
        3: {
            red: knight3Red,
            blue: knight3Blue,
            green: knight3Green,
            yellow: knight3Yellow,
            plum: knight3Plum,
            cyan: knight3Cyan,
        },
    };

/******************************* Merchant *****************************/

import merchantRed from "../public/assets/merchant/red.png";
import merchantBlue from "../public/assets/merchant/blue.png";
import merchantGreen from "../public/assets/merchant/green.png";
import merchantYellow from "../public/assets/merchant/yellow.png";
import merchantPlum from "../public/assets/merchant/plum.png";
import merchantCyan from "../public/assets/merchant/cyan.png";

export const merchant: { [key: string]: StaticImageData } = {
    red: merchantRed,
    blue: merchantBlue,
    green: merchantGreen,
    yellow: merchantYellow,
    plum: merchantPlum,
    cyan: merchantCyan,
};

/******************************* Metropolis ***************************/

import metro6 from "../public/assets/city/m-6.png";
import metro7 from "../public/assets/city/m-7.png";
import metro8 from "../public/assets/city/m-8.png";

export const metropolis: { [key: number]: StaticImageData } = {
    6: metro6,
    7: metro7,
    8: metro8,
};

/******************************* Other ********************************/

import wallS from "../public/assets/city/w.png";
export const wall = wallS;

import robberS from "../public/assets/robber.png";
export const robber = robberS;

import bankS from "../public/assets/bank.png";
export const bank = bankS;

import settingsS from "../public/assets/settings.png";
export const settings = settingsS;

import botS from "../public/assets/bot.png";
export const bot = botS;

import spectateS from "../public/assets/spectate.png";
export const spectate = spectateS;

import seaS from "../public/assets/sea.jpg";
export const sea = seaS;

import barbarianTrackS from "../public/assets/barbarian/track.png";
export const barbarianTrack = barbarianTrackS;
import barbarianShipS from "../public/assets/barbarian/ship.png";
export const barbarianShip = barbarianShipS;

/*************************** Number Tokens ****************************/

import num0 from "../public/assets/number-tokens/0.png";
import num1 from "../public/assets/number-tokens/1.png";
import num2 from "../public/assets/number-tokens/2.png";
import num3 from "../public/assets/number-tokens/3.png";
import num4 from "../public/assets/number-tokens/4.png";
import num5 from "../public/assets/number-tokens/5.png";
import num6 from "../public/assets/number-tokens/6.png";
import num8 from "../public/assets/number-tokens/8.png";
import num9 from "../public/assets/number-tokens/9.png";
import num10 from "../public/assets/number-tokens/10.png";
import num11 from "../public/assets/number-tokens/11.png";
import num12 from "../public/assets/number-tokens/12.png";

export const numberTokens: { [key: number]: StaticImageData } = {
    0: num0,
    1: num1,
    2: num2,
    3: num3,
    4: num4,
    5: num5,
    6: num6,
    8: num8,
    9: num9,
    10: num10,
    11: num11,
    12: num12,
};

/************************* Icons **************************************/

import iconCards from "../public/assets/icons/cards.png";
import iconDcard from "../public/assets/icons/dcard.png";
import iconKnight from "../public/assets/icons/knight.png";
import iconRoad from "../public/assets/icons/road.png";
import iconVp from "../public/assets/icons/vp.png";

export enum ICON {
    CARDS = "cards",
    DCARD = "dcard",
    KNIGHT = "knight",
    ROAD = "road",
    VP = "vp",
}

export const icons: { [key in ICON]: StaticImageData } = {
    cards: iconCards,
    dcard: iconDcard,
    knight: iconKnight,
    road: iconRoad,
    vp: iconVp,
};

/************************* Icons **************************************/

import port1 from "../public/assets/ports/1.png";
import port2 from "../public/assets/ports/2.png";
import port3 from "../public/assets/ports/3.png";
import port4 from "../public/assets/ports/4.png";
import port5 from "../public/assets/ports/5.png";
import port6 from "../public/assets/ports/6.png";

export const ports: { [key: number]: StaticImageData } = {
    1: port1,
    2: port2,
    3: port3,
    4: port4,
    5: port5,
    6: port6,
};

/************************* Buttons ************************************/

import btnYes from "../public/assets/buttons/yes.png";
import btnNo from "../public/assets/buttons/no.png";
import btnSettlement from "../public/assets/buttons/settlement.png";
import btnCity from "../public/assets/buttons/city.png";
import btnRoad from "../public/assets/buttons/road.png";
import btnDevelopmentCard from "../public/assets/buttons/dcard.png";
import btnKnightBox from "../public/assets/buttons/knight.png";
import btnKnightBuild from "../public/assets/buttons/knight_build.png";
import btnKnightActivate from "../public/assets/buttons/knight_activate.png";
import btnKnightRobber from "../public/assets/buttons/knight_robber.png";
import btnKnightMove from "../public/assets/buttons/knight_move.png";
import btnCityImprove from "../public/assets/buttons/improve.png";
import btnCityImprovePaper from "../public/assets/buttons/improve_paper.jpg";
import btnCityImproveCloth from "../public/assets/buttons/improve_cloth.jpg";
import btnCityImproveCoin from "../public/assets/buttons/improve_coin.jpg";
import btnWall from "../public/assets/buttons/w.png";
import btnEndTurn from "../public/assets/buttons/endturn.png";
import btnSpecialBuild from "../public/assets/buttons/specialbuild.png";
import btnEdit from "../public/assets/buttons/edit.png";
import btnFullscreen from "../public/assets/buttons/fullscreen.png";
import btnChat from "../public/assets/buttons/chat.png";

export const buttons: { [key in ButtonType]: StaticImageData } = {
    yes: btnYes,
    no: btnNo,
    settlement: btnSettlement,
    city: btnCity,
    road: btnRoad,
    dcard: btnDevelopmentCard,
    knight: btnKnightBox,
    knight_build: btnKnightBuild,
    knight_activate: btnKnightActivate,
    knight_robber: btnKnightRobber,
    knight_move: btnKnightMove,
    improve: btnCityImprove,
    improve_paper: btnCityImprovePaper,
    improve_cloth: btnCityImproveCloth,
    improve_coin: btnCityImproveCoin,
    w: btnWall,
    endturn: btnEndTurn,
    specialbuild: btnSpecialBuild,
    edit: btnEdit,
    fullscreen: btnFullscreen,
    chat: btnChat,
};

// Button backgrounds
import buttonsBgRed from "../public/assets/buttons/bg/red.jpg";
import buttonsBgBlue from "../public/assets/buttons/bg/blue.jpg";
import buttonsBgGreen from "../public/assets/buttons/bg/green.jpg";
import buttonsBgYellow from "../public/assets/buttons/bg/yellow.jpg";
import buttonsBgPlum from "../public/assets/buttons/bg/plum.jpg";
import buttonsBgCyan from "../public/assets/buttons/bg/cyan.jpg";

export const buttonsBg: { [key: string]: StaticImageData } = {
    red: buttonsBgRed,
    blue: buttonsBgBlue,
    green: buttonsBgGreen,
    yellow: buttonsBgYellow,
    plum: buttonsBgPlum,
    cyan: buttonsBgCyan,
};

/************************* Dice ************************************/
import diceW1 from "../public/assets/dice/dice-1.png";
import diceW2 from "../public/assets/dice/dice-2.png";
import diceW3 from "../public/assets/dice/dice-3.png";
import diceW4 from "../public/assets/dice/dice-4.png";
import diceW5 from "../public/assets/dice/dice-5.png";
import diceW6 from "../public/assets/dice/dice-6.png";
import diceR1 from "../public/assets/dice/dice-1-r.png";
import diceR2 from "../public/assets/dice/dice-2-r.png";
import diceR3 from "../public/assets/dice/dice-3-r.png";
import diceR4 from "../public/assets/dice/dice-4-r.png";
import diceR5 from "../public/assets/dice/dice-5-r.png";
import diceR6 from "../public/assets/dice/dice-6-r.png";
import diceE1 from "../public/assets/dice/event-1.png";
import diceE2 from "../public/assets/dice/event-2.png";
import diceE3 from "../public/assets/dice/event-3.png";
import diceE4 from "../public/assets/dice/event-4.png";

export const diceWhite: { [key: number]: StaticImageData } = {
    1: diceW1,
    2: diceW2,
    3: diceW3,
    4: diceW4,
    5: diceW5,
    6: diceW6,
};

export const diceRed: { [key: number]: StaticImageData } = {
    1: diceR1,
    2: diceR2,
    3: diceR3,
    4: diceR4,
    5: diceR5,
    6: diceR6,
};

export const diceEvent: { [key: number]: StaticImageData } = {
    1: diceE1,
    2: diceE2,
    3: diceE3,
    4: diceE4,
};

/****************** Cards *********************************************/

import cards0 from "../public/assets/cards/0.jpg";
import cards1 from "../public/assets/cards/1.jpg";
import cards2 from "../public/assets/cards/2.jpg";
import cards3 from "../public/assets/cards/3.jpg";
import cards4 from "../public/assets/cards/4.jpg";
import cards5 from "../public/assets/cards/5.jpg";
import cards6 from "../public/assets/cards/6.jpg";
import cards7 from "../public/assets/cards/7.jpg";
import cards8 from "../public/assets/cards/8.jpg";
import cards101 from "../public/assets/cards/101.jpg";
import cards102 from "../public/assets/cards/102.jpg";
import cards103 from "../public/assets/cards/103.jpg";
import cards104 from "../public/assets/cards/104.jpg";
import cards105 from "../public/assets/cards/105.jpg";
import cards106 from "../public/assets/cards/106.jpg";
import cards107 from "../public/assets/cards/107.jpg";
import cards108 from "../public/assets/cards/108.jpg";
import cards109 from "../public/assets/cards/109.jpg";
import cards110 from "../public/assets/cards/110.jpg";
import cards111 from "../public/assets/cards/111.jpg";
import cards112 from "../public/assets/cards/112.jpg";
import cards113 from "../public/assets/cards/113.jpg";
import cards114 from "../public/assets/cards/114.jpg";
import cards115 from "../public/assets/cards/115.jpg";
import cards116 from "../public/assets/cards/116.jpg";
import cards117 from "../public/assets/cards/117.jpg";
import cards118 from "../public/assets/cards/118.jpg";
import cards119 from "../public/assets/cards/119.jpg";
import cards120 from "../public/assets/cards/120.jpg";
import cards121 from "../public/assets/cards/121.jpg";
import cards122 from "../public/assets/cards/122.jpg";
import cards123 from "../public/assets/cards/123.jpg";
import cards124 from "../public/assets/cards/124.jpg";
import cards125 from "../public/assets/cards/125.jpg";
import cards126 from "../public/assets/cards/126.jpg";
import cards127 from "../public/assets/cards/127.jpg";
import cards128 from "../public/assets/cards/128.jpg";
import cards129 from "../public/assets/cards/129.jpg";
import cards130 from "../public/assets/cards/130.jpg";
import cards200 from "../public/assets/cards/200.jpg";
import cards201 from "../public/assets/cards/201.jpg";
import cards202 from "../public/assets/cards/202.jpg";
import cards203 from "../public/assets/cards/203.jpg";
import cards204 from "../public/assets/cards/204.jpg";
import cards205 from "../public/assets/cards/205.jpg";
import cards206 from "../public/assets/cards/206.jpg";
import cards207 from "../public/assets/cards/207.jpg";
import cards208 from "../public/assets/cards/208.jpg";
import cards209 from "../public/assets/cards/209.jpg";
import cards210 from "../public/assets/cards/210.jpg";
import cards211 from "../public/assets/cards/211.jpg";
import cards212 from "../public/assets/cards/212.jpg";
import cards213 from "../public/assets/cards/213.jpg";
import cards214 from "../public/assets/cards/214.jpg";
import cards215 from "../public/assets/cards/215.jpg";

export const cards: { [key: number]: StaticImageData } = {
    0: cards0,
    1: cards1,
    2: cards2,
    3: cards3,
    4: cards4,
    5: cards5,
    6: cards6,
    7: cards7,
    8: cards8,
    101: cards101,
    102: cards102,
    103: cards103,
    104: cards104,
    105: cards105,
    106: cards106,
    107: cards107,
    108: cards108,
    109: cards109,
    110: cards110,
    111: cards111,
    112: cards112,
    113: cards113,
    114: cards114,
    115: cards115,
    116: cards116,
    117: cards117,
    118: cards118,
    119: cards119,
    120: cards120,
    121: cards121,
    122: cards122,
    123: cards123,
    124: cards124,
    125: cards125,
    126: cards126,
    127: cards127,
    128: cards128,
    129: cards129,
    130: cards130,
    200: cards200,
    201: cards201,
    202: cards202,
    203: cards203,
    204: cards204,
    205: cards205,
    206: cards206,
    207: cards207,
    208: cards208,
    209: cards209,
    210: cards210,
    211: cards211,
    212: cards212,
    213: cards213,
    214: cards214,
    215: cards215,
};

/**********************************************************************/

let progressContainer: PIXI.Container;
let progressBg: PIXI.Graphics;
let progress: PIXI.Graphics;
const w = 500;

export async function loadAssets() {
    PIXI.utils.clearTextureCache();

    // Progress bar
    addProgressBar();

    const addSound = (name: string, src: string) => {
        if (!sound.exists(name)) sound.add(name, src);
    };

    // Sounds
    await Promise.all([
        addSound("soundRing", "/assets/sound/ring.wav"),
        addSound("soundTrade", "/assets/sound/trade.wav"),
        addSound("soundDice", "/assets/sound/dice.wav"),
        addSound("soundChat", "/assets/sound/chat.wav"),
        addSound("soundPlayCard", "/assets/sound/playcard.wav"),
    ]);

    // Progress by number of assets
    const numAssets = Object.keys(tileTex).length;
    let loadedAssets = 0;
    const progress = () => {
        loadedAssets++;
        updateProgressBar((loadedAssets / numAssets) * 100);
    };

    // Textures
    await Promise.all(
        Object.values(tileTex).map((s) =>
            (async () => {
                await PIXI.Assets.load(s.src);
                progress();
            })(),
        ),
    );

    // Done
    progressContainer?.destroy({ children: true });
}

function addProgressBar() {
    progressContainer = new PIXI.Container();
    canvas.app.stage.addChild(progressContainer);
    progressContainer.addChild(windows.getWindowSprite(w + 40, 140));
    progressContainer.x = (canvas.getWidth() - w) / 2;
    progressContainer.y = 200;
    progressContainer.zIndex = 10000;

    progressBg = new PIXI.Graphics();
    progressBg.beginFill(0xdddddd, 0.8);
    progressBg.drawRect(20, 90, w, 30);
    progressBg.endFill();
    progressContainer.addChild(progressBg);

    const title = new PIXI.Text("Loading Assets ...", {
        fill: 0x000000,
        fontWeight: "bold",
        fontFamily: "serif",
        fontSize: 36,
    });
    title.anchor.x = 0.5;
    title.x = w / 2 + 20;
    title.y = 25;
    progressContainer.addChild(title);
}

function updateProgressBar(percent: number) {
    if (progress && !progress.destroyed) {
        progress?.destroy({ children: true });
    }
    progress = new PIXI.Graphics();
    progress.beginFill(0x00aa00, 0.8);
    progress.drawRect(20, 90, (w * percent) / 100, 30);
    progress.endFill();
    progressContainer.addChild(progress);
    canvas.app.markDirty();
}
