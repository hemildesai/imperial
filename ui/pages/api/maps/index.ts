// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";
import { getUserIdFromEmail, mapsList, setMap } from "../../../utils/mango";
import { getSession } from "next-auth/react";

type Data = {
    maps?: any;
    error?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse<Data>) {
    const session = await getSession({ req });
    const uId = session?.user?.email
        ? await getUserIdFromEmail(session.user.email)
        : "";

    if (req.method === "GET") {
        try {
            const result = await mapsList(uId);
            res.status(200).json({ maps: result });
        } catch (e) {
            res.status(403).json({ error: (e as Error).message });
        }
    } else if (req.method === "POST") {
        if (!session?.user?.email) {
            res.status(403).json({ error: "Cannot do this unless logged in" });
            return;
        }

        if (!uId) {
            res.status(403).json({ error: "User not found" });
            return;
        }

        try {
            await setMap(req.body.name, uId, req.body);
        } catch (err) {
            res.status(403).json({ error: (err as Error).message });
            return;
        }

        res.status(200).json({});
    } else {
        res.status(405);
    }
}

export default handler;
