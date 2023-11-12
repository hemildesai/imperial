import { FunctionComponent, useCallback } from "react";
import * as canvas from "../src/canvas";
import { isBrowser } from "../utils";
import { useSocket } from "../hooks/socket";
import { MSG_LOCATION_TYPE, SOCKET_STATE } from "../src/sock";
import { useGameServer } from "../hooks/gameServer";

const Pixi: FunctionComponent<{ gameId: string; order: number }> = ({
    gameId,
    order,
}) => {
    const [gameServer, gameExists] = useGameServer(gameId);
    let allowRender = true;
    const { socketState, setInit } = useSocket(
        gameId,
        false,
        MSG_LOCATION_TYPE.GAME,
        undefined,
        order,
        gameExists,
        gameServer,
    );

    const divRef = useCallback((node: any) => {
        if (isBrowser && node !== null && allowRender) {
            setInit(false);
            allowRender = false;

            canvas.cleanup(() => {
                canvas.initialize(node, () => {
                    setInit(true);
                    allowRender = true;
                });
            });
        }
    }, []);

    if (socketState == SOCKET_STATE.ERROR) return <div />;

    return (
        <div
            ref={divRef}
            className="relative m-auto pixi flex content-center justify-center"
        />
    );
};

export default Pixi;
