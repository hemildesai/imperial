import {
    ChangeEventHandler,
    Fragment,
    FunctionComponent,
    KeyboardEventHandler,
    useEffect,
    useReducer,
    useState,
} from "react";
import { classNames } from "../utils/styles";
import { useSocket } from "../hooks/socket";
import {
    MSG_LOCATION_TYPE,
    MSG_TYPE,
    sendMessage,
    SOCKET_STATE,
    WsMessage,
} from "../src/sock";
import { lobbyReducer, getInitialLobbyState, GAME_MODE } from "../src/lobby";
import Error from "next/error";
import Pixi from "./pixi";
import PlayerList from "./playerList";
import { disconnect } from "../hooks/socket";
import { useGameServer } from "../hooks/gameServer";
import { white as spinner } from "./spinner";
import { useRouter } from "next/router";
import Header from "./header";
import { IAdvancedSettings, IGameSettings } from "../tsg";
import { capitalizeFirstLetter, toggleFullscreen } from "../utils";
import { Combobox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";

const selectClasses =
    "form-select appearance-none block w-full px-3 py-1.5 text-lg font-normal text-gray-700 bg-white bg-clip-padding bg-no-repeat border border-solid border-gray-300 rounded transition ease-in-out m-0 focus:text-gray-700 focus:bg-white focus:border-blue-600 focus:outline-none";

const sendSinglePlayerMessage = (e: any) => {
    const target: WebSocket = e.target;
    const msg: WsMessage = {
        l: MSG_LOCATION_TYPE.LOBBY,
        t: MSG_TYPE.SINGLE_PLAYER,
    };
    sendMessage(target, msg);
};

const Game: FunctionComponent<{ gameId: string }> = ({ gameId }) => {
    const [lobbyState, dispatch] = useReducer(
        lobbyReducer,
        getInitialLobbyState(),
    );
    const router = useRouter();

    let chatDiv: HTMLDivElement | null;

    useEffect(() => {
        if (chatDiv) {
            chatDiv.scrollTop = chatDiv.scrollHeight;
        }
    });

    const [gameServer, gameExists] = useGameServer(gameId);
    const { socket, socketState } = useSocket(
        gameId,
        true,
        MSG_LOCATION_TYPE.LOBBY,
        dispatch,
        undefined,
        gameExists,
        gameServer,
    );

    if (router.query.sp && socket.current) {
        socket.current.removeEventListener("open", sendSinglePlayerMessage);
        socket.current.addEventListener("open", sendSinglePlayerMessage);
        if (socket.current.OPEN) {
            sendSinglePlayerMessage({ target: socket.current });
        }
    }

    const [mapQuery, setMapQuery] = useState("");
    const filteredMaps =
        (mapQuery === ""
            ? lobbyState.settingsOptions?.MapName
            : lobbyState.settingsOptions?.MapName.filter((n) =>
                  n
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .includes(mapQuery.toLowerCase().replace(/\s+/g, "")),
              )) || [];

    const changeMode: ChangeEventHandler<HTMLSelectElement> = (event) => {
        lobbyState.settings.Mode = Number(event.target.value);
        lobbyState.settings.VictoryPoints =
            lobbyState.settings.Mode == GAME_MODE.CitiesAndKnights ? 13 : 10;
        sendSettings();
    };

    const changeMap = (name: string) => {
        lobbyState.settings.MapName = name;
        sendSettings();
    };

    const changeMaxPlayers: ChangeEventHandler<HTMLSelectElement> = (event) => {
        lobbyState.settings.MaxPlayers = Number(event.target.value);
        lobbyState.settings.SpecialBuild = lobbyState.settings.MaxPlayers > 4;
        sendSettings();
    };

    const changeDiscard: ChangeEventHandler<HTMLSelectElement> = (event) => {
        lobbyState.settings.DiscardLimit = Number(event.target.value);
        sendSettings();
    };

    const changeVicP: ChangeEventHandler<HTMLSelectElement> = (event) => {
        lobbyState.settings.VictoryPoints = Number(event.target.value);
        sendSettings();
    };

    const changeSpeed: ChangeEventHandler<HTMLSelectElement> = (event) => {
        lobbyState.settings.Speed = event.target.value;
        sendSettings();
    };

    const sendSettings = () => {
        if (socket.current != null) {
            const msg: WsMessage = {
                l: MSG_LOCATION_TYPE.LOBBY,
                t: MSG_TYPE.SET_SETTINGS,
                settings: lobbyState.settings,
            };
            sendMessage(socket.current, msg);
        }
    };

    const sendAdvancedSettings = () => {
        if (socket.current != null) {
            const msg: WsMessage = {
                l: MSG_LOCATION_TYPE.LOBBY,
                t: MSG_TYPE.SET_ADVANCED_SETTINGS,
                advanced: lobbyState.advanced,
            };
            sendMessage(socket.current, msg);
        }
    };

    const botAdd = () => {
        if (socket.current != null) {
            const msg: WsMessage = {
                l: MSG_LOCATION_TYPE.LOBBY,
                t: MSG_TYPE.BOT_ADD,
            };
            sendMessage(socket.current, msg);
        }
    };

    const changeReady: ChangeEventHandler<HTMLInputElement> = (event) => {
        if (socket.current != null) {
            const msg: WsMessage = {
                l: MSG_LOCATION_TYPE.LOBBY,
                t: MSG_TYPE.READY,
                ready: Boolean(event.target.checked),
            };
            sendMessage(socket.current, msg);
        }
    };

    const startGame = () => {
        if (socket.current != null) {
            const msg: WsMessage = {
                l: MSG_LOCATION_TYPE.LOBBY,
                t: MSG_TYPE.START_GAME,
            };
            sendMessage(socket.current, msg);
        }
    };

    const sendChat: KeyboardEventHandler<HTMLInputElement> = (event) => {
        let val: string = (event.target as any).value;
        val = val.trim();
        if (event.key.includes("Enter") && socket.current != null && val) {
            const msg: WsMessage = {
                l: MSG_LOCATION_TYPE.CHAT,
                t: MSG_TYPE.CHAT,
                cmsg: val,
            };
            (event.target as any).value = "";
            sendMessage(socket.current, msg);
        }
    };

    if (socketState == SOCKET_STATE.ERROR || gameExists === false)
        return (
            <>
                <Header />
                <Error statusCode={404} />
            </>
        );

    if (socketState == SOCKET_STATE.INIT) {
        return (
            <>
                <Header />
                <div
                    className={classNames("text-2xl font-semibold text-white")}
                ></div>
                <div className="text-white w-full h-screen flex">
                    {spinner()}
                </div>
            </>
        );
    }

    if (lobbyState.started) {
        disconnect(socket);
        return (
            <>
                <Pixi gameId={gameId} order={lobbyState.order} />
                {/* We don't do portrait */}
                <div className="bg-white p-2 invisible portrait:visible">
                    <div>
                        The game is best played in landscape mode on a mobile
                        device.
                    </div>

                    <button
                        className="flex items-center justify-center px-4 py-1 mt-2 rounded-md text-base font-medium text-white bg-indigo-700"
                        onClick={toggleFullscreen}
                    >
                        Toggle Fullscreen
                    </button>
                </div>
            </>
        );
    }

    function getCheckBox(text: string, setting: keyof IGameSettings) {
        const changeVal: ChangeEventHandler<HTMLInputElement> = (event) => {
            lobbyState.settings[setting] = Boolean(
                event.target.checked,
            ) as never;
            sendSettings();
        };

        return (
            <div className="p-1 basis-full lg:basis-1/2">
                <div
                    className={classNames(
                        "px-4 pt-3 pb-2 rounded-md",
                        lobbyState.settings[setting]
                            ? "bg-red-500"
                            : "bg-indigo-700",
                    )}
                >
                    <div className="flex justify-center">
                        <div className="w-full">
                            <input
                                className={classNames(
                                    "border rounded-sm bg-white checked:bg-indigo-600 checked:border-indigo-600",
                                    "focus:outline-none transition duration-200 align-top bg-no-repeat bg-center bg-contain float-left mt-1.5 mr-2",
                                    lobbyState.order === 0
                                        ? "cursor-pointer"
                                        : "",
                                )}
                                type="checkbox"
                                aria-label={text}
                                checked={
                                    lobbyState.settings[setting] as boolean
                                }
                                id={setting}
                                disabled={lobbyState.order !== 0}
                                onChange={changeVal}
                            />
                            <label
                                className="block text-lg text-left mb-1 text-white cursor-pointer"
                                htmlFor={setting}
                            >
                                {text}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    function getAdvancedCheckBox(
        text: string,
        setting: keyof IAdvancedSettings,
    ) {
        const changeVal: ChangeEventHandler<HTMLInputElement> = (event) => {
            lobbyState.advanced[setting] = Boolean(
                event.target.checked,
            ) as never;
            sendAdvancedSettings();
        };

        return (
            <div className="p-1 basis-full lg:basis-1/3">
                <div
                    className={classNames(
                        "px-4 pt-3 pb-2 rounded-md",
                        lobbyState.advanced[setting]
                            ? "bg-red-500"
                            : "bg-indigo-700",
                    )}
                >
                    <div className="flex justify-center">
                        <div className="w-full">
                            <input
                                className={classNames(
                                    "border rounded-sm bg-white checked:bg-indigo-600 checked:border-indigo-600",
                                    "focus:outline-none transition duration-200 align-top bg-no-repeat bg-center bg-contain float-left mt-1.5 mr-2",
                                    lobbyState.order === 0
                                        ? "cursor-pointer"
                                        : "",
                                )}
                                type="checkbox"
                                aria-label={text}
                                checked={
                                    lobbyState.advanced[setting] as boolean
                                }
                                id={setting}
                                disabled={lobbyState.order !== 0}
                                onChange={changeVal}
                            />
                            <label
                                className="block text-lg text-left mb-1 text-white"
                                htmlFor={setting}
                            >
                                {text}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header />
            <div className="flex flex-col h-[90vh] py-5 xl:px-12 lg:px-4 px-2 xl:flex-row mx-auto overflow-auto">
                <div className="md:flex md:flex-row xl:flex-none xl:basis-2/3">
                    <div className="basis-full bg-black bg-opacity-50 backdrop-blur rounded-xl text-center p-6 flex flex-col md:basis-1/2 xl:basis-2/3 overflow-auto">
                        <div className="basis-full">
                            <div className="basis-auto m-1 text-white text-3xl p-3 pb-6">
                                Game Settings
                            </div>

                            <div className="flex flex-col lg:flex-row mb-4 md:mb-0">
                                {getCheckBox("Private Game", "Private")}
                                {getCheckBox(
                                    "Special Build Phase",
                                    "SpecialBuild",
                                )}
                            </div>

                            <div className="flex flex-col lg:flex-row mb-4 md:mb-0">
                                {getCheckBox("Enable Karma", "EnableKarma")}
                                {getCheckBox("Advanced", "Advanced")}
                            </div>

                            <div className="flex flex-col lg:flex-row mt-2">
                                <div className="basis-full lg:basis-1/2 rounded-xl m-1">
                                    {/* Game mode selection */}
                                    <div className="flex justify-center">
                                        <div className="w-full">
                                            <label
                                                className="block text-white text-lg mb-1"
                                                htmlFor="gameMode"
                                            >
                                                Complexity
                                            </label>
                                            <select
                                                className={selectClasses}
                                                aria-label="Game Mode"
                                                id="gameMode"
                                                onChange={changeMode}
                                                disabled={
                                                    lobbyState.order !== 0
                                                }
                                                value={lobbyState.settings.Mode}
                                            >
                                                <option value={GAME_MODE.Base}>
                                                    Basic
                                                </option>
                                                <option
                                                    value={
                                                        GAME_MODE.CitiesAndKnights
                                                    }
                                                >
                                                    Wonders &amp; Warriors
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="basis-full lg:basis-1/2 rounded-xl m-1">
                                    {/* Map selection */}
                                    <div className="w-full top-16">
                                        <label
                                            className="block text-white text-lg mb-1"
                                            htmlFor="gameMode"
                                        >
                                            Map Name
                                        </label>
                                        <div
                                            className={classNames(
                                                lobbyState.order !== 0
                                                    ? "opacity-[75%]"
                                                    : "",
                                            )}
                                        >
                                            <Combobox
                                                value={
                                                    lobbyState.settings.MapName
                                                }
                                                onChange={changeMap}
                                                disabled={
                                                    lobbyState.order !== 0
                                                }
                                            >
                                                <div className="relative mt-1">
                                                    <div className="relative w-full text-left bg-white rounded-md shadow-md cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-teal-300 focus-visible:ring-offset-2 sm:text-sm overflow-hidden">
                                                        <Combobox.Input
                                                            className="w-full border-none focus:ring-0 py-2 pl-3 pr-10 leading-6 text-gray-900 text-lg"
                                                            autoComplete="off"
                                                            onChange={(
                                                                event: any,
                                                            ) =>
                                                                setMapQuery(
                                                                    event.target
                                                                        .value,
                                                                )
                                                            }
                                                        />
                                                        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                                            <ChevronUpDownIcon
                                                                className="w-5 h-5 text-gray-400"
                                                                aria-hidden="true"
                                                            />
                                                        </Combobox.Button>
                                                    </div>
                                                    <Transition
                                                        as={Fragment}
                                                        leave="transition ease-in duration-100"
                                                        leaveFrom="opacity-100"
                                                        leaveTo="opacity-0"
                                                        afterLeave={() =>
                                                            setMapQuery("")
                                                        }
                                                    >
                                                        <Combobox.Options className="absolute w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                                            {filteredMaps.length ===
                                                                0 &&
                                                            mapQuery !== "" ? (
                                                                <div className="cursor-default select-none relative py-2 px-4 text-gray-700">
                                                                    Nothing
                                                                    found.
                                                                </div>
                                                            ) : (
                                                                filteredMaps.map(
                                                                    (
                                                                        name: string,
                                                                    ) => (
                                                                        <Combobox.Option
                                                                            key={
                                                                                name
                                                                            }
                                                                            className={(
                                                                                obj: any,
                                                                            ) =>
                                                                                `select-none relative py-1 pl-10 pr-4 cursor-pointer ${
                                                                                    obj.active
                                                                                        ? "text-white bg-indigo-600"
                                                                                        : "text-gray-900"
                                                                                }`
                                                                            }
                                                                            value={
                                                                                name
                                                                            }
                                                                        >
                                                                            {(
                                                                                obj: any,
                                                                            ) => (
                                                                                <>
                                                                                    <span
                                                                                        className={`block truncate text-left ${
                                                                                            obj.selected
                                                                                                ? "font-medium"
                                                                                                : "font-normal"
                                                                                        }`}
                                                                                    >
                                                                                        {
                                                                                            name
                                                                                        }
                                                                                    </span>
                                                                                    {obj.selected ? (
                                                                                        <span
                                                                                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                                                obj.active
                                                                                                    ? "text-white"
                                                                                                    : "text-indigo-600"
                                                                                            }`}
                                                                                        >
                                                                                            <CheckIcon
                                                                                                className="w-5 h-5"
                                                                                                aria-hidden="true"
                                                                                            />
                                                                                        </span>
                                                                                    ) : null}
                                                                                </>
                                                                            )}
                                                                        </Combobox.Option>
                                                                    ),
                                                                )
                                                            )}
                                                        </Combobox.Options>
                                                    </Transition>
                                                </div>
                                            </Combobox>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col lg:flex-row md:mt-2">
                                <div className="basis-full lg:basis-1/4 rounded-xl m-1">
                                    {/* Max Player */}
                                    <div className="flex justify-center">
                                        <div className="w-full">
                                            <label
                                                className="block text-white text-lg mb-1"
                                                htmlFor="maxplayers"
                                            >
                                                Max Players
                                            </label>
                                            <select
                                                className={selectClasses}
                                                aria-label="Discard Limit"
                                                id="maxplayers"
                                                onChange={changeMaxPlayers}
                                                disabled={
                                                    lobbyState.order !== 0
                                                }
                                                value={
                                                    lobbyState.settings
                                                        .MaxPlayers
                                                }
                                            >
                                                {[2, 3, 4, 5, 6].map(
                                                    (n: number) => (
                                                        <option
                                                            key={n}
                                                            value={n}
                                                        >
                                                            {n}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="basis-full lg:basis-1/4 rounded-xl m-1">
                                    {/* Discard limit selection */}
                                    <div className="flex justify-center">
                                        <div className="w-full">
                                            <label
                                                className="block text-white text-lg mb-1"
                                                htmlFor="discardlimit"
                                            >
                                                Discard Limit
                                            </label>
                                            <select
                                                className={selectClasses}
                                                aria-label="Discard Limit"
                                                id="discardlimit"
                                                onChange={changeDiscard}
                                                disabled={
                                                    lobbyState.order !== 0
                                                }
                                                value={
                                                    lobbyState.settings
                                                        .DiscardLimit
                                                }
                                            >
                                                {[
                                                    5, 6, 7, 8, 9, 10, 11, 12,
                                                    13, 14, 15,
                                                ].map((n: number) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="basis-full lg:basis-1/4 rounded-xl m-1">
                                    {/* Victory Point selection */}
                                    <div className="flex justify-center">
                                        <div className="w-full">
                                            <label
                                                className="block text-white text-lg mb-1 z-10"
                                                htmlFor="victoryPoint"
                                            >
                                                Victory Points
                                            </label>
                                            <select
                                                className={selectClasses}
                                                aria-label="Victory Points"
                                                id="victoryPoint"
                                                onChange={changeVicP}
                                                disabled={
                                                    lobbyState.order !== 0
                                                }
                                                value={
                                                    lobbyState.settings
                                                        .VictoryPoints
                                                }
                                            >
                                                {[
                                                    5, 6, 7, 8, 9, 10, 11, 12,
                                                    13, 14, 15, 16, 17, 18, 19,
                                                    20, 21,
                                                ].map((n: number) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="basis-full lg:basis-1/4 rounded-xl m-1">
                                    {/* Victory Point selection */}
                                    <div className="flex justify-center">
                                        <div className="w-full">
                                            <label
                                                className="block text-white text-lg mb-1"
                                                htmlFor="victoryPoint"
                                            >
                                                Game Speed
                                            </label>
                                            <select
                                                className={selectClasses}
                                                aria-label="Victory Points"
                                                id="victoryPoint"
                                                onChange={changeSpeed}
                                                disabled={
                                                    lobbyState.order !== 0
                                                }
                                                value={
                                                    lobbyState.settings.Speed
                                                }
                                            >
                                                {["slow", "normal", "fast"].map(
                                                    (n: string) => (
                                                        <option
                                                            key={n}
                                                            value={n}
                                                        >
                                                            {capitalizeFirstLetter(
                                                                n,
                                                            )}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {lobbyState.settings.Advanced && (
                                <>
                                    <div className="basis-auto rounded-xl m-1 text-white text-2xl font-bold p-3 pb-3">
                                        Advanced Settings
                                    </div>
                                    <div className="flex flex-col lg:flex-row md:mt-2">
                                        {getAdvancedCheckBox(
                                            "Re-roll on 7",
                                            "RerollOn7",
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="basis-auto mt-4">
                            {/* Ready selection */}
                            <div
                                className={classNames(
                                    "w-3/4 sm:w-1/2 md:w-3/4 lg:w-3/4 xl:w-1/2 px-4 pt-3 pb-2 rounded-md my-3 mx-auto cursor-pointer",
                                    lobbyState.ready
                                        ? "bg-green-800"
                                        : "bg-red-700",
                                )}
                            >
                                <div className="flex justify-center cursor-pointer">
                                    <div className="w-full">
                                        <input
                                            className="border rounded-sm bg-white scale-[1.75]
                                                       checked:bg-green-600 checked:border-green-600
                                                       focus:outline-none transition duration-200 align-top
                                                       bg-no-repeat bg-center bg-contain float-left mr-2
                                                       cursor-pointer translate-y-2 translate-x-2.5"
                                            type="checkbox"
                                            aria-label="Ready to play"
                                            checked={lobbyState.ready}
                                            id="ready"
                                            onChange={changeReady}
                                        />
                                        <label
                                            className="block text-2xl pl-10 mb-1 text-left text-white
                                                       translate-x-1 cursor-pointer"
                                            htmlFor="ready"
                                        >
                                            Ready
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={
                                    lobbyState.order != 0 ||
                                    !lobbyState.canStart
                                }
                                className={classNames(
                                    "w-3/4 sm:w-1/2 md:w-3/4 lg:w-3/4 xl:w-1/2 h-14 text-2xl rounded-xl",
                                    "text-white",
                                    lobbyState.order == 0 && lobbyState.canStart
                                        ? "bg-gradient-to-r from-green-700 to-green-700 hover:from-green-900 hover:to-green-900"
                                        : "bg-stone-700 opacity-40",
                                )}
                                onClick={startGame}
                            >
                                Start Game
                            </button>
                        </div>
                    </div>

                    <div className="basis-full md:basis-1/2 xl-basis-1/3 bg-black bg-opacity-50 backdrop-blur rounded-xl p-5 text-center mt-4 md:mt-0 md:ml-5 overflow-auto">
                        <div className="basis-auto m-1 text-white text-3xl p-3 pb-6">
                            Players
                        </div>
                        <PlayerList lobbyState={lobbyState} socket={socket} />

                        <div className="basis-auto mt-2 overflow-auto">
                            <button
                                disabled={lobbyState.order != 0}
                                className={classNames(
                                    "h-11 w-1/2 text-lg rounded-xl",
                                    "text-white",
                                    lobbyState.order == 0
                                        ? "bg-gradient-to-r from-indigo-700 to-indigo-700 hover:from-indigo-800 hover:to-indigo-800"
                                        : "bg-stone-700 opacity-40",
                                )}
                                onClick={botAdd}
                            >
                                Add Bot
                            </button>
                        </div>
                    </div>
                </div>

                <div className="basis-full lg:basis-1/3 bg-black bg-opacity-50 backdrop-blur rounded-xl p-5 text-center mt-4 lg:mt-0 lg:ml-5 flex flex-col">
                    <div className="basis-auto rounded-xl m-1 text-white text-3xl p-3 pb-6">
                        Chatroom
                    </div>

                    <div
                        className="basis-full text-white bg-black bg-opacity-5
                                   rounded-lg text-left p-4 overflow-auto max-h-screen"
                        ref={(el) => {
                            chatDiv = el;
                        }}
                    >
                        {lobbyState.chatMessages.map((m) => (
                            <p key={m.id} className="mb-1">
                                {m.msg}
                            </p>
                        ))}
                    </div>
                    <div className="basis-auto">
                        <div className="flex justify-center">
                            <div className="w-full mt-6">
                                <input
                                    type="text"
                                    className={selectClasses}
                                    onKeyDown={sendChat}
                                ></input>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Game;
