/* This example requires Tailwind CSS v2.0+ */
import { Tab } from "@headlessui/react";
import { FunctionComponent } from "react";
import { DISPLAY_GAME_MODE, GAME_MODE } from "../src/lobby";
import { PlayerSecretState, PlayerState, StoreGameState } from "../tsg";
import { classNames, gridCols } from "../utils/styles";

const Settings = (games: StoreGameState[]) => {
    return (
        <ul role="list">
            {games
                .slice()
                .reverse()
                .map((game: StoreGameState) => (
                    <li key={game.ID} className="my-4">
                        <dl className="p-0">
                            <dl className="grid grid-cols-1 rounded-lg overflow-hidden md:grid-cols-4">
                                <div
                                    key="id"
                                    className="px-4 py-5 sm:p-6 bg-black bg-opacity-70 mr-2 rounded-lg"
                                >
                                    <dt className="text-base font-normal text-white">
                                        ID
                                    </dt>
                                    <dd className="mt-1 flex justify-between items-baseline md:block lg:flex lg:flex-wrap">
                                        <div className="flex items-baseline text-2xl font-semibold text-sky-300">
                                            {game.ID}
                                        </div>
                                    </dd>
                                </div>
                                <div
                                    key="mode"
                                    className="px-4 py-5 sm:p-6 bg-black bg-opacity-70 mr-2 rounded-lg"
                                >
                                    <dt className="text-base font-normal text-white">
                                        Game Mode
                                    </dt>
                                    <dd className="mt-1 flex justify-between items-baseline md:block lg:flex lg:flex-wrap">
                                        <div className="flex items-baseline text-2xl font-semibold text-sky-300">
                                            {
                                                DISPLAY_GAME_MODE[
                                                    game.Settings
                                                        .Mode as GAME_MODE
                                                ]
                                            }
                                        </div>
                                    </dd>
                                </div>
                                <div
                                    key="map"
                                    className="px-4 py-5 sm:p-6 bg-black bg-opacity-70 mr-2 rounded-lg"
                                >
                                    <dt className="text-base font-normal text-white">
                                        Map
                                    </dt>
                                    <dd className="mt-1 flex justify-between items-baseline md:block lg:flex lg:flex-wrap">
                                        <div className="flex items-baseline text-2xl font-semibold text-sky-300">
                                            {game.Settings.MapName}
                                        </div>
                                    </dd>
                                </div>
                                <div
                                    key="finished"
                                    className="px-4 py-5 sm:p-6 bg-black bg-opacity-70 rounded-lg"
                                >
                                    <dt className="text-base font-normal text-white">
                                        Completed
                                    </dt>
                                    <dd className="mt-1 flex justify-between items-baseline md:block lg:flex lg:flex-wrap">
                                        <div className="flex items-baseline text-2xl font-semibold text-sky-300">
                                            {game.GameOver ? "Yes" : "No"}
                                        </div>
                                    </dd>
                                </div>
                            </dl>
                        </dl>
                    </li>
                ))}
        </ul>
    );
};

const Players = (games: StoreGameState[]) => {
    const playerClass = (game: StoreGameState) =>
        classNames(
            `grid sm:grid-cols-1 rounded-lg overflow-hidden`,
            gridCols[game.PlayerStates.length],
        );

    return (
        <ul role="list">
            {games
                .slice()
                .reverse()
                .map((game: StoreGameState, idx) => (
                    <li key={game.ID} className="my-4">
                        <dl className="p-0">
                            <dl className={playerClass(game)}>
                                {game.PlayerStates.sort(
                                    (
                                        first: PlayerState,
                                        second: PlayerState,
                                    ) => {
                                        if (
                                            first.VictoryPoints >
                                            second.VictoryPoints
                                        ) {
                                            return -1;
                                        } else if (
                                            first.VictoryPoints <
                                            second.VictoryPoints
                                        ) {
                                            return 1;
                                        } else {
                                            return 0;
                                        }
                                    },
                                ).map((item, index) => (
                                    <div
                                        key={
                                            item.Username +
                                            "-" +
                                            game.ID +
                                            "-" +
                                            idx
                                        }
                                        className={`px-4 py-5 sm:p-6 bg-black bg-opacity-70 rounded-lg ${
                                            index != 0 ? "ml-2" : ""
                                        }`}
                                    >
                                        <a
                                            href={
                                                !item.IsBot
                                                    ? `/users/${item.Username}`
                                                    : `#`
                                            }
                                            className="text-base font-normal text-white"
                                        >
                                            {item.Username}
                                        </a>
                                        <dd className="mt-1 flex justify-between items-baseline md:block lg:flex lg:flex-wrap">
                                            <div className="flex items-baseline text-2xl font-semibold text-sky-300">
                                                {item.VictoryPoints}
                                            </div>
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </dl>
                    </li>
                ))}
        </ul>
    );
};

const Panel = (category: string, games: StoreGameState[]) => {
    if (category === "Settings") {
        return Settings(games);
    } else if (category === "Players") {
        return Players(games);
    }
};

const UserGames: FunctionComponent<{ games: any }> = ({ games }) => {
    return (
        <>
            <div className="sm:rounded-md sm:w-full mx-auto max-h-[75vh] overflow-auto">
                <Tab.Group>
                    <Tab.List className="flex p-1 space-x-1 bg-blue-900/20 rounded-xl">
                        {["Settings", "Players"].map((category) => (
                            <Tab
                                key={category}
                                className={({ selected }) =>
                                    classNames(
                                        "w-full py-2.5 text-sm leading-5 font-medium text-black rounded-lg",
                                        selected
                                            ? "bg-black bg-opacity-70 shadow text-white"
                                            : "hover:bg-white/[0.12]",
                                    )
                                }
                            >
                                {category}
                            </Tab>
                        ))}
                    </Tab.List>
                    <Tab.Panels className="mt-2">
                        {["Settings", "Players"].map((category, idx) => (
                            <Tab.Panel
                                key={idx}
                                className={classNames("rounded-xl")}
                            >
                                {Panel(category, games)}
                            </Tab.Panel>
                        ))}
                    </Tab.Panels>
                </Tab.Group>
            </div>
        </>
    );
};

export default UserGames;
