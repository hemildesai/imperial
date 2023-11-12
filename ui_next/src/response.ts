import { DevelopmentCardDeck } from "../tsg";

export type RPlayerHandCards = { [key: number]: number | undefined };
export type RPlayerHandDevelopmentCards = {
    [key: number]: DevelopmentCardDeck | undefined;
};
