import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { decode, encode } from "../../../utils/auth";

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
    // https://next-auth.js.org/configuration/providers/oauth
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_ID!,
            clientSecret: process.env.GOOGLE_SECRET!,
        }),
    ],
    theme: {
        colorScheme: "dark",
    },
    jwt: {
        encode: encode,
        /** Override this method to control the NextAuth.js issued JWT decoding. */
        decode: decode,
    },
    callbacks: {
        async jwt({ token }) {
            token.userRole = "admin";
            token.oauth = "google";
            return token;
        },
    },
});
