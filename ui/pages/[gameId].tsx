import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const Game = dynamic(() => import("../components/game"), { ssr: false });

const GamePage = () => {
    const router = useRouter();
    const { gameId } = router.query;

    return (
        <main>
            <Game gameId={gameId as string} />
        </main>
    );
};

export default GamePage;
