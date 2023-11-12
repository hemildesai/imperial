// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
    return (
        <Html>
            <Head>
                <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />

                {/* Fonts from google */}
                <link
                    href="https://fonts.googleapis.com/css2?family=Dekko&display=swap"
                    rel="stylesheet"
                />
            </Head>
            <body>
                <Main />
                <NextScript />
            </body>
        </Html>
    );
}
