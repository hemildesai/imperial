import ReconnectingWebSocket from "reconnecting-websocket";
import { CardType } from "./entities";
import * as socketTypes from "./sock";

export default class CommandHub {
    constructor(private socket: ReconnectingWebSocket) {
        return this;
    }

    /**
     * Send a message to the game handler.
     * @param msg Message to send
     */
    public sendGameMessage(msg: socketTypes.WsDataMessage) {
        if (this.socket === null) {
            console.error("Socket is null");
            return;
        }

        socketTypes.sendMessage(this.socket, {
            l: socketTypes.MSG_LOCATION_TYPE.GAME,
            ...JSON.parse(JSON.stringify(msg)),
        });
    }

    /**
     * Send a message to the chat handler.
     * @param msg Message to send
     */
    public sendChatMessage = (msg: string) => {
        socketTypes.sendMessage(this.socket, {
            l: socketTypes.MSG_LOCATION_TYPE.CHAT,
            t: socketTypes.MSG_TYPE.CHAT,
            cmsg: msg,
        });
    };

    public buildSettlement = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.SETTLEMENT,
        });
    };

    public buildCity = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.CITY,
        });
    };

    public buildRoad = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.ROAD,
        });
    };

    public getGameState = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.REQUEST_INFO,
            rt: socketTypes.REQUEST_TYPE.GAME_STATE,
        });
    };

    public getPlayerHand = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.REQUEST_INFO,
            rt: socketTypes.REQUEST_TYPE.PLAYER_HAND,
        });
    };

    public rollDice = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.ROLL_DICE,
        });
    };

    public buyDevelopmentCard = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.DEVELOPMENT_CARD,
        });
    };

    public useDevelopmentCard(type: number) {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.USE_DEVELOPMENT_CARD,
            dct: type,
        });
    }

    public buildKnight = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.KNIGHT,
        });
    };

    public activateKnight = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.ACTIVATE_KNIGHT,
        });
    };

    public robberKnight = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.ROBBER_KNIGHT,
        });
    };

    public moveKnight = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.MOVE_KNIGHT,
        });
    };

    public buildWall = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.WALL,
        });
    };

    public buildCityImprovement = (ct: CardType) => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.BUILD,
            o: socketTypes.BUILD_OBJECT.IMPROVEMENT,
            ct: ct,
        });
    };

    public endTurn = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.END_TURN,
        });
    };

    public specialBuild = () => {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.SPECIAL_BUILD,
        });
    };

    public createTradeOffer(offer: number[], ask: number[]) {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.TRADE,
            tt: socketTypes.TRADE_TYPE.CREATE_OFFER,
            offer: {
                Give: offer,
                Ask: ask,
            },
        });
    }

    public acceptTradeOffer(offerId: number) {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.TRADE,
            tt: socketTypes.TRADE_TYPE.ACCEPT_OFFER,
            oid: offerId,
        });
    }

    public rejectTradeOffer(offerId: number) {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.TRADE,
            tt: socketTypes.TRADE_TYPE.REJECT_OFFER,
            oid: offerId,
        });
    }

    public closeTradeOffer(offerId: number, acceptingPlayer: number) {
        this.sendGameMessage({
            t: socketTypes.MSG_TYPE.TRADE,
            tt: socketTypes.TRADE_TYPE.CLOSE_OFFER,
            oid: offerId,
            acceptingPlayer: acceptingPlayer,
        });
    }
}
