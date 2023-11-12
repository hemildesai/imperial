import {
    CheckCircleIcon,
    PencilSquareIcon,
    XCircleIcon,
} from "@heroicons/react/24/solid";
import {
    Dispatch,
    FunctionComponent,
    MutableRefObject,
    RefObject,
    SetStateAction,
    useRef,
} from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { useAnonymousAuth } from "../hooks/auth";
import {
    MSG_LOCATION_TYPE,
    MSG_TYPE,
    sendMessage,
    WsMessage,
} from "../src/sock";
import { getIdFromToken, getUsernameFromToken } from "../utils";
import { getServers } from "../utils/game";
import { classNames } from "../utils/styles";

function editUsername(
    usernameRef: RefObject<HTMLParagraphElement>,
    usernameInputRef: RefObject<HTMLInputElement>,
    editRef: RefObject<HTMLButtonElement>,
    checkRef: RefObject<HTMLButtonElement>,
    cancelRef: RefObject<HTMLButtonElement>,
): void {
    usernameRef.current!.style.display = "none";
    editRef.current!.style.display = "none";
    checkRef.current!.style.display = "inline-block";
    cancelRef.current!.style.display = "inline-block";
    usernameInputRef.current!.style.display = "inline-block";
    usernameInputRef.current!.value = usernameRef.current!.innerText;
    usernameInputRef.current!.focus();
}

async function confirmUsername(
    usernameRef: RefObject<HTMLParagraphElement>,
    usernameInputRef: RefObject<HTMLInputElement>,
    editRef: RefObject<HTMLButtonElement>,
    checkRef: RefObject<HTMLButtonElement>,
    cancelRef: RefObject<HTMLButtonElement>,
    update: boolean = false,
    setToken: Dispatch<SetStateAction<string | null>>,
    socket: MutableRefObject<ReconnectingWebSocket | null> | undefined,
    token: string | null,
) {
    usernameRef.current!.style.display = "inline-block";
    editRef.current!.style.display = "inline-block";
    checkRef.current!.style.display = "none";
    cancelRef.current!.style.display = "none";
    usernameInputRef.current!.style.display = "none";

    if (update) {
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                id: getIdFromToken(token),
                username: usernameInputRef.current!.value,
            }),
        };

        const servers = await getServers();

        if (!servers.length) {
            alert("Could not find any servers");
            return;
        }

        const res = await fetch(`${servers[0]}/anon`, options);
        const data = await res.json();

        if (data.error) {
            console.error(data.error);
        } else {
            localStorage.setItem("auth", data.token);
            setToken(data.token);
            if (socket && socket.current != null) {
                const msg: WsMessage = {
                    l: MSG_LOCATION_TYPE.LOBBY,
                    t: MSG_TYPE.UPDATE_USERNAME,
                    username: getUsernameFromToken(data.token)!,
                };
                sendMessage(socket.current, msg);
            }
        }
    }
}

const EditUser: FunctionComponent<{
    socket?: MutableRefObject<ReconnectingWebSocket | null>;
}> = ({ socket }) => {
    const usernameRef = useRef<HTMLParagraphElement>(null);
    const usernameInputRef = useRef<HTMLInputElement>(null);
    const editRef = useRef<HTMLButtonElement>(null);
    const checkRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [token, setToken] = useAnonymousAuth();

    return (
        <>
            <span className="align-middle inline-block mr-2">
                <p
                    ref={usernameRef}
                    className={classNames("text-xl font-medium")}
                >
                    {getUsernameFromToken(localStorage.getItem("auth"))}
                </p>
            </span>
            <input
                ref={usernameInputRef}
                className="bg-white text-black outline-black outline-2 font-medium w-3/4 h-7 px-2 text-xl -ml-4 align-middle rounded-lg hidden"
            />

            <div className="align-middle inline-block float-right">
                <button
                    ref={editRef}
                    onClick={() =>
                        editUsername(
                            usernameRef,
                            usernameInputRef,
                            editRef,
                            checkRef,
                            cancelRef,
                        )
                    }
                >
                    <PencilSquareIcon className="w-6 h-6" />
                </button>
            </div>

            <div className="float-right inline-block">
                <div className="align-middle inline-block mr-1">
                    <button
                        ref={checkRef}
                        className="hidden"
                        onClick={() =>
                            confirmUsername(
                                usernameRef,
                                usernameInputRef,
                                editRef,
                                checkRef,
                                cancelRef,
                                true,
                                setToken,
                                socket,
                                token,
                            )
                        }
                    >
                        <CheckCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="align-middle inline-block">
                    <button
                        ref={cancelRef}
                        className="hidden"
                        onClick={() =>
                            confirmUsername(
                                usernameRef,
                                usernameInputRef,
                                editRef,
                                checkRef,
                                cancelRef,
                                false,
                                setToken,
                                socket,
                                token,
                            )
                        }
                    >
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </>
    );
};

export default EditUser;
