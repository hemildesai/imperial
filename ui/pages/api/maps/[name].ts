// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getMap } from "../../../utils/mango";

type Data = {
    map?: any;
    error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method === "GET") {
        try {
            const result = await getMap(req.query.name as string);
            res.status(200).json({ map: result });
        } catch (e) {
            res.status(403).json({ error: (e as Error).message });
        }
    } else {
        res.status(405);
    }
}

export default handler;
