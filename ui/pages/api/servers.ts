// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { serversList } from "../../utils/mango";

type Data = {
    servers: any;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method === "GET") {
        const result = await serversList();
        res.status(200).json({ servers: result });
    } else {
        res.status(405);
    }
}

export default handler;
