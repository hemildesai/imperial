import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { anonymousAuth } from "../utils";
import { isBrowser } from "../utils";

export const useAnonymousAuth = (): [
    string | null,
    Dispatch<SetStateAction<string | null>>,
] => {
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        const establishToken = async () => {
            if (!token) {
                await anonymousAuth();
            }

            const auth = localStorage.getItem("auth");
            setToken(auth!);
        };

        if (isBrowser) {
            establishToken();
        }
    }, [token]);

    return [token, setToken];
};
