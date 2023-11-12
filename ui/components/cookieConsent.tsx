import { FunctionComponent, useState } from "react";
import * as gtag from "../utils/gtag";

const CookieConsent: FunctionComponent = () => {
    const [showCookie, setShowCookie] = useState(
        !gtag.cookieConsentResponded(),
    );

    const respondCookieConsent = (val: boolean) => {
        gtag.respondCookieConsent(val);
        setShowCookie(!gtag.cookieConsentResponded());
    };

    return (
        <>
            {showCookie && (
                <div className="w-full p-5 lg:px-24 absolute bottom-0 bg-gray-600 z-50">
                    <div className="md:flex items-center -mx-3">
                        <div className="md:flex-1 px-3 mb-5 md:mb-0">
                            <p className="text-center md:text-left text-white text-sm leading-tight md:pr-12">
                                We and selected partners and related companies,
                                use cookies and similar technologies as
                                specified in our Cookies Policy. You agree to
                                consent to the use of these technologies by
                                clicking Accept, or by continuing to browse this
                                website. You can learn more about how we use
                                cookies and set cookie preferences in Settings.
                            </p>
                        </div>
                        <div className="px-3 text-center">
                            <button
                                id="btn"
                                className="py-2 px-8 bg-gray-800 hover:bg-gray-900 text-white rounde text-base shadow-xl mr-3 cursor-pointer"
                                onClick={() => respondCookieConsent(false)}
                            >
                                Disable cookies
                            </button>
                            <button
                                id="btn"
                                className="py-2 px-8 bg-green-400 hover:bg-green-500 text-black rounded text-base shadow-xl cursor-pointer"
                                onClick={() => respondCookieConsent(true)}
                            >
                                Accept cookies
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CookieConsent;
