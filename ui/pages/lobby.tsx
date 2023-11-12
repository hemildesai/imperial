import type { NextPage } from "next";
import GameList from "../components/gameList";

const Lobby: NextPage = () => {
    return (
        <main>
            <GameList />
        </main>
    );
};

export default Lobby;
