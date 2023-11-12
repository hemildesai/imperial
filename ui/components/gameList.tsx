import { FunctionComponent } from "react";
import { decode } from "@msgpack/msgpack";
import { useRouter } from "next/router";
import useSWR from "swr";
import Error from "next/error";
import { basicFetcher } from "../utils";
import { classNames } from "../utils/styles";
import { useAnonymousAuth } from "../hooks/auth";
import { createGame } from "../utils/game";
import { white as spinner } from "./spinner";
import Header from "./header";
import { GameSettings } from "../tsg";
import { DISPLAY_GAME_MODE, GAME_MODE } from "../src/lobby";
import dynamic from "next/dynamic";
import { Tab } from "@headlessui/react";

const AdUnit = dynamic(() => import("./adunit-lobby"), {
    ssr: false,
});

const textClass = classNames(
    `px-6 py-3 tracking-wider text-center text-lg font-medium`,
    "text-white",
);

const renderGame = (
    games: {
        id: string;
        private: boolean;
        server: string;
        stage: number;
        active_players: number;
        players: number;
        host: string;
        settings: any;
    }[],
    handleRowClick: (gameId: string) => () => void,
) => {
    return games.map(
        (game: {
            id: string;
            private: boolean;
            server: string;
            stage: number;
            active_players: number;
            players: number;
            settings: string;
            host: string;
        }) => {
            const { id, settings } = game;
            const gameSettings = new GameSettings(
                decode(Buffer.from(settings, "base64")),
            );
            return (
                <tr
                    key={id}
                    onClick={handleRowClick(id)}
                    className="cursor-pointer bg-black bg-opacity-50 backdrop-blur-lg border-bottom-2"
                >
                    <td className="px-6 py-4 whitespace-nowrap text-center text-lg text-white bg-clip-text">
                        {DISPLAY_GAME_MODE[gameSettings.Mode as GAME_MODE]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-lg text-white bg-clip-text">
                        {game.host}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-lg text-white bg-clip-text">
                        {[...Array(gameSettings.MaxPlayers)].map(
                            (_, i: number) => (
                                <span
                                    key={i}
                                    className={classNames(
                                        game.active_players > i
                                            ? "text-black opacity-80"
                                            : "text-white",
                                        "text-base mr-1",
                                    )}
                                >
                                    &#x2B24;
                                </span>
                            ),
                        )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-lg text-white bg-clip-text">
                        {gameSettings.MapName}
                    </td>
                </tr>
            );
        },
    );
};

const GameList: FunctionComponent = () => {
    const [token] = useAnonymousAuth();
    const { data, error } = useSWR(["/api/games", token ?? null], basicFetcher);

    const { data: sData } = useSWR(
        ["/api/games?stage=playing", token ?? null],
        basicFetcher,
    );

    const router = useRouter();

    const handleRowClick = (gameId: string) => () => {
        router.push(`/${gameId}`);
    };

    const handleHostGame = async () => {
        const [data, _] = await createGame(token!);
        if (!data) {
            return;
        } else if (data.error) {
            console.error(data.error);
        } else {
            router.push(`/${data.id}`);
        }
    };

    if (error) {
        console.error(error);
        return (
            <>
                <Header />
                <Error statusCode={500} />;
            </>
        );
    }
    if (data && data.error) return <Error statusCode={data.status} />;
    if (!data)
        return (
            <>
                <Header />
                <div className="text-white w-full h-screen flex">
                    {spinner()}
                </div>
            </>
        );

    return (
        <>
            <Header />
            <div className="max-w-7xl h-screen mx-auto my-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col ml-5 mr-5 lg:flex-row">
                    <div className="-my-2 overflow-x-auto basis-full lg:basis-3/4">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <Tab.Group>
                                <Tab.List className="flex p-1 space-x-1 bg-blue-900/20">
                                    {["Play", "Spectate"].map((category) => (
                                        <Tab
                                            key={category}
                                            className={({ selected }) =>
                                                classNames(
                                                    "w-full py-2.5 text-lg leading-5 font-medium text-white backdrop-blur",
                                                    selected
                                                        ? "bg-black bg-opacity-70 shadow"
                                                        : "hover:bg-white/[0.12] text-black",
                                                )
                                            }
                                        >
                                            {category}
                                        </Tab>
                                    ))}
                                </Tab.List>
                                <Tab.Panels className="mt-2">
                                    {["Play", "Spectate"].map(
                                        (category, idx) => (
                                            <Tab.Panel
                                                key={idx}
                                                className={classNames(
                                                    "rounded-xl",
                                                )}
                                            >
                                                <div className="flex flex-col border-0 border-blue-500 min-h-[10vh] max-h-[80vh]">
                                                    <div className="flex-grow overflow-auto">
                                                        <table
                                                            className="relative min-w-full divide-y-4 divide-transparent border-separate table-auto"
                                                            style={{
                                                                borderSpacing:
                                                                    "0 3px",
                                                            }}
                                                        >
                                                            <thead className="sticky top-0 bg-black bg-opacity-80 backdrop-blur">
                                                                <tr>
                                                                    <th
                                                                        scope="col"
                                                                        className={classNames(
                                                                            textClass,
                                                                            "sticky top-0 w-1/4",
                                                                        )}
                                                                    >
                                                                        Complexity
                                                                    </th>
                                                                    <th
                                                                        scope="col"
                                                                        className={classNames(
                                                                            textClass,
                                                                            "sticky top-0 w-1/4",
                                                                        )}
                                                                    >
                                                                        Host
                                                                    </th>
                                                                    <th
                                                                        scope="col"
                                                                        className={classNames(
                                                                            textClass,
                                                                            "sticky top-0 w-1/4",
                                                                        )}
                                                                    >
                                                                        Players
                                                                    </th>
                                                                    <th
                                                                        scope="col"
                                                                        className={classNames(
                                                                            textClass,
                                                                            "sticky top-0 w-1/4",
                                                                        )}
                                                                    >
                                                                        Map
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="">
                                                                {renderGame(
                                                                    category ===
                                                                        "Play"
                                                                        ? data
                                                                            ? data.games
                                                                            : []
                                                                        : sData
                                                                        ? sData.games
                                                                        : [],
                                                                    handleRowClick,
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            </Tab.Panel>
                                        ),
                                    )}
                                </Tab.Panels>
                            </Tab.Group>
                        </div>
                    </div>
                    <div className="basis-full lg:basis-1/4">
                        <button
                            className={classNames(
                                "my-8 mx-auto h-12 w-full text-xl rounded-xl",
                                "bg-indigo-700 hover:bg-indigo-900 text-white",
                            )}
                            onClick={handleHostGame}
                        >
                            Host Game
                        </button>

                        <AdUnit />
                    </div>
                </div>
            </div>
        </>
    );
};

export default GameList;
