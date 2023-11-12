import * as PIXI from "pixi.js";
import * as dice from "./dice";
import * as canvas from "./canvas";
import * as anim from "./animation";
import * as windows from "./windows";
import * as assets from "./assets";
import {
    CoordStr,
    IBoard,
    IEdgePlacement,
    IVertexPlacement,
    VertexPlacementType,
    UIVertex,
    UIEdge,
    UITile,
} from "./entities";
import { Viewport } from "pixi-viewport";
import {
    Coordinate,
    ICoordinate,
    IEdgeCoordinate,
    IPort,
    Merchant,
} from "../tsg";
import { hexToUrlString } from "../utils";

/** Current playing board */
let board: IBoard;

/** Board container */
export let container: Viewport & PIXI.Container;
let boardContainer: PIXI.Container;

/** Map from coordinates to vertex placements */
let vertexPlacements: { [key: CoordStr]: IVertexPlacement };

/** Map from EdgeCoordinate to edge placement */
let edgePlacements: { [key: CoordStr]: IEdgePlacement };

/** Window to confirm placement of anything */
let placementConfirmationWindow: windows.YesNoWindow | undefined;

/** Map from coordinates to display coordinates */
let DispCoordMap: { [key: CoordStr]: ICoordinate };

/** Click event for vertex */
type VertexClickEvent = (event: any, vertex: UIVertex) => void;
let vertexClickEvent: VertexClickEvent | null = null;

/** Click event for edge */
type EdgeClickEvent = (event: any, edge: UIEdge) => void;
let edgeClickEvent: EdgeClickEvent | null = null;

/** Click event for tile */
type TileClickEvent = (event: any, tile: UITile) => void;
let tileClickEvent: TileClickEvent | null = null;

/** Port sprites */
const portSprites: { [key: string]: PIXI.Container } = {};

/** Containers to destroy before re-init */
const destroyBeforeReinit: PIXI.Container[] = [];

// Board is initialized
let isInitComplete = false;

/** Initialize the container */
export function initialize() {
    board = {
        tiles: {},
        vertices: {},
        edges: {},
        ports: new Array<IPort>(),
        robber: undefined,
    };
    edgePlacements = {};
    vertexPlacements = {};
    DispCoordMap = {};

    container = new Viewport({
        events: canvas.app.renderer.events,
    });

    boardContainer = new PIXI.Container();
    container.addChild(boardContainer);

    container
        .drag()
        .pinch()
        .wheel({
            smooth: 5,
        })
        .decelerate({
            friction: 0.7,
        })
        .clampZoom({
            minScale: 0.6,
            maxScale: 2,
        });

    container.sortableChildren = true;

    canvas.app.stage.addChild(container);

    const background = new PIXI.Sprite();
    PIXI.Texture.fromURL(assets.sea.src).then((tex) => {
        background.texture = tex;
    });
    background.zIndex = -1;
    background.scale.set(1);
    canvas.app.stage.addChild(background);

    dice.render(1, 1, 0);
    canvas.app.markDirty();

    // Watch the viewport for changes
    canvas.app.ticker.add(() => {
        if (container.dirty) {
            container.dirty = false;
            canvas.app.markDirty();
        }
    });
}

/**
 * Set if the init complete message is received
 * Cleans up the board if it is not complete
 * @param value is the board initialized
 */
export function setInitComplete(value: boolean) {
    isInitComplete = value;

    // Clean up the board if init is starting
    if (!value) {
        destroyBeforeReinit.forEach((curr) => {
            if (curr && !curr.destroyed) {
                curr.destroy({ children: true });
            }
        });
        destroyBeforeReinit.splice(0, destroyBeforeReinit.length);
    }
}

/**
 * Convert coordinates to string key
 * @param x x coordinate
 * @param y y coordinate
 * @returns string key for the coordinate
 */
export function coordStr(x: number | ICoordinate, y?: number): CoordStr {
    if (y !== undefined) {
        return `${x}.${y}`;
    } else if (typeof x !== "number") {
        return `${x.X}.${x.Y}`;
    }

    return "";
}

