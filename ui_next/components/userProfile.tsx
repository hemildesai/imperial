import { Tab } from "@headlessui/react";
import { ArrowDownIcon, ArrowUpIcon } from "@heroicons/react/24/outline";
import { NextRouter, useRouter } from "next/router";
import Error from "next/error";
import useSWRImmutable from "swr/immutable";
import { FunctionComponent } from "react";
import { useAnonymousAuth } from "../hooks/auth";
import { basicFetcher, formatDate } from "../utils";
import { classNames } from "../utils/styles";
import UserGames from "./userGames";
import Header from "./header";
import { StoreGameState } from "../tsg";

const Info = (username: string, data: { [key: string]: any }) => {
    function getPlayerOrderFromGame(id: string, game: StoreGameState) {
        return game.PlayerStates.find((player) => player.Id === id)?.Order;
    }

    function getWinRate(games: StoreGameState[]) {
        return (
            games.reduce(
                (acc: number, game: StoreGameState) =>
                    game.GameOver &&
                    getPlayerOrderFromGame(data.id, game) === game.Winner
                        ? acc + 1
                        : acc,
                0,
            ) / games.length || 0
        );
    }

    const currWinRate = getWinRate(data.games) * 100;
    const prevWinRate = getWinRate(data.games.slice(0, -1)) * 100;
    const stats = [
        {
            name: "Win Rate",
            stat: currWinRate.toFixed(2) + "%",
            previousStat: prevWinRate.toFixed(2) + "%",
            change: (currWinRate - prevWinRate).toFixed(2) + "%",
            changeType:
                currWinRate - prevWinRate >= 0 ? "increase" : "decrease",
        },
        {
            name: "Total Games",
            stat: data.games.length,
        },
        {
            name: "Last Played",
            stat: formatDate(new Date(data.updatedAt)),
        },
    ];

    return (
        <div className="overflow-hidden">
            <div className="bg-black bg-opacity-70 px-4 py-5 sm:px-6 flex flex-row rounded-lg">
                <h3 className="basis-1/2 text-lg leading-6 font-medium text-gray-100">
                    {username}
                </h3>
                <h3 className="basis-1/2 text-lg text-right leading-6 font-medium text-gray-100">
                    Karma: {data.finished ? String(data.finished) : 0}/
                    {data.started ? String(data.started) : 0}
                </h3>
            </div>
            <div className="px-4 py-5 sm:p-0 mt-2">
                <dl className="">
                    <dl className="grid grid-cols-1 rounded-lg overflow-hidden shadow md:grid-cols-3">
                        {stats.map((item, index) => (
                            <div
                                key={item.name}
                                className={`px-4 py-5 sm:p-6 bg-black bg-opacity-70 rounded-lg ${
                                    index != 0 ? "ml-2" : ""
                                }`}
                            >
                                <dt className="text-base font-normal text-gray-100">
                                    {item.name}
                                </dt>
                                <dd className="mt-1 flex justify-between items-baseline md:block lg:flex lg:flex-wrap">
                                    <div className="flex items-baseline text-2xl font-semibold text-sky-300">
                                        {item.stat}
                                        {item.previousStat && (
                                            <span className="ml-2 text-sm font-medium text-gray-300">
                                                from {item.previousStat}
                                            </span>
                                        )}
                                    </div>

                                    {item.changeType && (
                                        <div
                                            className={classNames(
                                                item.changeType === "increase"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800",
                                                "inline-flex items-baseline px-2.5 py-0.5 rounded-full text-sm font-medium md:mt-2 lg:mt-0",
                                            )}
                                        >
                                            {item.changeType === "increase" ? (
                                                <ArrowUpIcon
                                                    className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-green-500"
                                                    aria-hidden="true"
                                                />
                                            ) : (
                                                <ArrowDownIcon
                                                    className="-ml-1 mr-0.5 flex-shrink-0 self-center h-5 w-5 text-red-500"
                                                    aria-hidden="true"
                                                />
                                            )}

                                            <span className="sr-only">
                                                {item.changeType === "increase"
                                                    ? "Increased"
                                                    : "Decreased"}{" "}
                                                by
                                            </span>
                                            {item.change}
                                        </div>
                                    )}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </dl>
            </div>
        </div>
    );
};

const Panel = (category: string, router: NextRouter, data: any) => {
    if (category === "Games") {
        return router.isReady && data ? (
            <UserGames games={data.games || []} />
        ) : null;
    } else if (category === "Info") {
        return router.isReady && data
            ? Info(router.query.username as string, data)
            : null;
    }
};

const UserProfile: FunctionComponent = () => {
    const router = useRouter();
    const [token] = useAnonymousAuth();
    const { data } = useSWRImmutable(
        token ? [`/api/users/${router.query.username}`, token] : null,
        basicFetcher,
    );

    if (data && data.status != 200) return <Error statusCode={data.status} />;

    return (
        <>
            <Header />
            <div className="flex flex-col m-auto h-full">
                <div className="mx-auto my-8 lg:w-[60%] md:w-[80%] sm:w-full">
                    <Tab.Group defaultIndex={0}>
                        <Tab.List className="flex p-1 space-x-1 bg-blue-900/20 rounded-xl mx-3">
                            {["Info", "Games"].map((category) => (
                                <Tab
                                    key={category}
                                    className={({ selected }) =>
                                        classNames(
                                            "w-full py-2.5 text-sm leading-5 font-medium text-black rounded-lg",
                                            selected
                                                ? "bg-black bg-opacity-70 shadow text-white"
                                                : " hover:bg-white/[0.12]",
                                        )
                                    }
                                >
                                    {category}
                                </Tab>
                            ))}
                        </Tab.List>
                        <Tab.Panels className="mt-2">
                            {["Info", "Games"].map((category, idx) => (
                                <Tab.Panel
                                    key={idx}
                                    className={classNames("rounded-xl p-3")}
                                >
                                    {Panel(category, router, data)}
                                </Tab.Panel>
                            ))}
                        </Tab.Panels>
                    </Tab.Group>
                </div>
            </div>
        </>
    );
};

export default UserProfile;
