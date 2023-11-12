export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID;

// https://developers.google.com/analytics/devguides/collection/gtagjs/pages
export const pageview = (url: string) => {
    (window as any).gtag("config", GA_TRACKING_ID, {
        page_path: url,
    });
};

// https://developers.google.com/analytics/devguides/collection/gtagjs/events
export const event: (arg: any) => void = ({
    action,
    category,
    label,
    value,
}) => {
    (window as any).gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
    });
};

export const giveConsent = () => {
    (window as any).gtag("consent", "update", {
        ad_storage: "granted",
        analytics_storage: "granted",
    });
    console.warn("user granted consent to cookies");
};

export const cookieConsentResponded = () => {
    const v = cookieConsent();
    return v ? v !== "0" : false;
};

export const cookieConsent = () => {
    return localStorage.getItem("cookie_consent");
};

export const respondCookieConsent = (val: boolean) => {
    const store = val ? "1" : "-1";
    localStorage.setItem("cookie_consent", store);
    (window as any).checkCookieConsent();
};

(global as any)["checkCookieConsent"] = () => {
    if (cookieConsent() === "1") {
        giveConsent();
    }
};