/**
 * Convert an edge coordinate to a string key
 * @param C edge coordinate
 * @returns string key for the coordinate
 */
export function edgeCoordStr(C: IEdgeCoordinate): CoordStr {
    return `${coordStr(C.C1)}.${coordStr(C.C2)}`;
}

/**
 * Get display coordinates for vertex/tile center coordinate
 * Looks up DispCoordMap for the coordinate
 * @param x x coordinate
 * @param y y coordinate
 * @returns Coordinate for display
 */
export function getDispCoord(x: number | ICoordinate, y?: number) {
    return DispCoordMap[coordStr(x, y)];
}
/**
 * Set the DispCoordMap value
 * @param x x coordinate
 * @param y y coordinate
 * @param val display coordinate
 */
export function setDispCoord(x: number, y: number, val: ICoordinate) {
    return (DispCoordMap[coordStr(x, y)] = new Coordinate(val));
}

/**
 * Get the current board
 */
export function getBoard() {
    return board;
}

/**
 * Set the vertex click event
 * @param e Click event
 */
export function setVertexClickEvent(e: VertexClickEvent | null) {
    vertexClickEvent = e;
}

/**
 * Set the edge click event
 * @param e Click event
 */
export function setEdgeClickEvent(e: EdgeClickEvent | null) {
    edgeClickEvent = e;
}

/**
 * Set the tile click event
 * @param e Click event
 */
export function setTileClickEvent(e: TileClickEvent | null) {
    tileClickEvent = e;
}

/**
 * Set the DispCoordMap values from server data
 * @param mapping Server response
 */
export function setDispMapping(mapping: any) {
    for (let i = 0; i < Object.keys(mapping.keys).length; i++) {
        setDispCoord(mapping.keys[i].x, mapping.keys[i].y, mapping.values[i]);
    }
}

/**
 * Render a tile on the board
 * @param tile server response
 */
export async function renderTile(tile: UITile) {
    // No need to remove old sprite
    const key = coordStr(tile.Center);
    const curr = board.tiles[key];

    const setNumberTex = (t: UITile) => {
        assets.assignTexture(t.numberSprite!, assets.numberTokens[t.Number]);
    };

    // Inventor
    if (
        curr &&
        !curr.Fog &&
        curr.numberSprite &&
        !curr.numberSprite.destroyed &&
        curr.Type == tile.Type
    ) {
        curr.Number = tile.Number;
        setNumberTex(curr);
        curr.numberSprite.targetY = curr.numberSprite.y;
        curr.numberSprite.y = curr.numberSprite.y - 100;

        if (isInitComplete) {
            anim.requestTranslationAnimation([curr.numberSprite]);
        } else {
            curr.numberSprite.y = curr.numberSprite.targetY;
        }
        return;
    }

    [curr?.sprite, curr?.numberSprite, curr?.highlightSprite].forEach((s) => {
        if (s && !s.destroyed) {
            s.destroy({ children: true });
        }
    });
    board.tiles[key] = tile;

    const c = tile.Center;
    const SIDE_HALF = 300;
    const HEX_DIAG = 229;
    const S3B2 = Math.sqrt(3) / 2;
    const texType = tile.Fog ? assets.TILE_TEX.FOG : tile.Type;

    const hex = new PIXI.Graphics()
        .beginTextureFill({
            texture: PIXI.Assets.get(assets.tileTex[texType].src),
        })
        .drawPolygon(
            SIDE_HALF,
            SIDE_HALF - HEX_DIAG,
            SIDE_HALF + HEX_DIAG * S3B2,
            SIDE_HALF - HEX_DIAG / 2,
            SIDE_HALF + HEX_DIAG * S3B2,
            SIDE_HALF + HEX_DIAG / 2,
            SIDE_HALF,
            SIDE_HALF + HEX_DIAG,
            SIDE_HALF - HEX_DIAG * S3B2,
            SIDE_HALF + HEX_DIAG / 2,
            SIDE_HALF - HEX_DIAG * S3B2,
            SIDE_HALF - HEX_DIAG / 2,
            SIDE_HALF,
            SIDE_HALF - HEX_DIAG,
        )
        .endFill();

    const tileSprite = new PIXI.Sprite();
    tileSprite.texture = canvas.app.generateRenderTexture(hex, {
        height: 2 * SIDE_HALF,
        width: 2 * SIDE_HALF,
    });
    tile.sprite = tileSprite;
    boardContainer.addChild(tileSprite);
    tileSprite.scale.set(0.35);

    const fc = canvas.getScaled(getDispCoord(c.X, c.Y));
    tileSprite.anchor.x = 0.5;
    tileSprite.anchor.y = 0.5;
    tileSprite.x = fc.x;
    tileSprite.y = fc.y;

    {
        // Number token
        const fc = canvas.getScaled(getDispCoord(c.X, c.Y));
        const numSprite = new PIXI.Sprite();
        container.addChild(numSprite);

        assets.assignTexture(numSprite, assets.numberTokens[tile.Number]);
        numSprite.scale.set(48 / numSprite.width);

        // Number on token
        numSprite.x = fc.x;
        numSprite.y = fc.y;
        numSprite.anchor.x = 0.5;
        numSprite.anchor.y = 0.5;
        tile.numberSprite = numSprite;
        tile.numberSprite.visible = tile.Number > 0 && !tile.Fog;
    }

    renderTileHighlightSprite(tile);
}

