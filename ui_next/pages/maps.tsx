import type { NextPage } from "next";
import styles from "../styles/maps.module.css";
import Header from "../components/header";
import useSWR from "swr";
import { ICoordinate } from "../tsg";
import { classNames } from "../utils/styles";
import { PortType, TileType } from "../src/entities";
import { Fragment, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Combobox, Transition } from "@headlessui/react";
import { useAnonymousAuth } from "../hooks/auth";
import { basicFetcher } from "../utils";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";

type IEdgeCoordinate = { C1: ICoordinate; C2: ICoordinate };

type Map = {
    name: string;
    order: boolean[];
    ports: number[];
    port_coordinates: IEdgeCoordinate[];
    numbers: number[];
    tiles: number[];
    map: number[][];
};

let initMap: Map = {
    name: "My Amazing Map",
    order: [],
    ports: [],
    port_coordinates: [],
    numbers: [],
    tiles: [],
    map: [
        [1, 2, 3, 4, 5],
        [6, 6, 8, 9, 6],
        [6, 1, 1, 21, 6],
        [6, 0, 1, 8, 6],
        [6, 6, 1, 8, 6],
    ],
};

initMap = JSON.parse(
    `{"name":"Base","order":[false,true,false,true,false],
      "ports":[6,6,6,6,1,2,3,4,5],
      "port_coordinates":[{"C1":{"X":2,"Y":8},"C2":{"X":2,"Y":6}},{"C1":{"X":4,"Y":2},"C2":{"X":6,"Y":0}},{"C1":{"X":10,"Y":0},"C2":{"X":12,"Y":2}},{"C1":{"X":16,"Y":4},"C2":{"X":18,"Y":6}},{"C1":{"X":20,"Y":10},"C2":{"X":20,"Y":12}},{"C1":{"X":18,"Y":16},"C2":{"X":16,"Y":18}},{"C1":{"X":12,"Y":20},"C2":{"X":10,"Y":22}},{"C1":{"X":6,"Y":22},"C2":{"X":4,"Y":20}},{"C1":{"X":2,"Y":16},"C2":{"X":2,"Y":14}}],
      "numbers":[2,3,3,4,4,5,5,6,6,8,8,9,9,10,10,11,11,12],
      "tiles":[0,1,1,1,1,2,2,2,3,3,3,3,4,4,4,4,5,5,5],
      "map":[[8,9,9,9,8],[9,9,9,9,8],[9,9,9,9,9],[9,9,9,9,8],[8,9,9,9,8]]
     }`,
);

const TileTypeToClass = {
    [TileType.Desert]: [
        "bg-orange-100",
        "border-b-orange-100",
        "border-t-orange-100",
    ],
    [TileType.Wood]: [
        "bg-green-800",
        "border-b-green-800",
        "border-t-green-800",
    ],
    [TileType.Ore]: ["bg-gray-600", "border-b-gray-600", "border-t-gray-600"],
    // [TileType.Sea]: ["bg-blue-600", "border-b-blue-600", "border-t-blue-600"],
    [TileType.Brick]: [
        "bg-amber-800",
        "border-b-amber-800",
        "border-t-amber-800",
    ],
    [TileType.Wheat]: [
        "bg-amber-400",
        "border-b-amber-400",
        "border-t-amber-400",
    ],
    [TileType.Wool]: [
        "bg-green-400",
        "border-b-green-400",
        "border-t-green-400",
    ],
    [TileType.Fog]: ["bg-gray-300", "border-b-gray-300", "border-t-gray-300"],
    [TileType.None]: ["bg-blue-400", "border-b-blue-400", "border-t-blue-400"],
    [TileType.Gold]: [
        "bg-purple-700",
        "border-b-purple-700",
        "border-t-purple-700",
    ],
    [TileType.Random]: [
        "bg-pink-300",
        "border-b-pink-300",
        "border-t-pink-300",
    ],
};

