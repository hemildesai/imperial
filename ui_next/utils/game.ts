import { basicFetcher } from ".";

export const getServers = async (): Promise<string[]> => {
    const servers = await basicFetcher([`/api/servers`, null]);
    if (!servers.servers || !servers.servers.length) {
        alert("No servers available :(");
        return [];
    }
    return servers.servers.map((s: any) => s.url);
};
export const createGame = async (
    token: string,
    gameId: string | null = null,
): Promise<[any, string]> => {
    const servers = await getServers();
    if (!servers.length) {
        return [undefined, ""];
    }

    const serverIndex = Math.floor(Math.random() * servers.length);
    const serverUrl = servers[serverIndex];

    const body: { [key: string]: string } = {
        mode: "base",
    };

    if (gameId) {
        body.gameId = gameId;
    }

    const options = {
        method: "POST",
        headers: {
            Authorization: token,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    };

    const res = await fetch(`${serverUrl}/games`, options);
    return [await res.json(), serverUrl];
};