/**
 * Flash tiles for a number for 1 second
 * @param num number to flash
 */
export function flashTile(num: number) {
    Object.values(board.tiles).forEach((t) => {
        if (!t.Fog && t.sprite && t.Number == num) {
            // Show roll sprite overlay
            t.sprite.tint = 0x777777;
            canvas.app.markDirty();

            setTimeout(() => {
                t.sprite!.tint = 0xffffff;
                canvas.app.markDirty();
            }, 1000);
        }
    });
}

/**
 * Renders vertex placement from VertexPlacement object
 * @param vp Vertex placement object
 * @param removed remove this vertex placement from the board
 */
export function renderVertexPlacement(vp: IVertexPlacement, removed = false) {
    // Remove old sprite
    const key = coordStr(vp.Location.C);
    const curr = vertexPlacements[key];
    curr?.sprite?.destroy({
        children: true,
    });

    // Placement was removed
    if (removed) {
        curr.sprite = undefined;
        return;
    }

    // Create new sprite
    const sprite: anim.TranslatableSprite = new PIXI.Sprite();
    vp.sprite = sprite;
    vertexPlacements[key] = vp;

    // Set sprite location
    const fc = canvas.getScaled(getDispCoord(vp.Location.C.X, vp.Location.C.Y));
    sprite.x = fc.x;
    sprite.targetY = fc.y - 5;
    sprite.y = sprite.targetY - 80;
    sprite.zIndex = 200;
    sprite.anchor.x = 0.55;
    sprite.anchor.y = 0.5;
    container.addChild(sprite);

    if (isInitComplete) {
        anim.requestTranslationAnimation([sprite], 4);
    } else {
        sprite.y = sprite.targetY;
    }

    // Get color for url
    const urlColor = hexToUrlString(vp.Owner.Color);

    // Draw knight and disabled overlay
    const drawKnight = (level: number) => {
        assets.assignTexture(sprite, assets.knight[level][urlColor]);
        sprite.scale.set(37 / sprite.width);

        if (!vp.Activated) {
            const overlay = new PIXI.Sprite();
            overlay.anchor = sprite.anchor;
            assets.assignTexture(overlay, assets.knightDisabled);
            sprite.addChild(overlay);
        }
    };

    // Generate sprite with correct color
    switch (vp.Type) {
        case VertexPlacementType.Settlement:
            assets.assignTexture(sprite, assets.house[urlColor]);
            sprite.scale.set(50 / sprite.width);
            break;

        case VertexPlacementType.City:
            assets.assignTexture(sprite, assets.city[urlColor]);
            sprite.scale.set(70 / sprite.width);

            if (vp.Wall) {
                const wallSprite = new PIXI.Sprite();
                assets.assignTexture(wallSprite, assets.wall);
                wallSprite.anchor.x = sprite.anchor.x;
                wallSprite.anchor.y = sprite.anchor.y;
                sprite.addChild(wallSprite);
            }

            if (vp.Metropolis) {
                const metroSprite = new PIXI.Sprite();
                assets.assignTexture(
                    metroSprite,
                    assets.metropolis[vp.Metropolis],
                );
                metroSprite.anchor.x = sprite.anchor.x;
                metroSprite.anchor.y = sprite.anchor.y;
                sprite.addChild(metroSprite);
            }

            break;

        case VertexPlacementType.Knight1:
            drawKnight(1);
            break;

        case VertexPlacementType.Knight2:
            drawKnight(2);
            break;

        case VertexPlacementType.Knight3:
            drawKnight(3);
            break;

        default:
            console.error("Unknown VP", vp.Type);
    }

    canvas.app.markDirty();
}

