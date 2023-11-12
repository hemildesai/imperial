import { useRouter } from "next/router";
import { FunctionComponent, useEffect } from "react";
import Header from "../components/header";
import { white as spinner } from "../components/spinner";
import { useAnonymousAuth } from "../hooks/auth";
import { createGame } from "../utils/game";

const SinglePlayer: FunctionComponent = () => {
    const [token] = useAnonymousAuth();
    const router = useRouter();

    const go = async () => {
        if (token) {
            const [data, _] = await createGame(token!);
            if (!data) {
                return;
            } else if (data.error) {
                console.error(data.error);
            } else {
                router.replace(`/${data.id}?sp=1`);
            }
        }
    };

    useEffect(() => {
        go();
    }, [token]);

    return (
        <>
            <Header />
            <main>
                <div className="text-white w-full h-screen flex">
                    {spinner()}
                </div>
            </main>
        </>
    );
};

export default SinglePlayer;
