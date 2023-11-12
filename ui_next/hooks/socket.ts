import {
    Dispatch,
    MutableRefObject,
    SetStateAction,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    handleResponse as handleResponseForGame,
    initialize as initializeForGame,
    setGameWsReceiving,
} from "../src/ws";
import {
    MSG_LOCATION_TYPE,
    MSG_TYPE,
    WsResponse,
    sendMessage,
    SOCKET_STATE,
    MSG_RES_TYPE,
} from "../src/sock";

import ReconnectingWebSocket from "reconnecting-websocket";
import { isBrowser } from "../utils";
import { useAnonymousAuth } from "./auth";
import { decode } from "@msgpack/msgpack";

function initialize(
    ws: ReconnectingWebSocket,
    location: MSG_LOCATION_TYPE,
    dispatch: Dispatch<WsResponse> | undefined,
    setSocketState: Dispatch<SetStateAction<SOCKET_STATE>>,
    order: number | undefined,
) {
    ws.addEventListener("message", (e) => handleEvent(e, dispatch, ws));

    ws.addEventListener("open", () => {
        setSocketState(SOCKET_STATE.OPEN);
        setGameWsReceiving(false);
        sendMessage(ws, {
            l: location,
            t: MSG_TYPE.INIT,
        });
    });

    ws.addEventListener("error", (e) => {
        setSocketState(SOCKET_STATE.ERROR);
    });

    initializeForGame(ws, order!);
}

export function disconnect(
    socket: MutableRefObject<ReconnectingWebSocket | null>,
) {
    if (socket.current) {
        if (
            socket.current.readyState === WebSocket.OPEN ||
            socket.current.readyState === WebSocket.CONNECTING
        ) {
            socket.current.close(3001, "Client disconnected");
        }
        socket.current = null;
    }
}

function handleEvent(
    event: MessageEvent,
    dispatch: Dispatch<WsResponse> | undefined,
    ws: ReconnectingWebSocket,
) {
    try {
        event.data.arrayBuffer().then((buf: ArrayBuffer) => {
            handleResponse(decode(buf) as WsResponse, dispatch, ws);
        });
    } catch (err) {
        console.error(err);
    }
}

function handleResponse(
    msg: WsResponse,
    dispatch: Dispatch<WsResponse> | undefined,
    ws: ReconnectingWebSocket,
) {
    if (msg.t === MSG_RES_TYPE.END_SESS) {
        // Show erorr
        alert(msg.data);

        // Banned from game
        if ((<string>msg.data).includes("E74")) {
            window.location.href = "/lobby";
        }

        // Do not reconnect
        ws.close(1000, "Client closed connection");
    }

    switch (msg.l) {
        case MSG_LOCATION_TYPE.GAME:
            handleResponseForGame(msg);
            break;
        case MSG_LOCATION_TYPE.LOBBY:
            if (dispatch) {
                dispatch(msg);
            } else {
                console.error(
                    `Lobby message ${msg} received but no dispatch function provided`,
                );
            }
            break;
        default:
            console.error(msg);
            break;
    }
}

export const useSocket = (
    gameId: string | undefined,
    doInit: boolean,
    location: MSG_LOCATION_TYPE = MSG_LOCATION_TYPE.GAME,
    dispatch: Dispatch<WsResponse> | undefined,
    order: number | undefined,
    gameExists: boolean | null,
    gameServer: string,
) => {
    const socket: MutableRefObject<ReconnectingWebSocket | null> = useRef(null);
    const [token, _] = useAnonymousAuth();
    const [init, setInit] = useState<boolean>(doInit);
    const [socketState, setSocketState] = useState<SOCKET_STATE>(
        SOCKET_STATE.INIT,
    );

    useEffect(() => {
        if (isBrowser && gameId && token && init && gameExists && gameServer) {
            if (socket.current === null) {
                const proto = gameServer.includes("https") ? "wss" : "ws";
                const ws = new ReconnectingWebSocket(
                    `${proto}://${gameServer.replace(
                        /^https?\:\/\//i,
                        "",
                    )}/socket?id=${gameId}&token=${token}`,
                    [],
                    {
                        connectionTimeout: 3000,
                        maxRetries: 20,
                        minReconnectionDelay: 100,
                        maxReconnectionDelay: 2000,
                    },
                );
                initialize(ws, location, dispatch, setSocketState, order);

                socket.current = ws;
                window.addEventListener("beforeunload", () => {
                    disconnect(socket);
                });
                return () => disconnect(socket);
            }
        }
    }, [
        gameId,
        token,
        init,
        location,
        dispatch,
        order,
        gameExists,
        gameServer,
    ]);

    return { socket, socketState, setInit };
};
