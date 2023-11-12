import { useEffect, useState } from "react";
import useSWRImmutable from "swr/immutable";
import { basicFetcher, isBrowser } from "../utils";
import { createGame } from "../utils/game";
import { useAnonymousAuth } from "./auth";

const serverActive = async (server: string) => {
    const res = await fetch(`${server}/heartbeat`);
    return res.status === 200;
};

export const useGameServer = (gameId: string): [string, boolean | null] => {
    const [token, _] = useAnonymousAuth();
    const { data } = useSWRImmutable(
        ["/api/games/" + gameId, null],
        basicFetcher,
    );
    const [gameServer, setGameServer] = useState("");
    const [gameExists, setGameExists] = useState<boolean | null>(null);

    useEffect(() => {
        const establishGameServer = async () => {
            if (data && data.status === 200 && data.game) {
                setGameExists(true);
                const [createData, serverUrl] = await createGame(
                    token!,
                    gameId,
                );
                if (
                    data.game.server &&
                    (await serverActive(data.game.server))
                ) {
                    setGameServer(data.game.server);
                    setGameExists(true);
                } else {
                    if (createData.error) {
                        console.error(createData.error);
                        setGameExists(false);
                    } else {
                        setGameExists(true);
                        setGameServer(serverUrl);
                    }
                }
            } else if (data && data.status === 404) {
                setGameExists(false);
            }
        };

        if (isBrowser && token && gameId) {
            establishGameServer();
        }
    }, [token, gameId, data]);

    return [gameServer, gameExists];
};
