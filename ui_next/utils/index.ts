import { getServers } from "./game";
import { jwtDecode } from "jwt-decode";

export const isBrowser: boolean = typeof window !== "undefined";

export function getIdFromToken(token: string | null): string | null {
    if (!token) {
        return null;
    }

    const decoded = jwtDecode(token) as any;
    return decoded.id;
}

export function getUsernameFromToken(token: string | null): string | null {
    if (!token) {
        return null;
    }

    const decoded = jwtDecode(token) as any;
    return decoded.username;
}

export const anonymousAuth = async (): Promise<any> => {
    let res;
    let servers;

    const token = localStorage.getItem("auth");
    if (isBrowser && token) {
        const options = {
            method: "GET",
            headers: {
                Authorization: token,
            },
        };

        servers = await getServers();
        res = await fetch(`${servers[0]}/verify`, options);
        if (res.status === 200) {
            return;
        }
    }

    if (!servers) {
        servers = await getServers();
    }

    if (!servers.length) {
        alert("Could not find any servers");
        return;
    }

    res = await fetch(`${servers[0]}/anon`);
    const data = await res.json();

    if (isBrowser) {
        localStorage.setItem("auth", data.token);
    }
};

export const basicFetcher = async ([url, token]: [
    string,
    string | null,
]): Promise<any> => {
    const options = {
        method: "GET",
        headers: {},
    };

    if (isBrowser) {
        token ||= localStorage.getItem("auth");
        if (token) {
            options.headers = {
                Authorization: token,
            };
        }
    }
    const res = await fetch(url, options);
    try {
        const data = await res.json();
        return {
            ...data,
            status: res.status,
        };
    } catch {
        return {
            status: res.status,
            error: "Cannot parse response",
        };
    }
};

export function hexToUrlString(hex: string): string {
    if (hex.startsWith("#")) {
        hex = hex.substring(1);
    }

    switch (hex.toLocaleLowerCase()) {
        case "ff0000":
            return "red";
        case "00ff00":
            return "green";
        case "ffff00":
            return "yellow";
        case "0000ff":
            return "blue";
        case "fc41ec":
            return "plum";
        case "26eded":
            return "cyan";
    }

    return "red";
}

export function formatDate(date: Date): string {
    // Formatter for "Today" and "Yesterday" etc
    const relative = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });

    // Formatter for weekdays, e.g. "Monday"
    const short = new Intl.DateTimeFormat("en-US", { weekday: "long" });

    // Formatter for dates, e.g. "Mon, 31 May 2021"
    const long = new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });

    const now = new Date().setHours(0, 0, 0, 0);
    const then = date.setHours(0, 0, 0, 0);
    const days = (then - now) / 86400000;
    if (days > -6) {
        let res: string;
        if (days > -2) {
            res = relative.format(days, "day");
        } else {
            res = short.format(date);
        }

        return capitalizeFirstLetter(res);
    }
    return long.format(date);
}

export function capitalizeFirstLetter(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

export async function toggleFullscreen() {
    try {
        if (!document.fullscreenElement) {
            const elem = document.querySelector(".pixi");
            await elem?.requestFullscreen?.();
            await (screen.orientation as any)?.lock?.("landscape");
        } else {
            await document.exitFullscreen?.();
            await (screen.orientation as any)?.lock?.("landscape");
        }
    } catch {
        console.warn("Orientation lock not supported");
    }
}
