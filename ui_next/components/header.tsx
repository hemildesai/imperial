import {
    Fragment,
    FunctionComponent,
    MutableRefObject,
    ReactElement,
    useEffect,
    useState,
} from "react";
import { Popover, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/legacy/image";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { jwtDecode } from "jwt-decode";
import { textBase, classNames } from "../utils/styles";
import { getUsernameFromToken } from "../utils";
import UserMenu from "./UserMenu";
import ReconnectingWebSocket from "reconnecting-websocket";

const textClass = classNames(textBase, "text-white", "text-lg");
const signInProcess = async () => {
    const anonToken = localStorage.getItem("auth");
    const options = {
        method: "GET",
        headers: {},
    };

    if (anonToken) {
        options.headers = {
            Authorization: anonToken,
        };
    }
    const res = await fetch(`/api/jwt`, options);
    if (res.status === 200) {
        const { token } = await res.json();
        localStorage.setItem("auth", token);

        if (
            anonToken &&
            getUsernameFromToken(token) != getUsernameFromToken(anonToken)
        ) {
            localStorage.setItem("anonAuth", anonToken!);
        }

        const decoded = jwtDecode(token) as any;
        return decoded.username;
    } else {
        console.error(await res.json());
        return null;
    }
};

const signOutProcess = () => {
    localStorage.removeItem("auth");
    if (localStorage.getItem("anonAuth") != null) {
        localStorage.setItem("auth", localStorage.getItem("anonAuth")!);
    }
    signOut({ callbackUrl: "/" });
};

const Header: FunctionComponent<{
    socket?: MutableRefObject<ReconnectingWebSocket | null>;
}> = ({ socket }) => {
    const [registered, setRegistered] = useState(false);
    const { status } = useSession();

    useEffect(() => {
        if (status === "authenticated" && !registered) {
            const signInAndRegister = async () => {
                const username = await signInProcess();
                if (username) {
                    setRegistered(true);
                } else {
                    signOut();
                    setRegistered(false);
                }
            };
            signInAndRegister();
        } else if (status === "unauthenticated") {
            if (localStorage.getItem("anonAuth") != null) {
                localStorage.setItem("auth", localStorage.getItem("anonAuth")!);
            }
        }
    }, [status, registered]);

    let authButton: ReactElement;
    if (status === "authenticated") {
        authButton = (
            <button
                className={classNames(
                    textClass,
                    "w-full flex items-center justify-center px-4 py-1 border border-transparent rounded-md shadow-sm text-base font-medium " +
                        "text-white bg-indigo-700 hover:bg-red-800",
                )}
                onClick={() => signOutProcess()}
            >
                Sign out
            </button>
        );
    } else {
        authButton = (
            <button
                className={classNames(
                    textClass,
                    "w-full flex items-center justify-center px-4 py-1 border border-transparent rounded-md",
                    "shadow-sm text-base font-medium text-white bg-indigo-700 hover:bg-green-800",
                )}
                onClick={() => signIn("google", { callbackUrl: "/" })}
            >
                Sign In
            </button>
        );
    }

    return (
        <Popover className="relative bg-indigo-900">
            <div
                className="absolute inset-0 z-30 pointer-events-none"
                aria-hidden="true"
            />
            <div className="relative z-20">
                <div className="max-w-7xl mx-auto flex justify-between items-center px-4 py-2 lg:px-8 md:justify-start md:space-x-10">
                    <div>
                        <span className="sr-only">Imperials</span>
                        <div className="h-auto w-auto rounded-lg">
                            <Link href="/" passHref>
                                <Image
                                    src="/icon.png"
                                    alt="Imperials"
                                    height="40"
                                    width="40"
                                    className="h-auto w-auto sm:h-10 cursor-pointer rounded-full"
                                />
                            </Link>
                        </div>
                    </div>
                    <div className="-mr-2 -my-2 md:hidden">
                        <Popover.Button className="bg-white rounded-md p-2 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                            <span className="sr-only">Open menu</span>
                            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                        </Popover.Button>
                    </div>
                    <div className="hidden md:flex-1 md:flex md:items-center md:justify-between">
                        <Popover.Group as="nav" className="flex space-x-10">
                            <Link href="/lobby" className={textClass}>
                                Lobby
                            </Link>
                            <Link
                                href="https://discord.com/invite/3TUqQX5acg"
                                className={textClass}
                            >
                                Community
                            </Link>
                            <Link href="/rules" className={textClass}>
                                Rules
                            </Link>
                            <Link
                                href="https://blog.imperials.app"
                                className={textClass}
                            >
                                Blog
                            </Link>
                            <Link href="/maps" className={textClass}>
                                Map Editor
                            </Link>
                            <Link href="/privacy" className={textClass}>
                                Privacy
                            </Link>
                        </Popover.Group>
                        <div className="flex items-center md:ml-12">
                            {status === "authenticated" ? (
                                <UserMenu socket={socket} />
                            ) : null}
                            {authButton}
                        </div>
                    </div>
                </div>
            </div>

            <Transition
                as={Fragment}
                enter="duration-200 ease-out"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="duration-100 ease-in"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
            >
                <Popover.Panel
                    focus
                    className="absolute z-30 top-0 inset-x-0 p-1 transition transform origin-top-right md:hidden"
                >
                    <div className="rounded-lg shadow-lg ring-black ring-opacity-5 bg-indigo-900 divide-y-2 divide-gray-50">
                        <div className="pt-3 pb-3 px-5 sm:pb-3">
                            <div className="flex items-center justify-between">
                                <div className="">
                                    <Image
                                        src="/icon.png"
                                        alt="Imperials"
                                        height="40"
                                        width="40"
                                        className="rounded-full"
                                    />
                                </div>
                                <div className="-mr-2">
                                    <Popover.Button className="bg-white rounded-md p-1 inline-flex items-center justify-center text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-indigo-500">
                                        <span className="sr-only">
                                            Close menu
                                        </span>
                                        <XMarkIcon
                                            className="h-6 w-6"
                                            aria-hidden="true"
                                        />
                                    </Popover.Button>
                                </div>
                            </div>
                        </div>
                        <div className="py-6 px-5">
                            <div className="grid grid-cols-2 gap-4">
                                <Link href="/lobby">
                                    <a className={textClass}>Lobby</a>
                                </Link>

                                <a
                                    href="https://discord.com/invite/3TUqQX5acg"
                                    className={textClass}
                                >
                                    Community
                                </a>

                                <Link href="/rules">
                                    <a className={textClass}>Rules</a>
                                </Link>
                                <Link href="https://blog.imperials.app">
                                    <a className={textClass}>Blog</a>
                                </Link>
                                <Link href="/maps">
                                    <a className={textClass}>Map Editor</a>
                                </Link>
                                <Link href="/privacy">
                                    <a className={textClass}>Privacy</a>
                                </Link>
                            </div>
                            <div className="mt-6 flex flex-row space-x-3">
                                {authButton}
                                {status === "authenticated" ? (
                                    <UserMenu socket={socket} />
                                ) : null}
                            </div>
                        </div>
                    </div>
                </Popover.Panel>
            </Transition>
        </Popover>
    );
};

export default Header;