/**
 * Renders edge placement from EdgePlacement object
 * @param ep Edge placement object
 * @param removed remove this edge placement from the board
 */
export function renderEdgePlacement(ep: IEdgePlacement, removed = false) {
    // Remove old sprite
    const key = `${coordStr(ep.Location.C.C1)}.${coordStr(ep.Location.C.C2)}`;
    const curr = edgePlacements[key];
    curr?.container?.destroy({
        children: true,
    });

    // Removed
    if (removed) {
        if (curr) {
            curr.container = undefined;
        }
        return;
    }

    // Container
    const roadContainer: PIXI.Container & anim.Translatable =
        new PIXI.Container();

    // Generate sprite with correct color
    const roadSprite = new PIXI.Sprite();
    const color = hexToUrlString(ep.Owner.Color);
    assets.assignTexture(roadSprite, assets.road[color]);
    roadSprite.anchor.x = 0.5;
    roadSprite.anchor.y = 0.5;
    roadContainer.addChild(roadSprite);

    // Center point of vertices
    const fc1 = getDispCoord(ep.Location.C.C1.X, ep.Location.C.C1.Y);
    const fc2 = getDispCoord(ep.Location.C.C2.X, ep.Location.C.C2.Y);
    const fc = canvas.getScaled({
        X: (fc1.X + fc2.X) / 2,
        Y: (fc1.Y + fc2.Y) / 2,
    });
    roadContainer.x = fc.x;
    roadContainer.targetY = fc.y;
    roadContainer.y = roadContainer.targetY - 80;
    roadContainer.zIndex = 90;
    roadSprite.rotation =
        (((-60 * (1 - ep.Location.Orientation)) % 360) * Math.PI) / 180.0;

    const shadow = new PIXI.Sprite();
    assets.assignTexture(shadow, assets.road[color]);
    shadow.anchor.x = roadSprite.anchor.x;
    shadow.anchor.y = roadSprite.anchor.y;
    shadow.x = 6;
    shadow.y = 8;
    shadow.tint = 0x666666;
    shadow.rotation = roadSprite.rotation;

    roadContainer.addChild(shadow);
    roadContainer.addChild(roadSprite);

    container.addChild(roadContainer);
    roadContainer.scale.set(25 / roadSprite.texture.width);

    if (isInitComplete) {
        anim.requestTranslationAnimation([roadContainer], 4);
    } else {
        roadContainer.y = roadContainer.targetY;
    }

    // Add to global map
    ep.container = roadContainer;
    edgePlacements[key] = ep;

    canvas.app.markDirty();
}

/**
 * Renders ports from IPort object
 * @param port port object
 */
