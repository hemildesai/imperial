import * as board from "./board";
import * as dice from "./dice";
import * as state from "./state";
import * as hand from "./hand";
import * as trade from "./trade";
import * as actions from "./actions";
import * as buttons from "./buttons";
import * as notif from "./notif";
import * as tsg from "../tsg";
import { initialize as initializeSettings } from "./settings";
import { handleGameOver } from "./game-over";
import { showErrorWindow } from "./windows";
import { chatMessage } from "./chat";
import ReconnectingWebSocket from "reconnecting-websocket";
import CommandHub from "./commands";
import { WsResponse, MSG_RES_TYPE } from "./sock";

let commandHub: CommandHub;
let thisPlayerOrder: number;
let receiving = false;

export function setGameWsReceiving(val: boolean) {
    receiving = val;
}

export function getCommandHub(): CommandHub {
    return commandHub;
}

export function getThisPlayerOrder(): number {
    return thisPlayerOrder;
}

export function isSpectator() {
    return thisPlayerOrder > 200;
}

/** Initialize the command hub */
export function initialize(socket: ReconnectingWebSocket, order: number) {
    commandHub = new CommandHub(socket);
    thisPlayerOrder = order;
}

export function handleResponse(msg: WsResponse) {
    // Do not receive anything before settings
    if (msg.t == MSG_RES_TYPE.INIT_SETTINGS) {
        setGameWsReceiving(true);
    } else if (!receiving) {
        return;
    }

    // Execute the state change
    switch (msg.t) {
        case MSG_RES_TYPE.INIT_SETTINGS:
            // Always the first message
            board.setInitComplete(false);
            const settings = new tsg.GameSettings(msg.data);
            state.setSettings(settings);
            initializeSettings(settings);
            return;

        case MSG_RES_TYPE.INIT_MAPPING:
            board.setDispMapping(msg.data);
            return;

        case MSG_RES_TYPE.INIT_TILE:
            const tile = new tsg.Tile(msg.data);
            board.renderTile(tile);
            return;

        case MSG_RES_TYPE.INIT_VERTEX:
            const vertex = new tsg.Vertex(msg.data);
            board.getBoard().vertices[board.coordStr(vertex.C)] = vertex;
            return;

        case MSG_RES_TYPE.INIT_EDGE:
            const edge = new tsg.Edge(msg.data);
            board.getBoard().edges[board.edgeCoordStr(edge.C)] = edge;
            return;

        case MSG_RES_TYPE.INIT_PORT:
            const port = new tsg.Port(msg.data);
            board.renderPort(port);
            return;

        case MSG_RES_TYPE.INIT_COMPLETE:
            board.renderClickHighlights();
            board.setInitComplete(true);
            return;

        case MSG_RES_TYPE.VERTEX_PLACEMENT:
            board.renderVertexPlacement(new tsg.VertexPlacement(msg.data));
            return;

        case MSG_RES_TYPE.VERTEX_PLACEMENT_REM:
            board.renderVertexPlacement(
                new tsg.VertexPlacement(msg.data),
                true,
            );
            return;

        case MSG_RES_TYPE.EDGE_PLACEMENT:
            board.renderEdgePlacement(new tsg.Road(msg.data));
            return;

        case MSG_RES_TYPE.EDGE_PLACEMENT_REM:
            board.renderEdgePlacement(new tsg.Road(msg.data), true);
            return;

        case MSG_RES_TYPE.GAME_STATE:
            const gs = new tsg.GameState(msg.data);
            dice.setFlashing(
                gs.NeedDice && gs.CurrentPlayerOrder == getThisPlayerOrder(),
            );
            state.renderGameState(gs, commandHub);
            board.setRobberTile(gs.Robber.Tile);
            board.setMerchantTile(gs.Merchant);
            return;

        case MSG_RES_TYPE.SECRET_STATE:
            const data = new tsg.PlayerSecretState(msg.data);
            hand.renderPlayerHand(data);
            state.setLastKnownSecretVictoryPoints(data.VictoryPoints);
            buttons.updateButtonsSecretState(data);
            trade.updateTradeRatios(data.TradeRatios);
            return;

        case MSG_RES_TYPE.TRADE_OFFER:
            trade.showTradeOffer(new tsg.TradeOffer(msg.data));
            return;

        case MSG_RES_TYPE.DICE:
            dice.handleMessage(new tsg.DieRollState(msg.data));
            return;

        case MSG_RES_TYPE.CARD_MOVE:
            state.addPendingCardMoves([new tsg.CardMoveInfo(msg?.data)]);
            return;

        case MSG_RES_TYPE.DEV_CARD_USE:
            notif.showDevCardUse(new tsg.DevCardUseInfo(msg?.data));
            return;

        case MSG_RES_TYPE.ACTION_EXPECTED:
            actions.handle(new tsg.PlayerAction(msg.data));
            return;

        case MSG_RES_TYPE.TRADE_CLOSE_OFFER:
            trade.closeTradeOffer();
            return;

        case MSG_RES_TYPE.GAME_OVER:
            handleGameOver(new tsg.GameOverMessage(msg.data));
            return;

        case MSG_RES_TYPE.ERROR:
            showErrorWindow("Error", msg.data);
            return;

        case MSG_RES_TYPE.END_SESS:
            showErrorWindow("Disconnected", msg.data);
            return;

        case MSG_RES_TYPE.CHAT:
            chatMessage(msg.data);
            return;

        case MSG_RES_TYPE.TILE_FOG:
            const fogTile = new tsg.Tile(msg.data);
            board.renderTile(fogTile);
            return;

        case MSG_RES_TYPE.SPECTATOR_LIST:
            state.renderSpectators(msg.data);
            return;

        default:
            console.error("Unknown WS message", msg);
            return;
    }
}
