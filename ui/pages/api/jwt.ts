import { getToken } from "next-auth/jwt";
import type { NextApiRequest, NextApiResponse } from "next";
import { signInAndRegister } from "../../utils/auth";

export default async (req: NextApiRequest, res: NextApiResponse) => {
    const token = await getToken({ req, raw: true });

    if (token) {
        const anonToken = req.headers.authorization;
        const registerRes = await signInAndRegister(token, anonToken);

        if (!registerRes) {
            res.status(500).json({ error: "Internal server error" });
            return;
        }

        res.status(registerRes.status).json(await registerRes.json());
    } else {
        res.status(401).end();
    }
};
