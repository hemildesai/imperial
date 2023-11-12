import type { NextPage } from "next";
import Link from "next/link";
import Header from "../components/header";
import bigLogo from "../public/assets/biglogo.png";

const Index: NextPage = () => {
    return (
        <main>
            <Header />

            <div className="text-4xl">
                <div className="flex flex-col md:flex-row max-h-[90vh] overflow-auto">
                    <div className="basis-full md:basis-4/6 flex">
                        <div className="w-3/4 sm:w-1/2 md:w-full md:h-5/6 mx-auto my-10 md:my-auto">
                            <img
                                src={bigLogo.src}
                                className="object-contain h-full w-full"
                            />
                        </div>
                    </div>
                    <div className="basis-full md:basis-1/6 flex flex-col md:h-[60vh]">
                        <div className="basis-full"></div>
                        <div className="basis-auto w-3/4 m-auto md:w-full">
                            <Link href="/sp">
                                <button className="w-[100%] p-4 text-3xl my-1 text-white bg-black bg-opacity-70 hover:bg-green-700 backdrop-blur rounded-lg small-caps">
                                    Single Player
                                </button>
                            </Link>
                            <Link href="/lobby">
                                <button className="w-[100%] p-4 text-3xl my-1 text-white bg-black bg-opacity-70 hover:bg-red-700 backdrop-blur rounded-lg small-caps">
                                    Multiplayer
                                </button>
                            </Link>

                            <div className="h-12"></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Index;
