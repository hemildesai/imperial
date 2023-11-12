// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { gamesList } from "../../../utils/mango";

type Data = {
    games: any;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method === "GET") {
        const result = await gamesList(
            req.query.stage ? (req.query.stage as string) : "all",
        );
        res.status(200).json({ games: result });
    } else {
        res.status(405);
    }
}

export default handler;