export function renderPort(port: IPort) {
    const key = edgeCoordStr(port.Edge.C);
    const curr = portSprites[key];
    if (curr && !curr.destroyed) {
        portSprites[key].destroy({ children: true });
    }

    const portShift = (orientation: number): { x: number; y: number } => {
        const scale = 25;
        switch (orientation) {
            case 0:
                return { x: scale * 0.6, y: -scale * 1.4 };
            case 1:
                return { x: scale * 1.4, y: 0 };
            case 2:
                return { x: scale * 0.8, y: scale * 1.2 };
            case 3:
                return { x: -scale * 0.6, y: scale * 1.2 };
            case 4:
                return { x: -scale * 1.4, y: 0 };
            case 5:
                return { x: -scale, y: -scale };
            default:
                return { x: 0, y: 0 };
        }
    };

    const portContainer = new PIXI.Container();

    // Center point of vertices
    const fc1 = getDispCoord(port.Edge.C.C1.X, port.Edge.C.C1.Y);
    const fc2 = getDispCoord(port.Edge.C.C2.X, port.Edge.C.C2.Y);
    const fc = canvas.getScaled({
        X: (fc1.X + fc2.X) / 2,
        Y: (fc1.Y + fc2.Y) / 2,
    });
    const shift = portShift(port.Edge.Orientation);
    portContainer.x = fc.x + shift.x;
    portContainer.y = fc.y + shift.y;
    portContainer.zIndex = 400;

    const portSprite = new PIXI.Sprite();
    assets.assignTexture(portSprite, assets.ports[port.Type]);
    portSprite.scale.set(0.25);
    portSprite.anchor.x = 0.5;
    portSprite.anchor.y = 0.5;
    portContainer.addChild(portSprite);

    boardContainer.addChild(portContainer);
    portSprites[key] = portContainer;

    canvas.app.markDirty();
}

/** Reusable highlight circle drawing */
let highlightCircle: PIXI.RenderTexture;

/**
 * Create a highlight circle sprite
 * @param C Coordinate
 */
function createHighlightSprite(C: ICoordinate) {
    // Vertex and edge hover highlight circle
    if (!highlightCircle || highlightCircle.destroyed) {
        const g = new PIXI.Graphics()
            .beginFill(0xffffff)
            .lineStyle(10, 0xffffff, 0.4)
            .drawCircle(70, 70, 70)
            .endFill();
        highlightCircle = canvas.app.generateRenderTexture(g);
    }

    // Create sprite
    const highlightSprite = new PIXI.Sprite(highlightCircle);
    const fc = canvas.getScaled(C);
    highlightSprite.x = fc.x;
    highlightSprite.y = fc.y;
    highlightSprite.zIndex = 1000;
    highlightSprite.anchor.x = 0.5;
    highlightSprite.anchor.y = 0.5;
    highlightSprite.interactive = true;
    highlightSprite.alpha = 0.5;
    highlightSprite.visible = false;
    highlightSprite.cursor = "pointer";
    highlightSprite.scale.set(0.25);
    destroyBeforeReinit.push(highlightSprite);
    return highlightSprite;
}

/**
 * Renders a vertex highlight
 * @param vertex vertex object
 */
function renderVertexHighlightSprite(vertex: UIVertex) {
    const highlightSprite = createHighlightSprite(
        getDispCoord(vertex.C.X, vertex.C.Y),
    );
    highlightSprite.on("pointerdown", (event) => {
        event.stopPropagation();
        confirmPlacement(highlightSprite, () =>
            vertexClickEvent?.(event, vertex),
        );
    });
    container.addChild(highlightSprite);
    vertex.highlightSprite = highlightSprite;
}

/**
 * Renders an edge highlight
 * @param edge edge object
 */
function renderEdgeHighlightSprite(edge: UIEdge) {
    const fc1 = getDispCoord(edge.C.C1.X, edge.C.C1.Y);
    const fc2 = getDispCoord(edge.C.C2.X, edge.C.C2.Y);

    const highlightSprite = createHighlightSprite({
        X: (fc1.X + fc2.X) / 2,
        Y: (fc1.Y + fc2.Y) / 2,
    });

    highlightSprite.on("pointerdown", (event) => {
        event.stopPropagation();
        confirmPlacement(highlightSprite, () => edgeClickEvent?.(event, edge));
    });
    container.addChild(highlightSprite);
    edge.highlightSprite = highlightSprite;

    let texType, beachzIndex;
    if (edge.IsBeach) {
        if (edge.Orientation == 2) {
            texType = assets.ROAD.ISLAND_R;
            beachzIndex = 85;
        } else if (edge.Orientation == 3) {
            texType = assets.ROAD.ISLAND_L;
            beachzIndex = 86;
        }
    }

    if (texType && beachzIndex) {
        // Create border
        const b = new PIXI.Sprite();
        b.zIndex = beachzIndex;
        assets.assignTexture(b, assets.road[texType]);

        const fc = canvas.getScaled({
            X: (fc1.X + fc2.X) / 2,
            Y: (fc1.Y + fc2.Y) / 2,
        });
        b.x = fc.x;
        b.y = fc.y;
        b.anchor.x = 0.5;
        b.anchor.y = 0.5;
        b.rotation = (((-60 * (1 - edge.Orientation)) % 360) * Math.PI) / 180.0;
        b.scale.set(110 / b.height);
        boardContainer.addChild(b);
        destroyBeforeReinit.push(b);
    }
}

