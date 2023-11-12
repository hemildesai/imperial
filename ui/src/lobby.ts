import { jwtDecode } from "jwt-decode";
import { IAdvancedSettings, IGameSettings, LobbyPlayerState } from "../tsg";
import { MSG_RES_TYPE, WsResponse } from "./sock";

export enum GAME_MODE {
    Base = 1,
    CitiesAndKnights = 2,
}

export const DISPLAY_GAME_MODE = {
    [GAME_MODE.Base]: "Basic",
    [GAME_MODE.CitiesAndKnights]: "W&W",
};

export type LobbyState = {
    players: LobbyPlayerState[];
    maxPlayers: number;
    started: boolean;
    order: number;
    ready: boolean;
    canStart: boolean;
    settings: IGameSettings;
    advanced: IAdvancedSettings;
    settingsOptions?: {
        MapName: string[];
    };
    chatMessages: { id: number; msg: string }[];
};

export const lobbyReducer = (
    state: LobbyState,
    action: WsResponse,
): LobbyState => {
    switch (action.t) {
        case MSG_RES_TYPE.LOBBY_PLAYERS:
            const players: LobbyPlayerState[] = action.data.map(
                (p: any) => new LobbyPlayerState(p),
            );
            const newState = {
                ...state,
                players: players,
                ready:
                    players.find((p) => p.Order === state.order)?.Ready ??
                    false,
                canStart: players.every((p) => p.Ready),
            };

            const token = localStorage.getItem("auth");
            if (token) {
                const decoded = jwtDecode(token) as any;
                for (const i in newState.players) {
                    if (newState.players[i].Username === decoded.username) {
                        newState.order = newState.players[i].Order;
                    }
                }
            }

            return newState;
        case MSG_RES_TYPE.LOBBY_GAME_STARTED:
            return {
                ...state,
                started: true,
                order: action.data,
            };

        case MSG_RES_TYPE.LOBBY_SETTINGS:
            return {
                ...state,
                settings: action.data,
            };

        case MSG_RES_TYPE.LOBBY_ADVANCED_SETTINGS:
            return {
                ...state,
                advanced: action.data,
            };

        case MSG_RES_TYPE.LOBBY_SETTINGS_OPTIONS:
            return {
                ...state,
                settingsOptions: action.data,
            };

        case MSG_RES_TYPE.CHAT:
            const t = action.data.text;
            const l = state.chatMessages.length;
            // Weird stuff ...
            if (l == 0 || state.chatMessages[l - 1].msg != t) {
                state.chatMessages.push({
                    id: l,
                    msg: t,
                });
            }
            return { ...state };

        case MSG_RES_TYPE.ERROR:
            alert(action.data);
            return state;

        case MSG_RES_TYPE.END_SESS:
            console.error("Disconnected from server");
            return state;

        default:
            console.error(action);
            return state;
    }
};

export const getInitialLobbyState = (): LobbyState => ({
    players: [],
    maxPlayers: 4,
    started: false,
    order: -1,
    settings: {
        Mode: GAME_MODE.Base,
        Private: false,
        MapName: "Base",
        DiscardLimit: 0,
        VictoryPoints: 0,
        SpecialBuild: false,
        MaxPlayers: 4,
        EnableKarma: true,
        Speed: "normal",
        Advanced: false,
    },
    advanced: {
        RerollOn7: false,
    },
    ready: false,
    canStart: false,
    chatMessages: [],
});
