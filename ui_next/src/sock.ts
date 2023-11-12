import { ICoordinate, IEdgeCoordinate } from "../tsg";
import { encode } from "@msgpack/msgpack";
import ReconnectingWebSocket from "reconnecting-websocket";
import { CardType } from "./entities";

export enum SOCKET_STATE {
    INIT = 1,
    OPEN = 2,
    CLOSE = 3,
    ERROR = 4,
}
/**
 * Type of message being sent
 * Must be included with all messages
 */
export enum MSG_TYPE {
    // Game messages
    INIT = "i",
    BUILD = "b",
    REQUEST_INFO = "r",
    ROLL_DICE = "d",
    END_TURN = "et",
    TRADE = "tr",
    ACTION_RESPONSE = "ar",
    SPECIAL_BUILD = "sb",

    // Lobby messages
    UPDATE_USERNAME = "uu",
    SET_SETTINGS = "ss",
    SET_ADVANCED_SETTINGS = "sas",
    BOT_ADD = "bot_a",
    KICK = "k",
    READY = "r",
    START_GAME = "sg",
    SINGLE_PLAYER = "sp",

    // CHAT MESSAGE
    CHAT = "c",
}

/**
 * Type of trade command to execute
 */
export enum TRADE_TYPE {
    CREATE_OFFER = "co",
    ACCEPT_OFFER = "ao",
    REJECT_OFFER = "ro",
    CLOSE_OFFER = "close",
}

/**
 * Type of object to build
 */
export enum BUILD_OBJECT {
    SETTLEMENT = "s",
    CITY = "c",
    ROAD = "r",
    DEVELOPMENT_CARD = "dc",
    USE_DEVELOPMENT_CARD = "udc",

    KNIGHT = "k",
    ACTIVATE_KNIGHT = "ka",
    ROBBER_KNIGHT = "kr",
    MOVE_KNIGHT = "km",
    IMPROVEMENT = "i",
    WALL = "w",
}

/**
 * Information request type
 */
export enum REQUEST_TYPE {
    BUILD_SETTLEMENT_LOCATIONS = "bs",
    BUILD_CITY_LOCATIONS = "bc",
    BUILD_ROAD_LOCATIONS = "br",
    GAME_STATE = "gs",
    PLAYER_HAND = "ph",
}

/** Outgoing WebSocket message */
export type WsMessage = {
    l: MSG_LOCATION_TYPE;
} & WsDataMessage;

export interface WsDataMessage {
    t: MSG_TYPE;

    // Game Params
    o?: BUILD_OBJECT;
    rt?: REQUEST_TYPE;
    c?: ICoordinate | IEdgeCoordinate;
    ct?: CardType;

    // Trade
    tt?: TRADE_TYPE;
    offer?: { Give: number[]; Ask: number[] }; // offer details for creation
    oid?: number; // offer ID
    acceptingPlayer?: number; // accepting player

    // Actions
    ar_data?: any; // Action Response Data
    dct?: number; // Development card type to use

    // Lobby params
    username?: string;
    settings?: any;
    advanced?: any;
    ready?: boolean;

    // Chat message
    cmsg?: string;
}

/** Message response type */
export enum MSG_RES_TYPE {
    // Game
    INIT_SETTINGS = "i-st",
    INIT_MAPPING = "i-m",
    INIT_TILE = "i-t",
    INIT_VERTEX = "i-v",
    INIT_EDGE = "i-e",
    INIT_COMPLETE = "i-c",
    INIT_PORT = "i-p",

    VERTEX_PLACEMENT = "vp",
    VERTEX_PLACEMENT_REM = "vpr",
    EDGE_PLACEMENT = "ep",
    EDGE_PLACEMENT_REM = "epr",

    CARD_MOVE = "cm",
    DEV_CARD_USE = "du",

    GAME_STATE = "gs",
    SECRET_STATE = "ss",
    TRADE_OFFER = "to",
    TRADE_CLOSE_OFFER = "tco",

    DICE = "d",

    ACTION_EXPECTED = "a",

    GAME_OVER = "gameover",

    ERROR = "err",
    END_SESS = "endsess",

    TILE_FOG = "tf",

    // Lobby
    LOBBY_PLAYERS = "rr-lp",
    LOBBY_GAME_STARTED = "rr-lgs",
    LOBBY_SETTINGS = "rr-s",
    LOBBY_ADVANCED_SETTINGS = "rr-as",
    LOBBY_SETTINGS_OPTIONS = "rr-so",

    // Other
    CHAT = "cht",
    SPECTATOR_LIST = "spec",
}

export enum MSG_LOCATION_TYPE {
    GAME = "g",
    LOBBY = "l",
    CHAT = "c",
}

/** Incoming WebSocket message */
export interface WsResponse {
    l: MSG_LOCATION_TYPE;
    t: MSG_RES_TYPE;
    data: any;
}

/**
 * Send a message to the websocket
 * @param socket socket abstraction
 * @param message WsMessage to send
 */
export function sendMessage(
    socket: ReconnectingWebSocket | WebSocket,
    message: WsMessage,
) {
    try {
        socket.send(encode(message));
    } catch (error) {
        console.error(error);
    }
}