const Index: NextPage = () => {
    const [map, setMap] = useState(initMap);
    const [token] = useAnonymousAuth();
    const { data } = useSWR([`/api/maps`, token ?? null], basicFetcher);
    const [selectedMap, setSelectedMap] = useState(initMap);
    // check if user is logged in
    const session = useSession();

    if (global.window !== undefined) {
        (window as any).setMap = setMap;
    }

    // Fetch map on change of selected map
    useEffect(() => {
        if (token) {
            (async () => {
                const res = await basicFetcher([
                    `/api/maps/${selectedMap.name}`,
                    token,
                ]);
                if (res?.map?.map) {
                    setMap(res.map.map);
                    setNumbers(getInitNum(res.map.map));
                    setTiles(getInitTiles(res.map.map));
                    setPorts(getInitPorts(res.map.map));
                }
            })();
        }
    }, [selectedMap, token]);

    const [mapQuery, setMapQuery] = useState("");
    const filteredMaps =
        (mapQuery === ""
            ? data?.maps
            : data?.maps?.filter((n: Map) =>
                  n.name
                      .toLowerCase()
                      .replace(/\s+/g, "")
                      .includes(mapQuery.toLowerCase().replace(/\s+/g, "")),
              )) || [];

    const cycleTileType = (y: number, x: number, force?: TileType) => {
        if (force) {
            map.map[y][x] = force;
        } else {
            const tileType = map.map[y][x];
            const tileTypes = Object.keys(TileTypeToClass).map((x) =>
                Number(x),
            );
            const newTileType: number =
                (tileTypes.findIndex((x) => Number(x) === tileType) + 1) %
                tileTypes.length;
            map.map[y][x] = tileTypes[newTileType] as TileType;
        }
        setMap({ ...map });
    };

    const getInitNum = (map: Map) => {
        const nums = {
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            8: 0,
            9: 0,
            10: 0,
            11: 0,
            12: 0,
        };
        map.numbers.forEach((num) => {
            (nums as any)[num] += 1;
        });
        return nums;
    };
    const [numbers, setNumbers] = useState(getInitNum(map));

    const changeNumber = (e: any, number: number) => {
        (numbers as any)[number] = Number(e.target.value);
        setNumbers({ ...numbers });
    };

    const numTilesThatNeedNumber = () => {
        let res = 0;
        map.map.forEach((row) =>
            row.forEach((tile) => {
                if (
                    (tile >= TileType.Wood && tile <= TileType.Ore) ||
                    tile == TileType.Random ||
                    tile == TileType.Gold ||
                    tile == TileType.Fog
                ) {
                    res++;
                }
            }),
        );
        res -= tiles[TileType.Desert];
        return res;
    };

    const numNumbers = () => {
        return Object.values(numbers).reduce((a, b) => a + b, 0);
    };

    const getInitTiles = (map: Map) => {
        const tiles = {
            [TileType.Desert]: 0,
            [TileType.Wood]: 0,
            [TileType.Brick]: 0,
            [TileType.Wool]: 0,
            [TileType.Wheat]: 0,
            [TileType.Ore]: 0,
            [TileType.Gold]: 0,
        };
        map.tiles.forEach((tile) => {
            (tiles as any)[tile] += 1;
        });
        return tiles;
    };
    const [tiles, setTiles] = useState(getInitTiles(map));

    const changeTile = (e: any, tile: number) => {
        (tiles as any)[tile] = Number(e.target.value);
        setTiles({ ...tiles });
    };

    const numRandomTiles = () => {
        let res = 0;
        map.map.forEach((row) =>
            row.forEach((tile) => {
                if (tile == TileType.Random || tile == TileType.Fog) {
                    res++;
                }
            }),
        );
        return res;
    };

    const numRandomTilesSelected = () => {
        return Object.values(tiles).reduce((a, b) => a + b, 0);
    };

    const getInitPorts = (map: Map) => {
        const ports = {
            [PortType.Wood]: 0,
            [PortType.Brick]: 0,
            [PortType.Wool]: 0,
            [PortType.Wheat]: 0,
            [PortType.Ore]: 0,
            [PortType.Any]: 0,
        };
        map.ports.forEach((port) => {
            (ports as any)[port] += 1;
        });
        return ports;
    };
    const [ports, setPorts] = useState(getInitPorts(map));

    const changePort = (e: any, port: number) => {
        (ports as any)[port] = Number(e.target.value);
        setPorts({ ...ports });
    };

    const numPortsSelected = () => {
        return Object.values(ports).reduce((a, b) => a + b, 0);
    };

    const addRow = () => {
        map.map.push(new Array(map.map[0].length).fill(TileType.None));
        setMap({ ...map });
    };

    const addCol = () => {
        map.map.forEach((row) => row.push(TileType.None));
        setMap({ ...map });
    };

    const delRow = () => {
        map.map.pop();
        setMap({ ...map });
    };

    const delCol = () => {
        map.map.forEach((row) => row.pop());
        setMap({ ...map });
    };

    const generateJSON = () => {
        // validate
        if (numNumbers() != numTilesThatNeedNumber()) {
            alert("Incorrect number distribution");
            return;
        }

        if (numRandomTilesSelected() != numRandomTiles()) {
            alert("Incorrect random tiles distribution");
            return;
        }

        if (numPortsSelected() > 15) {
            alert("Too many ports");
            return;
        }

        if (map.map.flat().length <= 5) {
            alert("Too few hex tiles");
            return;
        }

        map.numbers = [];
        map.tiles = [];
        map.ports = [];

        // Iterate over numbers and append each value as many times to map.numbers
        Object.keys(numbers).forEach((key) => {
            for (let i = 0; i < (numbers as any)[Number(key)]; i++) {
                map.numbers.push(Number(key));
            }
        });

        // Iterate over tiles and append each value as many times to map.tiles
        Object.keys(tiles).forEach((key) => {
            for (let i = 0; i < (tiles as any)[Number(key)]; i++) {
                map.tiles.push(Number(key));
            }
        });

        // Iterate over ports and append each value as many times to map.ports
        Object.keys(ports).forEach((key) => {
            for (let i = 0; i < (ports as any)[Number(key)]; i++) {
                map.ports.push(Number(key));
            }
        });

        // assign false/true alternatively to map.order for map.map.length times
        map.order = [];
        for (let i = 0; i < map.map.length; i++) {
            map.order.push(i % 2 === 1);
        }

        console.log(JSON.stringify(map));

        fetch("/api/maps", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(map),
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert("Successfully saved map");
                }
            });
    };

    const autoNumbers = () => {
        // Auto distribute numbers
        const numToDistribute = numTilesThatNeedNumber();
        numbers[2] = Math.floor((1 / 18) * numToDistribute);
        numbers[3] = Math.floor((2 / 18) * numToDistribute);
        numbers[4] = Math.floor((2 / 18) * numToDistribute);
        numbers[5] = Math.floor((2 / 18) * numToDistribute);
        numbers[6] = Math.floor((2 / 18) * numToDistribute);
        numbers[8] = Math.floor((2 / 18) * numToDistribute);
        numbers[9] = Math.floor((2 / 18) * numToDistribute);
        numbers[10] = Math.floor((2 / 18) * numToDistribute);
        numbers[11] = Math.floor((2 / 18) * numToDistribute);
        numbers[12] = Math.floor((1 / 18) * numToDistribute);

        while (numNumbers() < numToDistribute) {
            if (numbers[4] < numbers[5]) {
                numbers[4] += 1;
                numbers[10] += 1;
                continue;
            }

            if (numbers[5] < numbers[6]) {
                numbers[5] += 1;
                numbers[9] += 1;
                continue;
            }

            numbers[6] += 1;
            numbers[8] += 1;
        }

        setNumbers({ ...numbers });
    };

    const autoTiles = () => {
        // auto distribute tiles
        const numToDistribute = numRandomTiles();
        tiles[TileType.Desert] = Math.floor((1 / 19) * numToDistribute);
        tiles[TileType.Wood] = Math.floor((4 / 19) * numToDistribute);
        tiles[TileType.Brick] = Math.floor((3 / 19) * numToDistribute);
        tiles[TileType.Wool] = Math.floor((4 / 19) * numToDistribute);
        tiles[TileType.Wheat] = Math.floor((4 / 19) * numToDistribute);
        tiles[TileType.Ore] = Math.floor((3 / 19) * numToDistribute);

        while (numRandomTilesSelected() < numToDistribute) {
            if (tiles[TileType.Desert] < tiles[TileType.Wood] / 2) {
                tiles[TileType.Desert] += 1;
            }

            if (tiles[TileType.Brick] < tiles[TileType.Wood]) {
                tiles[TileType.Brick]++;
                tiles[TileType.Ore]++;
                continue;
            }

            tiles[TileType.Wood]++;
            tiles[TileType.Wool]++;
            tiles[TileType.Wheat]++;
        }

        setTiles({ ...tiles });
    };

    const getTileCoordinate = (y: number, x: number) => {
        return {
            X: 2 + 4 * x + (y % 2 === 0 ? 0 : 2),
            Y: 3 + 4 * y,
        };
    };

    const getVertexCoordinates = (c: ICoordinate) => {
        const coords = new Array<ICoordinate>(6);
        coords[0] = { X: c.X, Y: c.Y - 3 };
        coords[1] = { X: c.X + 2, Y: c.Y - 1 };
        coords[2] = { X: c.X + 2, Y: c.Y + 1 };
        coords[3] = { X: c.X, Y: c.Y + 3 };
        coords[4] = { X: c.X - 2, Y: c.Y + 1 };
        coords[5] = { X: c.X - 2, Y: c.Y - 1 };
        return coords;
    };

    const getEdgeCoordinates = (c: ICoordinate) => {
        const vertices = getVertexCoordinates(c);
        const coords = new Array<IEdgeCoordinate>(6);
        coords[0] = { C1: vertices[0], C2: vertices[1] };
        coords[1] = { C1: vertices[1], C2: vertices[2] };
        coords[2] = { C1: vertices[2], C2: vertices[3] };
        coords[3] = { C1: vertices[3], C2: vertices[4] };
        coords[4] = { C1: vertices[4], C2: vertices[5] };
        coords[5] = { C1: vertices[5], C2: vertices[0] };
        return coords;
    };

    const gec = (y: number, x: number) => {
        return getEdgeCoordinates(getTileCoordinate(y, x));
    };

    const addPort = (e: any, ec: IEdgeCoordinate) => {
        e.stopPropagation();

        if (hasPort(ec)) {
            map.port_coordinates = map.port_coordinates.filter(
                (p) =>
                    !(
                        (p.C1.X === ec.C1.X &&
                            p.C1.Y === ec.C1.Y &&
                            p.C2.X === ec.C2.X &&
                            p.C2.Y === ec.C2.Y) ||
                        (p.C1.X === ec.C2.X &&
                            p.C1.Y === ec.C2.Y &&
                            p.C2.X === ec.C1.X &&
                            p.C2.Y === ec.C1.Y)
                    ),
            );
            setMap({ ...map });
            return;
        }

        map.port_coordinates.push(ec);
        setMap({ ...map });
    };

    const hasPort = (ec: IEdgeCoordinate) => {
        return map.port_coordinates.some((p) => {
            return (
                (p.C1.X === ec.C1.X &&
                    p.C1.Y === ec.C1.Y &&
                    p.C2.X === ec.C2.X &&
                    p.C2.Y === ec.C2.Y) ||
                (p.C1.X === ec.C2.X &&
                    p.C1.Y === ec.C2.Y &&
                    p.C2.X === ec.C1.X &&
                    p.C2.Y === ec.C1.Y)
            );
        });
    };

    const hpc = (y: number, x: number, loc: number) => {
        return hasPort(gec(y, x)[loc]) ? styles.hasport : "";
    };

    return (
        <main>
            <Header />
            <div className="flex flex-row w-full bg-black bg-opacity-70 backdrop-blur-lg">
                <div className="mx-4 mt-4 h-[85vh] overflow-auto basis-1/2 xl:basis-2/3 p-4">
                    <div>
                        <h2
                            className="ml-4 text-4xl font-bold mt-1 text-white mb-1"
                            style={{ fontVariant: "small-caps" }}
                        >
                            Imperials Map Editor
                        </h2>
                        <div className="ml-4 text-white m-4 text-sm">
                            Click on a hex to cycle through tile options. Right
                            click to reset to random or fog.
                            <br />
                            Click on edge dots to assign port locations.
                        </div>
                        {map.map.map((row, y) => (
                            <div
                                key={y}
                                className={classNames(
                                    styles.hexrow,
                                    y % 2 == 1 ? styles.even : "",
                                    "whitespace-nowrap",
                                )}
                            >
                                {row.map((tile, x) => (
                                    <button
                                        key={x}
                                        className={classNames(styles.hex)}
                                        onClick={() => cycleTileType(y, x)}
                                        onContextMenu={(e) => {
                                            e.preventDefault();
                                            cycleTileType(
                                                y,
                                                x,
                                                tile == TileType.None
                                                    ? TileType.Random
                                                    : tile == TileType.Fog
                                                    ? TileType.None
                                                    : TileType.Fog,
                                            );
                                        }}
                                    >
                                        <div
                                            className={classNames(
                                                styles.top,
                                                TileTypeToClass[
                                                    tile as TileType
                                                ][1],
                                            )}
                                        ></div>
                                        <div
                                            className={classNames(
                                                styles.middle,
                                                TileTypeToClass[
                                                    tile as TileType
                                                ][0],
                                            )}
                                        >
                                            <div className="text-xl pt-3">
                                                {tile !== TileType.None
                                                    ? TileType[tile]
                                                    : "-"}
                                            </div>

                                            <div
                                                className={`${styles.port} ${
                                                    styles.tr
                                                } ${hpc(y, x, 0)}`}
                                                onClick={(e) =>
                                                    addPort(e, gec(y, x)[0])
                                                }
                                            ></div>
                                            <div
                                                className={`${styles.port} ${
                                                    styles.r
                                                } ${hpc(y, x, 1)}`}
                                                onClick={(e) =>
                                                    addPort(e, gec(y, x)[1])
                                                }
                                            ></div>
                                            <div
                                                className={`${styles.port} ${
                                                    styles.br
                                                } ${hpc(y, x, 2)}`}
                                                onClick={(e) =>
                                                    addPort(e, gec(y, x)[2])
                                                }
                                            ></div>
                                            <div
                                                className={`${styles.port} ${
                                                    styles.bl
                                                } ${hpc(y, x, 3)}`}
                                                onClick={(e) =>
                                                    addPort(e, gec(y, x)[3])
                                                }
                                            ></div>
                                            <div
                                                className={`${styles.port} ${
                                                    styles.l
                                                } ${hpc(y, x, 4)}`}
                                                onClick={(e) =>
                                                    addPort(e, gec(y, x)[4])
                                                }
                                            ></div>
                                            <div
                                                className={`${styles.port} ${
                                                    styles.tl
                                                } ${hpc(y, x, 5)}`}
                                                onClick={(e) =>
                                                    addPort(e, gec(y, x)[5])
                                                }
                                            ></div>
                                        </div>
                                        <div
                                            className={classNames(
                                                styles.bottom,
                                                TileTypeToClass[
                                                    tile as TileType
                                                ][2],
                                            )}
                                        ></div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="pt-1 my-12 basis-1/2 xl:basis-1/3 h-[85vh] overflow-auto text-white">
                    <div className="w-1/2 ml-4 mb-3">
                        <h2 className="text-xl mt-1 text-white mb-2">
                            Choose Map to Edit
                        </h2>
                        <Combobox
                            value={selectedMap.name}
                            onChange={(value) => setSelectedMap(value as any)}
                        >
                            <div className="relative mt-1">
                                <div className="relative w-full text-left bg-white rounded-md shadow-md cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-opacity-75 focus-visible:ring-white focus-visible:ring-offset-teal-300 focus-visible:ring-offset-2 sm:text-sm overflow-hidden">
                                    <Combobox.Input
                                        className="w-full border-none focus:ring-0 py-2 pl-3 pr-10 text-lg leading-5 text-gray-900"
                                        autoComplete="off"
                                        onChange={(event: any) =>
                                            setMapQuery(event.target.value)
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
                                    afterLeave={() => setMapQuery("")}
                                >
                                    <Combobox.Options className="absolute w-full py-1 mt-1 overflow-auto text-base bg-white rounded-md shadow-lg max-h-60 ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                                        {filteredMaps.length === 0 &&
                                        mapQuery !== "" ? (
                                            <div className="cursor-default select-none relative py-2 px-4 text-gray-700">
                                                Nothing found.
                                            </div>
                                        ) : (
                                            filteredMaps.map((map: Map) => (
                                                <Combobox.Option
                                                    key={map.name}
                                                    className={(obj: any) =>
                                                        `select-none relative py-1 pl-10 pr-4 cursor-pointer ${
                                                            obj.active
                                                                ? "text-white bg-indigo-600"
                                                                : "text-gray-900"
                                                        }`
                                                    }
                                                    value={map}
                                                >
                                                    {(obj: any) => (
                                                        <>
                                                            <span
                                                                className={`block truncate text-left ${
                                                                    obj.selected
                                                                        ? "font-medium"
                                                                        : "font-normal"
                                                                }`}
                                                            >
                                                                {map.name}
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
                                            ))
                                        )}
                                    </Combobox.Options>
                                </Transition>
                            </div>
                        </Combobox>
                    </div>
                    {session.status === "authenticated" ? (
                        <div>
                            <h2 className="ml-4 text-xl mt-1">
                                Map Attributes
                            </h2>

                            <div className="m-3 mt-2">
                                <div className="text-base ml-1 mb-1">Name</div>
                                <input
                                    className="w-full p-2 border-2 border-gray-400 text-black rounded-lg mb-2"
                                    type="text"
                                    value={map.name}
                                    onChange={(e) =>
                                        setMap({ ...map, name: e.target.value })
                                    }
                                />
                                <button
                                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg mr-4 w-1/3 mb-4"
                                    onClick={generateJSON}
                                >
                                    Save
                                </button>
                                <br />

                                <div className="text-base ml-1 mb-2">
                                    Map Size
                                </div>
                                <button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg mr-4 mb-2 w-1/3"
                                    onClick={addRow}
                                >
                                    Add Row
                                </button>
                                <button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg mr-4 mb-2 w-1/3"
                                    onClick={delRow}
                                >
                                    Delete Row
                                </button>
                                <br />
                                <button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg mr-4 mb-2 w-1/3"
                                    onClick={addCol}
                                >
                                    Add Column
                                </button>
                                <button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg mr-4 mb-2 w-1/3"
                                    onClick={delCol}
                                >
                                    Delete Column
                                </button>
                            </div>

                            <h2 className="ml-4 text-xl mt-1">
                                Number Distribution
                                <span
                                    className={classNames(
                                        numNumbers() !==
                                            numTilesThatNeedNumber()
                                            ? "bg-red-500"
                                            : "bg-green-700",
                                        "px-3 py-1 mx-3 my-2 rounded-lg text-lg",
                                    )}
                                >
                                    {numNumbers()} / {numTilesThatNeedNumber()}
                                </span>
                                <div className="text-white mt-1 mb-2 text-sm font-normal">
                                    Select the number distribution for all hexes
                                    except desert and sea.
                                </div>
                            </h2>

                            <button
                                className="bg-green-800 hover:bg-green-900 text-white py-2 rounded-lg mr-4 w-1/3 m-4 my-2 text-sm"
                                onClick={autoNumbers}
                            >
                                Auto Distribute
                            </button>

                            <ul className="text-white ml-8">
                                {Object.keys(numbers).map((x) => (
                                    <li key={x} className="m-3">
                                        <span className="mr-2 inline-block w-[50px] text-right pr-1">
                                            {x}
                                        </span>
                                        <input
                                            type="range"
                                            className="px-2 rounded-lg form-range appearance-none h-5 p-0 bg-white focus:outline-none focus:ring-0 focus:shadow-none"
                                            min="0"
                                            max={numTilesThatNeedNumber()}
                                            step="1"
                                            value={(numbers as any)[x]}
                                            onInput={(e) =>
                                                changeNumber(e, Number(x))
                                            }
                                        />
                                        <span className="text-white ml-3">
                                            {(numbers as any)[x]}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <h2 className="ml-4 text-xl mt-5">
                                Random Tile Distribution
                                <span
                                    className={classNames(
                                        numRandomTilesSelected() !==
                                            numRandomTiles()
                                            ? "bg-red-500"
                                            : "bg-green-700",
                                        "px-3 py-1 mx-3 my-2 rounded-lg text-lg",
                                    )}
                                >
                                    {numRandomTilesSelected()} /{" "}
                                    {numRandomTiles()}
                                </span>
                                <div className="text-white mt-1 mb-2 text-sm font-normal">
                                    Select the tile distribution for all random
                                    and fog tiles.
                                </div>
                            </h2>

                            <button
                                className="bg-green-800 hover:bg-green-900 text-white py-2 rounded-lg mr-4 w-1/3 m-4 my-2 text-sm"
                                onClick={autoTiles}
                            >
                                Auto Distribute
                            </button>

                            <ul className="text-white ml-8">
                                {Object.keys(TileTypeToClass)
                                    .filter(
                                        (x) =>
                                            Number(x) !== TileType.Random &&
                                            Number(x) !== TileType.None &&
                                            Number(x) !== TileType.Fog,
                                        // Number(x) !== TileType.Sea, // No seafarers for now
                                    )
                                    .map((x) => (
                                        <li key={x} className="m-3">
                                            <span className="mr-2 inline-block w-[50px] text-right pr-3">
                                                {
                                                    TileType[
                                                        Number(x) as TileType
                                                    ]
                                                }
                                            </span>
                                            <input
                                                type="range"
                                                className="px-2 rounded-lg form-range appearance-none h-5 p-0 bg-white focus:outline-none focus:ring-0 focus:shadow-none"
                                                min="0"
                                                max={numTilesThatNeedNumber()}
                                                step="1"
                                                value={(tiles as any)[x]}
                                                onInput={(e) =>
                                                    changeTile(e, Number(x))
                                                }
                                            />
                                            <span className="text-white ml-3">
                                                {(tiles as any)[x]}
                                            </span>
                                        </li>
                                    ))}
                            </ul>

                            <h2 className="ml-4 text-xl mt-5">
                                Port Distribution
                                <span
                                    className={classNames(
                                        numPortsSelected() > 15
                                            ? "bg-red-500"
                                            : "bg-green-700",
                                        "px-3 py-1 mx-3 my-2 rounded-lg text-lg",
                                    )}
                                >
                                    {numPortsSelected()} / 15
                                </span>
                                <div className="text-white mt-1 mb-2 text-sm font-normal">
                                    Select the port distribution for all ports.
                                </div>
                            </h2>

                            <ul className="text-white ml-8">
                                {Object.keys(ports).map((x) => (
                                    <li key={x} className="m-3">
                                        <span className="mr-2 inline-block w-[50px] text-right pr-3">
                                            {PortType[Number(x) as PortType]}
                                        </span>
                                        <input
                                            type="range"
                                            className="px-2 rounded-lg form-range appearance-none h-5 p-0 bg-white focus:outline-none focus:ring-0 focus:shadow-none"
                                            min="0"
                                            max={15}
                                            step="1"
                                            value={(ports as any)[x]}
                                            onInput={(e) =>
                                                changePort(e, Number(x))
                                            }
                                        />
                                        <span className="text-white ml-3">
                                            {(ports as any)[x]}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <>
                            <h2 className="ml-4 text-xl mt-16">
                                You must be logged in to use this feature
                            </h2>
                            <button
                                className={classNames(
                                    "ml-4 mt-5 w-full max-w-[200px] flex items-center justify-center px-4 py-2 text-xl border border-transparent rounded-md",
                                    "shadow-sm font-medium text-white bg-indigo-700 hover:bg-green-800",
                                )}
                                onClick={() =>
                                    signIn("google", { callbackUrl: "/" })
                                }
                            >
                                Sign In
                            </button>
                        </>
                    )}
                </div>
            </div>
        </main>
    );
};

export default Index;
