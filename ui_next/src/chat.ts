import * as PIXI from "pixi.js";
import * as canvas from "./canvas";
import * as windows from "./windows";
import * as ws from "./ws";
import * as buttons from "./buttons";
import { sound } from "@pixi/sound";

type Message = { text: string; color: string };

let windowSprite: PIXI.Sprite;
let inputBox: HTMLInputElement;
let scrollOffset = 0;
let chatButton: buttons.ButtonSprite;
const messages: Message[] = [];
// [
//     {
//         text: "meew: Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.",
//         color: "green",
//     },
//     { text: "BUNEEE: bleh bleh bleh bleh", color: "orange" },
//     { text: "rajuRastogi: I have no idea what is going on", color: "red" },
//     {
//         text: "bluePirate: The color of the sky is really extremely blue",
//         color: "blue",
//     },
//     { text: "meew: Hodor Hodor", color: "green" },
//     { text: "BUNEEE: bleh bleh bleh bleh", color: "orange" },
//     { text: "rajuRastogi: orange will not win now", color: "red" },
// ];

const G_X = 250;

/**
 * Creates a new chat window.
 */
export function initialize() {
    if (windowSprite && !windowSprite.destroyed) {
        windowSprite.destroy();
    }

    const WIDTH = 250,
        HEIGHT = 160;
    windowSprite = windows.getWindowSprite(WIDTH, HEIGHT);
    windowSprite.pivot.x = WIDTH;
    windowSprite.pivot.y = HEIGHT;
    windowSprite.x = canvas.getWidth() - 20;
    windowSprite.y = canvas.getHeight() - G_X;
    windowSprite.interactive = true;
    windowSprite.zIndex = 2000;
    windowSprite.sortableChildren = true;
    canvas.app.stage.addChild(windowSprite);

    renderMessages();

    // HTML input box
    inputBox = document.createElement("input");
    inputBox.disabled = ws.isSpectator();
    inputBox.type = "text";
    inputBox.className = "chat-input";
    inputBox.style.position = "absolute";

    const resize = () => {
        const ratio = canvas.getScaleRatio();
        inputBox.style.height = `${25 * ratio}px`;
        inputBox.style.width = `${(WIDTH - 10) * ratio}px`;
        inputBox.style.bottom = `${(G_X + 6) * ratio}px`;
        inputBox.style.right = `${25 * ratio}px`;
        inputBox.style.fontSize = `${0.9 * ratio}em`;
        inputBox.style.padding = `0 ${4 * ratio}px`;
        inputBox.style.borderRadius = `${4 * ratio}px`;
        inputBox.style.border = `${2 * ratio}px solid grey`;
    };
    resize();
    window.addEventListener("resize", resize);

    document.body.querySelector(".chat-input")?.remove();
    document.querySelector("div.pixi")?.appendChild(inputBox);

    inputBox.addEventListener("keydown", (e) => {
        const val = inputBox.value.trim();
        if (val && e.key.includes("Enter")) {
            ws.getCommandHub().sendChatMessage(inputBox.value);
            inputBox.value = "";
            renderMessages();
        }
    });

    windowSprite.on("removed", () => {
        inputBox.remove();
        window.removeEventListener("resize", resize);
    });

    /* TODO: fix scrolling for PIXI v7
    (canvas.app.view as HTMLCanvasElement).addEventListener("mousewheel", (e: any) => {
        const ratio = canvas.getScaleRatio();
        const hit = canvas.app.renderer.plugins.interaction.hitTest({
            x: e.offsetX / ratio,
            y: e.offsetY / ratio,
        });

        if (hit === windowSprite) {
            e.stopPropagation();
            scrollOffset -= 1 * Math.sign(e.deltaY);
            if (scrollOffset < 0) {
                scrollOffset = 0;
            } else {
                renderMessages();
            }
        }
    });
    */

    // Hide initially
    setVisible(false);

    // Close button
    {
        const btn = buttons.getButtonSprite(buttons.ButtonType.No, 25, 25);
        btn.setEnabled(true);
        btn.pivot.x = 25;
        btn.zIndex = 30;
        btn.x = WIDTH - 3;
        btn.y = 3;
        windowSprite.addChild(btn);
        btn.on("pointerdown", () => setVisible(false));
    }

    // Chat button
    {
        chatButton = buttons.getButtonSprite(
            buttons.ButtonType.Chat,
            40,
            40,
            "grey",
            undefined,
            "circle",
        );
        const g = new PIXI.Graphics();
        g.drawCircle(20, 20, 50);

        chatButton.setEnabled(true);
        chatButton.pivot.x = 40;
        chatButton.pivot.y = 20;
        chatButton.x = canvas.getWidth() - 20;
        chatButton.y = canvas.getHeight() - 285;
        chatButton.zIndex = 1000;
        chatButton.onClick(() => setVisible(true));
        canvas.app.stage.addChild(chatButton);
    }
}

