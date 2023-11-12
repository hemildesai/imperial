import { Menu, Transition } from "@headlessui/react";
import {
    ChevronDownIcon,
    PencilIcon as EditActiveIcon,
    UserIcon as ProfileActiveIcon,
} from "@heroicons/react/24/outline";
import {
    PencilIcon as EditInactiveIcon,
    UserIcon as ProfileInactiveIcon,
} from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { Fragment, FunctionComponent, MutableRefObject } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { getUsernameFromToken } from "../utils";
import { UsernameChangeModal } from "./UsernameChangeModal";

const UserMenu: FunctionComponent<{
    socket?: MutableRefObject<ReconnectingWebSocket | null>;
}> = ({ socket }) => {
    const router = useRouter();
    const usernameModal = UsernameChangeModal(socket);

    return (
        <>
            <Menu
                as="div"
                className="relative inline-block text-left mr-3 z-30"
            >
                <div>
                    <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-black rounded-md bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75">
                        {getUsernameFromToken(localStorage.getItem("auth"))}
                        <ChevronDownIcon
                            className="w-5 h-5 ml-2 -mr-1 text-blue-200 hover:text-blue-100"
                            aria-hidden="true"
                        />
                    </Menu.Button>
                </div>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white opacity-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="px-1 py-1 ">
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={usernameModal.openModal}
                                        className={`${
                                            active
                                                ? "bg-indigo-200 text-white"
                                                : "text-gray-900"
                                        } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                    >
                                        {active ? (
                                            <EditActiveIcon
                                                className="w-5 h-5 mr-2 text-indigo-500"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <EditInactiveIcon
                                                className="w-5 h-5 mr-2 text-indigo-500"
                                                aria-hidden="true"
                                            />
                                        )}
                                        Edit Username
                                    </button>
                                )}
                            </Menu.Item>
                            <Menu.Item>
                                {({ active }) => (
                                    <button
                                        onClick={() => {
                                            router.push(
                                                `/users/${getUsernameFromToken(
                                                    localStorage.getItem(
                                                        "auth",
                                                    ),
                                                )}`,
                                            );
                                        }}
                                        className={`${
                                            active
                                                ? "bg-indigo-200 text-white"
                                                : "text-gray-900"
                                        } group flex rounded-md items-center w-full px-2 py-2 text-sm`}
                                    >
                                        {active ? (
                                            <ProfileActiveIcon
                                                className="w-5 h-5 mr-2 text-indigo-500"
                                                aria-hidden="true"
                                            />
                                        ) : (
                                            <ProfileInactiveIcon
                                                className="w-5 h-5 mr-2 text-indigo-500"
                                                aria-hidden="true"
                                            />
                                        )}
                                        Profile
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
            {usernameModal.component}
        </>
    );
};

export default UserMenu;
