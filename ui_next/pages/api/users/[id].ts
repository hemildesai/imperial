// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getUserByIdOrUsername } from "../../../utils/mango";

type Data = {
    games?: any;
    started?: number;
    finished?: number;
    username?: string;
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    if (req.method === "GET") {
        const user = await getUserByIdOrUsername(req.query.id as string);
        if (user) {
            res.status(200).json(user);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}

export default handler;
