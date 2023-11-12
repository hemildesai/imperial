import { SessionProvider } from "next-auth/react";
import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Script from "next/script";
import Head from "next/head";
import "../styles/globals.css";
import * as gtag from "../utils/gtag";
import dynamic from "next/dynamic";

const Consent = dynamic(() => import("../components/cookieConsent"), {
    ssr: false,
});

function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
    const router = useRouter();
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_ENVIRONMENT === "production") {
            const handleRouteChange = (url: string) => {
                gtag.pageview(url);
            };
            router.events.on("routeChangeComplete", handleRouteChange);
            return () => {
                router.events.off("routeChangeComplete", handleRouteChange);
            };
        }
    }, [router.events]);

    useEffect(() => {
        if ("serviceWorker" in navigator) {
            window.addEventListener("load", function () {
                navigator.serviceWorker
                    .register("/sw.js", {
                        scope: ".",
                    })
                    .then(
                        function (registration) {
                            console.log(
                                "Service Worker registration successful with scope: ",
                                registration.scope,
                            );
                        },
                        function (err) {
                            console.log(
                                "Service Worker registration failed: ",
                                err,
                            );
                        },
                    );
            });
        }
    }, []);

    return (
        <>
            <Head>
                <title>Imperials!</title>
                <meta name="title" content="Imperials!" />
                <meta name="description" content="Strategize to imperialize" />

                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://imperials.app/" />
                <meta property="og:title" content="Imperials!" />
                <meta
                    property="og:description"
                    content="Strategize to imperialize"
                />
                <meta property="og:image" content="" />

                <meta property="twitter:card" content="summary_large_image" />
                <meta property="twitter:url" content="https://imperials.app/" />
                <meta property="twitter:title" content="Imperials!" />
                <meta
                    property="twitter:description"
                    content="Strategize to imperialize"
                />
                <meta property="twitter:image" content="" />

                <meta
                    name="viewport"
                    content="initial-scale=1.0, user-scalable=no, width=device-width"
                />

                <link rel="manifest" href="manifest.json" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="application-name" content="Imperials!" />
                <meta name="apple-mobile-web-app-title" content="Imperials!" />
                <meta name="theme-color" content="#3A62BE" />
                <meta name="msapplication-navbutton-color" content="#3A62BE" />
                <meta
                    name="apple-mobile-web-app-status-bar-style"
                    content="black-translucent"
                />
                <meta name="msapplication-starturl" content="/" />

                {/* Adcash verification */}
                <meta
                    name="a.validate.02"
                    content="jLb9r52zsJ4vTGEVz0uL69SpKVtAR2lPD9bx"
                />

                {/* Adsense */}
                {process.env.NEXT_PUBLIC_ENVIRONMENT === "production" && (
                    <script
                        async
                        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4166003434222987"
                        crossOrigin="anonymous"
                    ></script>
                )}
            </Head>
            {process.env.NEXT_PUBLIC_ENVIRONMENT === "production" && (
                <>
                    <Script
                        strategy="afterInteractive"
                        src={`https://www.googletagmanager.com/gtag/js?id=${gtag.GA_TRACKING_ID}`}
                    />
                    <Script
                        id="gtag-init"
                        strategy="afterInteractive"
                        dangerouslySetInnerHTML={{
                            __html: `
                                window.dataLayer = window.dataLayer || [];
                                function gtag(){dataLayer.push(arguments);}
                                gtag('js', new Date());
                                gtag('config', '${gtag.GA_TRACKING_ID}', {
                                    page_path: window.location.pathname,
                                });
                                gtag('consent', 'default', {
                                    'ad_storage': 'denied',
                                    'analytics_storage': 'denied'
                                });
                                checkCookieConsent();
                            `,
                        }}
                    />
                    <Consent />
                </>
            )}

            <SessionProvider session={session}>
                <div className="h-screen w-full bg-gradient-to-r from-sky-400 to-blue-800">
                    <div className="absolute h-full w-full bg-[url('/assets/lobby-bg.jpg')] bg-cover opacity-100"></div>
                    <div className="absolute h-full w-full">
                        <Component {...pageProps} />
                    </div>
                </div>
            </SessionProvider>
        </>
    );
}

export default MyApp;
