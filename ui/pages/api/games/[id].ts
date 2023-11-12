// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getGame } from "../../../utils/mango";

type Data = {
    game?: any;
    error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method == "GET") {
        const gameId = req.query.id as string;
        const output = await getGame(gameId);
        if (output) {
            delete output.journal;
            res.status(200).json({ game: output });
        } else {
            res.status(404).json({ error: "Game not found" });
        }
    } else {
        res.status(405);
    }
}

export default handler;