/**
 * Render the current chat messages.
 */
function renderMessages() {
    if (!windowSprite.visible) {
        return;
    }

    const style = new PIXI.TextStyle({
        fontSize: 14,
        wordWrap: true,
        wordWrapWidth: 230,
        fontFamily: "'Dekko', monospace",
    });

    [...windowSprite.children].forEach((c: any) => {
        if (c instanceof PIXI.Text) {
            c.destroy();
        }
    });

    const windowHeight = windowSprite.getBounds().height;

    let cheight = 0;
    const renderInner = () => {
        let currentOffset = 0;

        for (let i = messages.length - 1; i >= 0; i--) {
            const m = messages[i];
            const newStyle = style.clone();
            newStyle.fill = m.color;

            const measure = PIXI.TextMetrics.measureText(m.text, style);
            let rendered = false;

            for (let j = measure.lines.length - 1; j >= 0; j--) {
                if (currentOffset < scrollOffset) {
                    currentOffset++;
                    continue;
                }

                const text = new PIXI.Text(measure.lines[j], newStyle);
                text.tint = 0x666666;
                text.x = 10;
                text.y = windowHeight - 38 - cheight;
                text.pivot.y = measure.lineHeight;
                text.zIndex = 20;

                cheight += measure.lineHeight;
                if (cheight > windowHeight - 38) {
                    return;
                }
                windowSprite.addChild(text);
                rendered = true;
            }

            if (rendered) {
                cheight += 4;
            }
        }

        scrollOffset = Math.min(scrollOffset, currentOffset);
    };
    renderInner();

    canvas.app.markDirty();
}

/**
 * Show or hide the chat window.
 * @param visible Chat window visibility
 */
function setVisible(visible: boolean) {
    windowSprite.visible = visible;
    inputBox.style.display = visible ? "block" : "none";
    renderMessages();
    canvas.app.markDirty();
}

/**
 * Show a new chat message.
 * @param msg Chat message
 */
export function chatMessage(msg: Message) {
    messages.push(msg);
    chatButton.setBgColor?.(msg.color);
    sound.play("soundChat");

    const style = new PIXI.TextStyle({
        fill: msg.color,
        fontSize: 15,
        wordWrap: true,
        wordWrapWidth: 300,
        fontFamily: "'Dekko', monospace",
    });
    const measure = PIXI.TextMetrics.measureText(msg.text, style);

    if (windowSprite?.visible) {
        renderMessages();
    } else {
        // Show popup
        const popup = new PIXI.Sprite();
        const WIDTH = measure.width + 20,
            HEIGHT = measure.height + 10;

        const g = new PIXI.Graphics();
        g.beginFill(0xffffff, 0.85);
        g.drawRoundedRect(0, 0, WIDTH, HEIGHT, 15);
        g.endFill();
        popup.addChild(g);

        const text = new PIXI.Text(msg.text, style);
        text.tint = 0x666666;
        text.x = 10;
        text.y = 5;
        popup.addChild(text);

        popup.pivot.x = WIDTH;
        popup.pivot.y = HEIGHT / 2;
        popup.x = canvas.getWidth() - (20 + 40 + 10);
        popup.y = chatButton.y;
        popup.zIndex = 1001;

        canvas.app.stage.addChild(popup);
        canvas.app.markDirty();

        const time = 2000 + Math.max(3000, msg.text.length * 20);
        setTimeout(() => {
            popup.destroy({ children: true });
            canvas.app.markDirty();
        }, time);
    }
}