/**
 * Renders a tile highlight
 * @param tile tile object
 */
function renderTileHighlightSprite(tile: UITile) {
    const highlightSprite = createHighlightSprite(
        getDispCoord(tile.Center.X, tile.Center.Y),
    );
    highlightSprite.scale.set(0.4);
    highlightSprite.on("pointerdown", (event) => {
        event.stopPropagation();
        confirmPlacement(highlightSprite, () => tileClickEvent?.(event, tile));
    });
    container.addChild(highlightSprite);
    tile.highlightSprite = highlightSprite;
}

/**
 * Render click highlights for vertices, edges and tiles
 * Also renders edge decoration
 */
export function renderClickHighlights() {
    // Set viewport size
    const h = Math.max(...Object.values(DispCoordMap).map((c) => c.Y));
    const w = Math.max(...Object.values(DispCoordMap).map((c) => c.X));
    const ss = canvas.getScaled({ X: w, Y: h });
    container.resize(
        canvas.app.view.width / 1.25,
        canvas.app.view.height / 1.25,
        ss.x + 120,
        ss.y + 120,
    );
    container.clamp({
        left: -container.worldWidth * 0.5,
        top: -container.worldHeight * 0.5,
        right: container.worldWidth * 1.5,
        bottom: container.worldHeight * 1.5,
        underflow: "none",
    });
    container.moveCenter(ss.x / 2 + 90, ss.y / 2 + 60);
    canvas.app.markDirty();

    Object.values(board.vertices).forEach(renderVertexHighlightSprite);
    Object.values(board.edges).forEach(renderEdgeHighlightSprite);

    container.sortChildren();

    boardContainer.sortChildren();
    canvas.app.markDirty();
}

/**
 * Highlight all vertices in a list
 * @param vertices list of vertices to highlight
 * @returns
 */
export function highlightVertices(vertices: UIVertex[]) {
    for (const v of vertices) {
        const vertex = board.vertices[coordStr(v.C)];
        if (!vertex?.highlightSprite) {
            return console.error(v, "not found");
        }
        vertex.highlightSprite.visible = true;
    }

    canvas.app.markDirty();
}

/**
 * Reset all vertex highlights
 */
export function resetVertexHighlights() {
    setVertexClickEvent(null);
    for (const vertex of Object.values(board.vertices)) {
        if (!vertex?.highlightSprite) {
            return console.error(vertex, "not found");
        }
        vertex.highlightSprite.visible = false;
    }

    clearPlacementConfirmation();
    canvas.app.markDirty();
}

/**
 * Highlight all edges in a list
 * @param edges List of edges to highlight
 */
export function highlightEdges(edges: UIEdge[]) {
    for (const e of edges) {
        const edge = board.edges[edgeCoordStr(e.C)];
        if (!edge?.highlightSprite) {
            return console.error(e, "not found");
        }
        edge.highlightSprite.visible = true;
    }

    canvas.app.markDirty();
}

/**
 * Reset all edge highlights
 */
export function resetEdgeHighlights() {
    setEdgeClickEvent(null);
    for (const edge of Object.values(board.edges)) {
        if (!edge?.highlightSprite) {
            console.error(edge, "not found");
            continue;
        }
        edge.highlightSprite.visible = false;
    }

    clearPlacementConfirmation();
    canvas.app.markDirty();
}

