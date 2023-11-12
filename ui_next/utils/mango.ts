import { decode } from "@msgpack/msgpack";
import { PlayerState, StoreGameState } from "../tsg";
import type { Binary, ObjectId } from "bson";
import * as mongoDB from "mongodb";
import isUUID from "validator/lib/isUUID";

export const collections: {
    users?: mongoDB.Collection;
    servers?: mongoDB.Collection;
    games?: mongoDB.Collection;
    gameStates?: mongoDB.Collection;
    maps?: mongoDB.Collection;
} = {};

async function connectToDatabase() {
    const client: mongoDB.MongoClient = new mongoDB.MongoClient(
        process.env.MONGO_URL!,
    );

    try {
        await client.connect();
    } catch {
        process.exit(1);
    }

    const db: mongoDB.Db = client.db("imperials");

    const serversCollection: mongoDB.Collection = db.collection("servers");
    const usersCollection: mongoDB.Collection = db.collection("users");
    const gamesCollection: mongoDB.Collection = db.collection("games");
    const gameStatesCollection: mongoDB.Collection =
        db.collection("game_states");
    const mapsCollection: mongoDB.Collection = db.collection("maps");

    collections.games = gamesCollection;
    collections.servers = serversCollection;
    collections.users = usersCollection;
    collections.gameStates = gameStatesCollection;
    collections.maps = mapsCollection;

    console.warn(`Successfully connected to database: ${db.databaseName}`);
}

async function getGamesCollection() {
    if (!collections.games) {
        await connectToDatabase();
    }
    return collections.games;
}

async function getUsersCollection() {
    if (!collections.users) {
        await connectToDatabase();
    }
    return collections.users;
}

async function getServersCollection() {
    if (!collections.servers) {
        await connectToDatabase();
    }
    return collections.servers;
}

async function getMapsCollection() {
    if (!collections.maps) {
        await connectToDatabase();
    }
    return collections.maps;
}

async function getGameStatesCollection() {
    if (!collections.gameStates) {
        await connectToDatabase();
    }
    return collections.gameStates;
}

export const gamesList = async (stage: string) => {
    const qStage = stage === "playing" ? 1 : 0;
    const collection = await getGamesCollection();
    if (collection) {
        return collection
            .find({
                stage: qStage,
                private: false,
                updatedAt: {
                    $gte: new Date(Date.now() - 5 * 60 * 1000),
                },
            })
            .project({
                _id: 0,
                id: 1,
                active_players: 1,
                players: 1,
                private: 1,
                server: 1,
                stage: 1,
                settings: 1,
                host: 1,
            })
            .toArray();
    }
};

export const serversList = async () => {
    const collection = await getServersCollection();
    if (collection) {
        return collection.find().toArray();
    }
};

export const mapsList = async (uId: string) => {
    const collection = await getMapsCollection();
    if (collection) {
        const userMaps = await collection
            .find({ creator: uId })
            .project({
                name: 1,
                _id: 0,
            })
            .toArray();

        userMaps.push({ name: "" });
        userMaps.push({ name: "--- Community Maps ---" });

        const communityMaps = await collection
            .find({ creator: { $ne: uId } })
            .project({
                name: 1,
                _id: 0,
            })
            .sort({ name: 1 })
            .toArray();

        userMaps.push(...communityMaps);

        return userMaps;
    }

    return [];
};

// Write async function to get a map by its name
export const getMap = async (name: string) => {
    const collection = await getMapsCollection();
    if (collection) {
        return collection.findOne({ name });
    }
};

export const setMap = async (name: string, user: string, map: any) => {
    const collection = await getMapsCollection();
    if (collection) {
        const existingMap = await collection.findOne({ name });
        if (existingMap && user !== existingMap.creator) {
            throw new Error("Another map with this name already exists");
        }

        if (JSON.stringify(map).length > 8000) {
            throw new Error("Map is too large");
        }

        const maps = await mapsList(user);
        if (!existingMap && maps.length >= 20) {
            throw new Error("You have too many maps");
        }

        await collection.updateOne(
            { name },
            {
                $set: {
                    name,
                    creator: user,
                    map,
                },
            },
            { upsert: true },
        );
    }
};

export const getGame = async (gameId: string) => {
    const collection = await getGamesCollection();
    if (collection) {
        return collection.findOne({ id: gameId });
    }
};

const getGameStates = async (_ids: ObjectId[]) => {
    const collection = await getGameStatesCollection();
    if (collection) {
        return collection.find({ _id: { $in: _ids } });
    }
};

const getUsers = async (ids: string[]) => {
    const collection = await getUsersCollection();
    if (collection) {
        return collection.find({ id: { $in: ids } }).project({
            _id: 0,
            id: 1,
            username: 1,
        });
    }
};

export const getGameStatesForUserGames = async (games: ObjectId[]) => {
    const collection = await getUsersCollection();
    if (collection) {
        const result: StoreGameState[] = [];
        const gameStates = await getGameStates(games);
        await gameStates?.forEach((gameState) => {
            const bin: Binary = gameState.state;
            const gameResult = new StoreGameState(decode(bin.buffer));
            result.push(gameResult);
        });

        const allUserIds = result.reduce(
            (acc: string[], cur: StoreGameState) => {
                const currUserIds = cur.PlayerStates.reduce(
                    (userIds: string[], curState: PlayerState) => {
                        if (!curState.IsBot) {
                            userIds.push(curState.Id);
                        }
                        return userIds;
                    },
                    [],
                );
                acc.push(...currUserIds);
                return acc;
            },
            [],
        );

        const users = await getUsers(allUserIds);
        const userMap: { [key: string]: string } = {};
        await users?.forEach((user) => {
            userMap[user.id] = user.username;
        });

        for (const game of result) {
            for (const player of game.PlayerStates) {
                if (!player.IsBot) {
                    player.Username = userMap[player.Id];
                }
            }
        }

        return result;
    }
};

export const getUserByUsername = async (username: string) => {
    const collection = await getUsersCollection();
    if (collection) {
        const user = await collection.findOne(
            { username: username },
            { projection: { _id: 1, email: 0 } },
        );

        if (user) {
            const gameStates = await getGameStatesForUserGames(
                user.games ? user.games : [],
            );
            return { ...user, games: gameStates };
        }
    }
};

export const getUserIdFromEmail = async (email: string) => {
    const collection = await getUsersCollection();
    if (collection) {
        const user = await collection.findOne(
            { email: email },
            { projection: { _id: 0, id: 1 } },
        );
        return user?.id;
    }
};

export const getUserById = async (id: string) => {
    const collection = await getUsersCollection();
    if (collection) {
        const user = await collection.findOne(
            { id: id },
            { projection: { _id: 1, email: 0 } },
        );

        if (user) {
            const gameStates = await getGameStatesForUserGames(
                user.games ? user.games : [],
            );
            return { ...user, games: gameStates };
        }
    }
};

export const getUserByIdOrUsername = (idOrUsername: string) => {
    if (isUUID(idOrUsername)) {
        return getUserById(idOrUsername);
    } else {
        return getUserByUsername(idOrUsername);
    }
};
