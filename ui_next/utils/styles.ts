export const textBase: string = `text-base font-medium`;

export function classNames(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}

export const playerColors: { [key: string]: string } = {
    red: "bg-red-200",
    green: "bg-green-200",
    yellow: "bg-yellow-200",
    blue: "bg-blue-200",
};

export const seaBackgroundColor = "bg-blue-400";

export const gridCols: { [key: number]: string } = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
    5: "md:grid-cols-5",
    6: "md:grid-cols-6",
};