/**
 * Highlight all tiles in a list
 * @param tiles List of tiles to highlight
 */
export function highlightTiles(tiles: UITile[]) {
    for (const t of tiles) {
        const tile = board.tiles[coordStr(t.Center)];
        if (!tile?.highlightSprite) {
            console.error(t, "not found");
            continue;
        }
        tile.highlightSprite.visible = true;
    }

    canvas.app.markDirty();
}

/**
 * Reset all tile highlights
 */
export function resetTileHighlights() {
    setTileClickEvent(null);
    for (const tile of Object.values(board.tiles)) {
        if (!tile?.highlightSprite) {
            console.error(tile, "not found");
            continue;
        }
        tile.highlightSprite.visible = false;
    }

    clearPlacementConfirmation();
    canvas.app.markDirty();
}

/**
 * Initialize and/or animate the robber to a different tile
 * @param tile Tile to move the robber to
 */
export async function setRobberTile(tile: UITile) {
    if (!tile) {
        return;
    }

    if (!board.robber) {
        board.robber = new PIXI.Sprite();
        assets.assignTexture(board.robber, assets.robber);
        board.robber.zIndex = 1100;
        board.robber.scale.set(70 / board.robber.width);
        board.robber.anchor.x = 0.8;
        board.robber.anchor.y = 1;
        container.addChild(board.robber);
        board.robber.x = 500;
        board.robber.y = 500;
    }

    const fc = canvas.getScaled(getDispCoord(tile.Center));
    board.robber.targetX = fc.x - 15;
    board.robber.targetY = fc.y + 30;
    anim.requestTranslationAnimation([board.robber], 8);

    canvas.app.markDirty();
}

/**
 * Initialize and/or animate the merchant to a different tile
 * @param m merchant from game state
 */
export async function setMerchantTile(m: Merchant) {
    if (!m?.Tile) {
        return;
    }

    const color = hexToUrlString(m.Owner.Color);
    const getTex = () =>
        assets.assignTexture(board.merchant!, assets.merchant[color]);

    if (!board.merchant) {
        board.merchant = new PIXI.Sprite();
        getTex();
        board.merchant.zIndex = 180;
        board.merchant.scale.set(50 / board.merchant.texture.width);
        board.merchant.anchor.x = 0;
        board.merchant.anchor.y = 1;
        container.addChild(board.merchant);
        board.merchant.x = 500;
        board.merchant.y = 500;
    }

    const fc = canvas.getScaled(getDispCoord(m.Tile.Center));
    board.merchant.targetX = fc.x + 15;
    board.merchant.targetY = fc.y + 30;
    getTex();
    anim.requestTranslationAnimation([board.merchant], 8);

    canvas.app.markDirty();
}

/**
 * Ask the player to confirm a placement at a location
 * @param target location of confirmation
 * @param callback Callback to call when confirmation is confirmed
 */
function confirmPlacement(target: PIXI.Container, callback: () => void) {
    clearPlacementConfirmation();

    placementConfirmationWindow = new windows.YesNoWindow(
        target.x + 30,
        target.y - 40,
    );
    placementConfirmationWindow.onNo(clearPlacementConfirmation);
    placementConfirmationWindow.onYes(() => {
        clearPlacementConfirmation();
        callback();
    });
    placementConfirmationWindow.render();
    placementConfirmationWindow.container.zIndex = 1200;
    container.addChild(placementConfirmationWindow.container);
    canvas.app.markDirty();
}

/**
 * Remove the confirmation window
 */
function clearPlacementConfirmation() {
    placementConfirmationWindow?.destroy();
    placementConfirmationWindow = undefined;
    canvas.app.markDirty();
}

// Debug mode for the board
(<any>window).debugBoard = () => {
    highlightVertices(Object.values(board.vertices));
    highlightEdges(Object.values(board.edges));
    highlightTiles(Object.values(board.tiles));
    vertexClickEvent = (_, v) => console.warn(v);
    edgeClickEvent = (_, e) => console.warn(e);
    tileClickEvent = (_, t) => console.warn(t);
};
