import * as PIXI from "pixi.js";
import * as assets from "./assets";
import * as canvas from "./canvas";
import * as windows from "./windows";
import { GameSettings } from "../tsg";
import { DISPLAY_GAME_MODE, GAME_MODE } from "./lobby";
import { capitalizeFirstLetter } from "../utils";

export let settingsContainer: PIXI.Container;
export let settingDetailsContainer: PIXI.Container;
let settings: GameSettings;

export function initialize(s: GameSettings) {
    settings = s;

    settingsContainer = new PIXI.Container();
    const settingsSprite = new PIXI.Sprite();
    assets.assignTexture(settingsSprite, assets.settings);
    settingsSprite.scale.set(0.3);
    settingsSprite.anchor.x = 0.5;
    settingsSprite.anchor.y = 0.5;
    settingsSprite.x = 25;
    settingsSprite.y = 25;
    settingsContainer.x = 10;
    settingsContainer.y = 10;
    settingsContainer.zIndex = 900;
    settingsContainer.addChild(settingsSprite);
    settingsContainer.interactive = true;
    settingsContainer.cursor = "pointer";

    settingDetailsContainer = new PIXI.Container();
    settingDetailsContainer.addChild(windows.getWindowSprite(170, 240));
    settingDetailsContainer.x = 15;
    settingDetailsContainer.y = 65;
    settingDetailsContainer.zIndex = 20000;
    settingDetailsContainer.visible = false;

    const addSettingsText = (text: string, idx: number) => {
        const t = new PIXI.Text(text, {
            fontFamily: "sans-serif",
            fontSize: 13,
            fill: 0x000000,
            align: "left",
            fontWeight: "bold",
        });
        t.x = 10;
        t.y = idx === 0 ? 10 : 10 + 20 * idx;
        settingDetailsContainer.addChild(t);
    };
    addSettingsText("Settings", 0);
    addSettingsText(
        `Mode: ${DISPLAY_GAME_MODE[settings.Mode as GAME_MODE]}`,
        1,
    );
    addSettingsText(`Private: ${settings.Private ? "Yes" : "No"}`, 2);
    addSettingsText(`Map: ${settings.MapName}`, 3);
    addSettingsText(`Discard Limit: ${settings.DiscardLimit}`, 4);
    addSettingsText(`Victory Points: ${settings.VictoryPoints}`, 5);
    addSettingsText(`Max Players: ${settings.MaxPlayers}`, 6);
    addSettingsText(
        `Special Build Phase: ${settings.SpecialBuild ? "Yes" : "No"}`,
        7,
    );
    addSettingsText(`Karma: ${settings.EnableKarma ? "Yes" : "No"}`, 8);
    addSettingsText(`Speed: ${capitalizeFirstLetter(settings.Speed)}`, 9);
    addSettingsText(`Advanced Mode: ${settings.Advanced ? "Yes" : "No"}`, 10);

    settingsContainer.on("pointerdown", (e) => {
        settingDetailsContainer.visible = !settingDetailsContainer.visible;
        rerender();
    });

    canvas.app.stage.addChild(settingsContainer);
    canvas.app.stage.addChild(settingDetailsContainer);
}

/**
 * Re-render settings screen
 */
function rerender() {
    canvas.app.markDirty();
}
