import { Sprite, Container } from "pixi.js";
import * as tsg from "../tsg";
import { IEdge, ITile, IVertex, IRoad, IPort, ICardDeck } from "../tsg";
import * as anim from "./animation";

export type CoordStr = string;

export type IBoard = {
    vertices: { [key: string]: UIVertex };
    edges: { [key: string]: UIEdge };
    tiles: { [key: string]: UITile };
    ports: IPort[];
    robber?: anim.TranslatableSprite;
    merchant?: anim.TranslatableSprite;
};

export type UITile = ITile & {
    sprite?: Sprite;
    highlightSprite?: Sprite;
    numberSprite?: anim.TranslatableSprite;
};

export type UIVertex = IVertex & {
    highlightSprite?: Sprite;
};

export type UIEdge = IEdge & {
    highlightSprite?: Sprite;
};

export enum PortType {
    Any = 6,
    Wood = 1,
    Brick = 2,
    Wool = 3,
    Wheat = 4,
    Ore = 5,
}

export type IVertexPlacement = tsg.IVertexPlacement & {
    sprite?: Sprite;
};

export type IEdgePlacement = IRoad & {
    container?: Container;
};

export type IHand = {
    CardDeckMap: { [key: number]: ICardDeck };
};

export enum CardType {
    Desert = 0,
    Wood = 1,
    Brick = 2,
    Wool = 3,
    Wheat = 4,
    Ore = 5,
    Paper = 6,
    Cloth = 7,
    Coin = 8,
}

export enum TileType {
    Wood = 1,
    Brick = 2,
    Wool = 3,
    Wheat = 4,
    Ore = 5,
    Desert = 0,
    Fog = 6,
    // Sea = 7,
    None = 8,
    Random = 9,
    Gold = 21,
}

export enum DevelopmentCardType {
    Knight = 1,
    VictoryPoint = 2,
    RoadBuilding = 3,
    YearOfPlenty = 4,
    Monopoly = 5,

    ProgressPaperAlchemist = 6,
    ProgressPaperCrane = 7,
    ProgressPaperEngineer = 8,
    ProgressPaperInventor = 9,
    ProgressPaperIrrigation = 10,
    ProgressPaperMedicine = 11,
    ProgressPaperMining = 12,
    ProgressPaperPrinter = 13,
    ProgressPaperRoadBuilding = 14,
    ProgressPaperSmith = 15,

    ProgressClothCommercialHarbor = 16,
    ProgressClothMasterMerchant = 17,
    ProgressClothMerchant = 18,
    ProgressClothMerchantFleet = 19,
    ProgressClothResourceMonopoly = 20,
    ProgressClothTradeMonopoly = 21,

    ProgressCoinBishop = 22,
    ProgressCoinConstitution = 23,
    ProgressCoinDeserter = 24,
    ProgressCoinDiplomat = 25,
    ProgressCoinIntrigue = 26,
    ProgressCoinSaboteur = 27,
    ProgressCoinSpy = 28,
    ProgressCoinWarlord = 29,
    ProgressCoinWedding = 30,
}

export enum VertexPlacementType {
    Settlement = 1,
    City = 2,
    Knight1 = 4,
    Knight2 = 5,
    Knight3 = 6,
}

export enum EdgePlacementType {
    Road = 1,
}

export enum BuildableType {
    Settlement = 1,
    City = 2,
    Road = 3,
    Wall = 7,
}
