import { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt";
import * as jose from "jose";
import { serversList } from "./mango";

export const encode = async (params: JWTEncodeParams): Promise<string> => {
    const jwt = await new jose.SignJWT(params.token!)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setIssuer("urn:imperials:issuer")
        .setAudience("urn:imperials:audience")
        .sign(Buffer.from(process.env.NEXTAUTH_SECRET!, "utf8"));

    return jwt;
};

export const decode = async (params: JWTDecodeParams): Promise<JWT | null> => {
    const { payload } = await jose.jwtVerify(
        params.token!,
        Buffer.from(process.env.NEXTAUTH_SECRET!, "utf8"),
        {
            issuer: "urn:imperials:issuer",
            audience: "urn:imperials:audience",
        },
    );

    return payload;
};

export const signInAndRegister = async (
    authToken: string,
    anonToken: string | undefined,
): Promise<Response | null> => {
    const output = await serversList();
    if (!output || output.length === 0) {
        return null;
    }
    const servers = output.map((s: any) => s.url);

    let res;

    const register = async (
        server: string,
        anonToken: string | undefined,
    ): Promise<Response> => {
        const body: { [key: string]: string } = {};

        if (anonToken) {
            body.anonToken = anonToken;
        }

        return await fetch(`${server}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authToken,
            },
            body: JSON.stringify(body),
        });
    };

    if (anonToken) {
        const options = {
            method: "GET",
            headers: {
                Authorization: anonToken,
            },
        };

        res = await fetch(`${servers[0]}/verify`, options);
        if (res.status === 200) {
            return await register(servers[0], anonToken);
        } else {
            return await register(servers[0], undefined);
        }
    } else {
        return await register(servers[0], undefined);
    }
};
