import { NextPage } from "next";
import Header from "../components/header";

import tileTex0 from "../public/assets/tile-tex/0.jpg";
import tileTex1 from "../public/assets/tile-tex/1.jpg";
import tileTex2 from "../public/assets/tile-tex/2.jpg";
import tileTex3 from "../public/assets/tile-tex/3.jpg";
import tileTex4 from "../public/assets/tile-tex/4.jpg";
import tileTex5 from "../public/assets/tile-tex/5.jpg";
import tileTex21 from "../public/assets/tile-tex/21.jpg";
import tileTexFog from "../public/assets/tile-tex/fog.jpg";

import port1 from "../public/assets/ports/1.png";
import port2 from "../public/assets/ports/2.png";
import port3 from "../public/assets/ports/3.png";
import port4 from "../public/assets/ports/4.png";
import port5 from "../public/assets/ports/5.png";
import port6 from "../public/assets/ports/6.png";

import cards0 from "../public/assets/cards/0.jpg";
import cards1 from "../public/assets/cards/1.jpg";
import cards2 from "../public/assets/cards/2.jpg";
import cards3 from "../public/assets/cards/3.jpg";
import cards4 from "../public/assets/cards/4.jpg";
import cards5 from "../public/assets/cards/5.jpg";
import cards6 from "../public/assets/cards/6.jpg";
import cards7 from "../public/assets/cards/7.jpg";
import cards8 from "../public/assets/cards/8.jpg";
import cards101 from "../public/assets/cards/101.jpg";
import cards102 from "../public/assets/cards/102.jpg";
import cards103 from "../public/assets/cards/103.jpg";
import cards104 from "../public/assets/cards/104.jpg";
import cards105 from "../public/assets/cards/105.jpg";
import cards106 from "../public/assets/cards/106.jpg";
import cards107 from "../public/assets/cards/107.jpg";
import cards108 from "../public/assets/cards/108.jpg";
import cards109 from "../public/assets/cards/109.jpg";
import cards110 from "../public/assets/cards/110.jpg";
import cards111 from "../public/assets/cards/111.jpg";
import cards112 from "../public/assets/cards/112.jpg";
import cards113 from "../public/assets/cards/113.jpg";
import cards114 from "../public/assets/cards/114.jpg";
import cards115 from "../public/assets/cards/115.jpg";
import cards116 from "../public/assets/cards/116.jpg";
import cards117 from "../public/assets/cards/117.jpg";
import cards118 from "../public/assets/cards/118.jpg";
import cards119 from "../public/assets/cards/119.jpg";
import cards120 from "../public/assets/cards/120.jpg";
import cards121 from "../public/assets/cards/121.jpg";
import cards122 from "../public/assets/cards/122.jpg";
import cards123 from "../public/assets/cards/123.jpg";
import cards124 from "../public/assets/cards/124.jpg";
import cards125 from "../public/assets/cards/125.jpg";
import cards126 from "../public/assets/cards/126.jpg";
import cards127 from "../public/assets/cards/127.jpg";
import cards128 from "../public/assets/cards/128.jpg";
import cards129 from "../public/assets/cards/129.jpg";
import cards130 from "../public/assets/cards/130.jpg";
import cards200 from "../public/assets/cards/200.jpg";
import cards201 from "../public/assets/cards/201.jpg";
import cards202 from "../public/assets/cards/202.jpg";
import cards203 from "../public/assets/cards/203.jpg";
import cards204 from "../public/assets/cards/204.jpg";
import cards205 from "../public/assets/cards/205.jpg";
import cards206 from "../public/assets/cards/206.jpg";
import cards207 from "../public/assets/cards/207.jpg";
import cards208 from "../public/assets/cards/208.jpg";
import cards209 from "../public/assets/cards/209.jpg";
import cards210 from "../public/assets/cards/210.jpg";
import cards211 from "../public/assets/cards/211.jpg";
import cards212 from "../public/assets/cards/212.jpg";
import cards213 from "../public/assets/cards/213.jpg";
import cards214 from "../public/assets/cards/214.jpg";
import cards215 from "../public/assets/cards/215.jpg";

const tiles = [
    { type: "Forest - produces Wood", g1: tileTex1, g2: cards1 },
    { type: "Kiln - produces Brick", g1: tileTex2, g2: cards2 },
    { type: "Pasture - produces Wool", g1: tileTex3, g2: cards3 },
    { type: "Farm - produces Wheat", g1: tileTex4, g2: cards4 },
    { type: "Mine - produces Ore", g1: tileTex5, g2: cards5 },
    { type: "Desert - produces no resources", g1: tileTex0, g2: undefined },
    {
        type: "Fog - revealed when someone builds an adjacent road",
        g1: tileTexFog,
        g2: undefined,
    },
    {
        type: "Gold - produces any resource of the player's choice",
        g1: tileTex21,
        g2: undefined,
    },
];

const Rules: NextPage = () => (
    <>
        <Header />
        <div className="lg:flex lg:flex-row text-white max-h-[90vh] overflow-auto backdrop-blur-md">
            <div className="lg:basis-1/2 m-2 p-4 bg-black bg-opacity-60 rounded-lg text-lg overflow-auto lg:h-[85vh]">
                <div className="text-3xl font-bold py-3">
                    Game Mechanics - Basic
                </div>

                <div className="mb-3">Welcome to Imperials!</div>
                <div className="mb-3">
                    The game begins with a board generated by the game.
                    Different maps can be chosen from the settings screen. The
                    objective of the game is to flourish your civilization using
                    the resources generated from these tiles. There are various
                    types of hexagonal tiles in the game, which produce resource
                    cards. These are indicated below with the resources produced
                    by them.
                    <ul className="list-disc pl-6 mt-3">
                        {tiles.map((t) => (
                            <li key={t.type}>
                                {t.type}
                                <br />
                                <img
                                    src={t.g1.src}
                                    className="h-24 rounded-md mr-2 my-2 inline-block"
                                ></img>
                                <img
                                    src={t.g2?.src}
                                    className="h-24 rounded-md inline-block"
                                ></img>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mb-3">
                    To receive resource tiles from a tile on your turn, you must
                    meet two conditions:
                    <ul className="list-disc pl-6 mt-3">
                        <li>You must have a settlement adjacent to the tile</li>
                        <li>
                            The dice roll must match the number on the tile for
                            that turn
                        </li>
                    </ul>
                </div>

                <div className="mb-3">
                    Thus, to receive the most resources, you must build
                    settlements. Settlements may be villages or towns. A village
                    produces one resource from any adjacent tile while towns
                    produces two resources from adjacent tiles.
                </div>

                <div className="mb-3">
                    At the start of the game, you are allowed to place two
                    villages and one road adjacent to each of them. The first
                    player must start placing, after which each player takes
                    turn to place a village. When all players have placed one
                    village, they place one village in reverse back to the first
                    player. On placing each village, the player must place a
                    road adjacent to the village along the edge of two adjacent
                    hexagonal tiles.
                </div>

                <div className="mb-3">
                    Before building further villages, the player must build a
                    roads. This is because villages may be built only such that
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            They are adjacent to a road belonging to the player
                        </li>
                        <li>
                            Not adjacent to any other village or town (of any
                            player).
                        </li>
                    </ul>
                </div>

                <div className="mb-3">
                    The player may build roads adjacent to any settlement
                    belonging to the player or adjacent to another road.
                    However, the player may not build roads adjacent to their
                    own road if another player's settlement lies between the
                    place where the road is being built and the player's old
                    road. To build a road, the player must provide one wood and
                    one brick to the market. A player may have a maximum of 15
                    roads on the board at any time.
                    <br />
                    <img
                        src={cards1.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards2.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="mb-3">
                    After building a road, the player may build a village in an
                    adjacent valid vertex and start producing resources. To
                    build a village, the player must proide one each of wood,
                    brick, wool and wheat to the market. A player may have a
                    maximum of 5 villages on the board at any time.
                    <br />
                    <img
                        src={cards1.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards2.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards3.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards4.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="mb-3">
                    After building a road, the player may upgrade it to a town
                    and start producing more resources (2 for each town). To
                    build a town, the player must proide two wheat and three ore
                    to the market. A player may have a maximum of 4 towns on the
                    board at any time.
                    <br />
                    <img
                        src={cards4.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards4.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards5.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards5.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards5.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="text-3xl font-bold py-3">Trade</div>

                <div className="mb-3">
                    On the start of each turn, the current player must roll the
                    dice. This will lead to production of resources for all
                    players for their villages and towns. The current player may
                    now build and trade resources with other players. While
                    trading:
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            The player may offer one or more resources in
                            exchange for one or more resources of different or
                            the same type.
                        </li>
                        <li>
                            If another player finds the offer suitable, they may
                            accept the offer. The offering player will then
                            decide if they want to execute the trade.
                        </li>
                        <li>
                            If multiple players accept the offer, the offering
                            player may choose any one of them to trade with.
                        </li>
                        <li>
                            Other players may make counter offers if they wish
                            to.
                        </li>
                        <li>
                            Resources of the same type may not be exchanged
                            during a trade.
                        </li>
                        <li>
                            At least one resource must be given by each player
                            during a trade. In other words, a player may not
                            give another player a resource card for free.
                        </li>
                        <li>
                            Any number of trades may be executed during a turn.
                        </li>
                    </ul>
                </div>
                <div className="mb-3">
                    The current player may also trade with the market
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            The player can give any 4 cards of the same type in
                            exchange for one card of any other type to the
                            market.
                        </li>
                        <li>
                            If the player has a village adjacent to a general
                            port, they may do the same trade with 3 cards of the
                            same type for any type of card.
                            <br />
                            <img
                                src={port6.src}
                                className="h-12 mr-1 my-2 inline-block rounded-md"
                            ></img>
                        </li>
                        <li>
                            If the player has a village adjacent to a resource
                            port, they may do the same trade with 2 cards of the
                            same type for that type of resrouce. If the player
                            has ports for multiple resources, they may trade for
                            all these types.
                            <br />
                            <img
                                src={port1.src}
                                className="h-12 mr-1 my-2 inline-block rounded-md"
                            ></img>
                            <img
                                src={port2.src}
                                className="h-12 mr-1 my-2 inline-block rounded-md"
                            ></img>
                            <img
                                src={port3.src}
                                className="h-12 mr-1 my-2 inline-block rounded-md"
                            ></img>
                            <img
                                src={port4.src}
                                className="h-12 mr-1 my-2 inline-block rounded-md"
                            ></img>
                            <img
                                src={port5.src}
                                className="h-12 mr-1 my-2 inline-block rounded-md"
                            ></img>
                        </li>
                    </ul>
                </div>

                <div className="text-3xl font-bold py-3">
                    Victory Conditions
                </div>

                <div className="mb-3">
                    A player wins by accumuating victory points. These are
                    obtained by
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            Building Villages: Each village carries 1 point.
                        </li>
                        <li>Building Towns: Each town carries 2 points.</li>
                        <li>
                            Action Cards: Some action cards may provide extra
                            victory points.
                        </li>
                        <li>Extra Points: Detailed in a separate section.</li>
                    </ul>
                </div>

                <div className="mb-3">
                    A player may win only in their own turn after the dice is
                    rolled. Even if they achieve the requisite number of victory
                    points in another player's turn, they must wait until their
                    turn before declaring victory.
                </div>

                <div className="text-3xl font-bold py-3">Robber</div>

                <div className="mb-3">
                    Whenever 7 is rolled on the dice, the robber will steal
                    resources from the players. Any player with more resources
                    than the discard limit will have to discard half of their
                    resources (rounded down if the player has an odd number of
                    resources).
                </div>

                <div className="mb-3">
                    After the players have discarded resources, the current
                    player must move the robber to a different tile. While the
                    robber is placed on a tile, the settlements adjacent to this
                    tile will not produce any resources even if the number on
                    the tile is rolled.
                </div>

                <div className="mb-3">
                    After placing the robber, if any other player has a
                    settlement adjacent to the tile on which the robber is
                    placed, the current player must choose one of these players
                    to steal one random resource card from.
                </div>

                <div className="text-3xl font-bold py-3">Action Cards</div>
                <div className="mb-3">
                    During their turn, players may decide to purchase action
                    cards from the market using their resources instead of
                    building settlements or roads. To purchase an action card,
                    the player must provide one each of wool, wheat and ore to
                    the market. The player will then receive a random action
                    card from the top of the deck. Players may play upto one
                    action card every turn to activate the effect described on
                    the card (victory points do not need to be played). An
                    action card may not be played on the turn it is purchased.
                    <br />
                    <img
                        src={cards3.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards4.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards5.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="mb-3">
                    There are five types of action cards that the player may
                    receive:
                    <br />
                    <img
                        src={cards101.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                    <img
                        src={cards102.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                    <img
                        src={cards103.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                    <img
                        src={cards104.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                    <img
                        src={cards105.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                </div>

                <div className="text-3xl font-bold py-3">
                    Extra Victory Points
                </div>

                <div className="mb-3">
                    <div className="mb-2">
                        The player holding the longest trade route of roads with
                        a length of at least 5 will receive 2 extra victory
                        points. This trade route must be uninterrupted by any
                        road or settlement of another player. If another player
                        builds a longer trade route, the two victory points will
                        pass to that player.
                    </div>
                    <div className="mb-2">
                        Similarly, if a player uses 3 or more Warrior action
                        cards, they will receive 2 extra victory points for
                        controlling the strongest army. If any other player uses
                        more Warrior cards, the two extra points will pass to
                        that player.
                    </div>
                    <img
                        src={cards205.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                    <img
                        src={cards206.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                </div>
            </div>
            <div className="lg:basis-1/2 m-2 p-4 bg-black bg-opacity-60 text-lg rounded-lg overflow-auto lg:h-[85vh]">
                <div className="text-3xl font-bold py-3">
                    Wonders &amp; Warriors
                </div>

                <div className="mb-2">
                    This complexity mode provides higher depth of gameplay and
                    is recommended for more experienced players. Read the Basic
                    rules first before starting on this section.
                </div>

                <div className="text-3xl font-bold py-3">
                    Commodities &amp; Improvements
                </div>

                <div className="mb-2">
                    In this mode, at the start of the game, the players place
                    one village and one town on the board. Towns on wood, wool
                    or ore tiles produce commodities along with resources.
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            Towns on wood produce one wood and one paper. Paper
                            is used to build science improvements.
                            <br />
                            <img
                                src={tileTex1.src}
                                className="h-24 rounded-md mr-2 my-2 inline-block"
                            ></img>
                            <img
                                src={cards1.src}
                                className="h-24 rounded-md mr-2 my-2 inline-block"
                            ></img>
                            <img
                                src={cards6.src}
                                className="h-24 rounded-md inline-block"
                            ></img>
                        </li>
                        <li>
                            Towns on wool produce one wool and one cloth. Cloth
                            is used to build trade improvements.
                            <br />
                            <img
                                src={tileTex3.src}
                                className="h-24 rounded-md mr-2 my-2 inline-block"
                            ></img>
                            <img
                                src={cards3.src}
                                className="h-24 rounded-md mr-2 my-2 inline-block"
                            ></img>
                            <img
                                src={cards7.src}
                                className="h-24 rounded-md inline-block"
                            ></img>
                        </li>
                        <li>
                            Towns on ore produce one ore and one coin. Coin is
                            used to build military improvements.
                            <br />
                            <img
                                src={tileTex5.src}
                                className="h-24 rounded-md mr-2 my-2 inline-block"
                            ></img>
                            <img
                                src={cards5.src}
                                className="h-24 rounded-md mr-2 my-2 inline-block"
                            ></img>
                            <img
                                src={cards8.src}
                                className="h-24 rounded-md inline-block"
                            ></img>
                        </li>
                    </ul>
                </div>

                <div className="mb-2">
                    Commodities are used to build town improvements. Upto five
                    improvements may be built to towns, and you may build
                    improvements only when you have at least one town on the
                    board.
                </div>

                <div className="mb-2">
                    For the first improvement of any type,the player must
                    provide one commodity of that type to the market. for the
                    second improvement, the player must provide two commodities
                    of that type to the market, and so on.
                </div>

                <div className="mb-2">
                    Improvements produce action cards for the player (which
                    cannot be purchased). A third dice called the event dice is
                    rolled along with the number dice. The event dice shows
                    colors of the improvements. If the player has at least one
                    and upto one less improvement than the roll of the red dice
                    for the color of the event dice, they receive an action card
                    from the market. For example, if the event dice rolls yellow
                    and the red dice rolls 4, all players with 3 or more trade
                    upgrades will receive an action card.
                </div>

                <div className="text-3xl font-bold py-3">
                    Strategic Improvements
                </div>

                <div className="mb-2">
                    When any player builds 3 improvements of a type (e.g.
                    Science), they build a strategic improvement. These grant
                    special abilities as follows:
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            Science: The granary provides one resource of the
                            player's choice when a dice roll does not produce
                            any resource for the player's civilization. No
                            resoure is produced if the dice rolls to 7.
                            <br />
                            <img
                                src={cards207.src}
                                className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                            ></img>
                        </li>

                        <li>
                            Trade: The guild allows the player to trade two
                            commodities of the same type for any other resource
                            or commodity with the market.
                            <br />
                            <img
                                src={cards210.src}
                                className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                            ></img>
                        </li>

                        <li>
                            Military: The barracks allow the player to train
                            mighty warriors (more in the Warriors section).
                            <br />
                            <img
                                src={cards213.src}
                                className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                            ></img>
                        </li>
                    </ul>
                </div>

                <div className="text-3xl font-bold py-3">Wonders</div>

                <div className="mb-2">
                    If a player builds 4 improvements of a type, they build a
                    wonder of that type. A wonder carries two extra victory
                    points. If any other player now builds 5 upgrades of that
                    type, they get a great wonder, and these two extra points
                    pass to that player (the points of the player that
                    originally had built a wonder are reduced by 2). A great
                    wonder's points may not be claimed by other players during
                    the rest of the game, since it is not possible to build more
                    than 5 improvements of one type.
                </div>

                <div className="mb-2">
                    On building a wonder or a great wonder, the player must
                    place the wonder on one of their town. One town may only
                    have one wonder at any time. As a result, the player cannot
                    build wonders if they have no towns that have no wonders or
                    great wonders.
                </div>

                <img
                    src={cards208.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards211.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards214.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>

                <img
                    src={cards209.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards212.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards215.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>

                <div className="text-3xl font-bold py-3">Warriors</div>

                <div className="mb-2">
                    Players may place warriors on the board similar to
                    settlements. To build a warrior, the player must provide one
                    each of wool and ore to the market.
                    <br />
                    <img
                        src={cards3.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards5.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="mb-2">
                    After build a warrior, the player may activate it using one
                    wheat.
                    <br />
                    <img
                        src={cards4.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="mb-2">
                    Activated warriors may fight the dragon or perform an
                    action. An action may be performed only if the warrior was
                    not activated during the current turn. After the action is
                    performed, the warrior is deactivated (and may be
                    reactivated again in the same turn, but not perform another
                    action). These actions are:
                    <ul className="list-disc pl-6 mt-3">
                        <li>
                            A warrior may chase away the robber if the robber is
                            on a tile adjacent to the warrior.
                        </li>
                        <li>
                            A warrior may be moved along the player's
                            uninterrupted trade route and placed at a different
                            location. This location must be empty or contain
                            another player's warrior of lesser strength. If the
                            warrior is placed on another player's warrior, the
                            other player must move their warrior to a different
                            location. If there is no such location, the warrior
                            is removed from the board.
                        </li>
                    </ul>
                </div>

                <div className="mb-2">
                    The player may increase the strength of a warrior by
                    providing it with one wool and one ore.
                    <br />
                    <img
                        src={cards3.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                    <img
                        src={cards5.src}
                        className="h-12 mr-1 my-2 inline-block rounded-md"
                    ></img>
                </div>

                <div className="mb-2">
                    On doing this, a regular warrior will be upgraded to a
                    strong warrior. While fighting the dragon, the strength of
                    the warrior is considered equal to two warriors (if
                    activated). Strong warriors may also displace regular
                    warriors of other players.
                </div>

                <div className="mb-2">
                    The player may further upgrade a strong warrior to a mighty
                    warrior, which counts as three warriors and may displace
                    strong or regular warriors of other players. However, the
                    player must first build the barracks before this can be
                    done. Mighty warriors cannot be upgraded further or
                    displaced by another player's warriors.
                </div>

                <div className="text-3xl font-bold py-3">Dragons</div>

                <div className="mb-2">
                    The wealth of the Imperials attracts dragons from the
                    mountains. If a player is not protected from the dragon, the
                    dragon will destroy one of their towns and reduce it to a
                    village!
                </div>

                <div className="mb-2">
                    If the event dice rolls black, the dragon moves towards the
                    island by one step. The progress of the dragon is shown to
                    the left. When the dragon reaches the island, the combined
                    strength of the players' armies decides the fate of the
                    island. The strength of the dragon is determined by the
                    total number of towns on the board. If the total strength of
                    the army is equal or greater than the strength of the
                    dragon, the players will defeat the dragon. Regardless of
                    the result of the dragon war, all warriors are deactivated
                    after the war.
                </div>

                <div className="mb-2">
                    When the dragon is defeated, if one player has more active
                    warriors than any other player, they receive an extra
                    victory point for being the Dragonslayer. The dragon then
                    moves back to the mountain.
                    <br />
                    <img
                        src={cards204.src}
                        className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                    ></img>
                </div>

                <div className="mb-2">
                    If two or more players have an equal number of active
                    warriors, they receive an action card from the market of any
                    type of their choice.
                </div>

                <div className="mb-2">
                    If the combined strength of all the active warriors on the
                    board is less than the dragon's strength, the player(s) with
                    the fewest number of active knights must choose one town to
                    demote to a village. If a player has no towns, they are not
                    considered in the calculation of the players with the lowest
                    number of active warriors.
                </div>

                <div className="mb-2">
                    Wonders protect towns against the dragon. A player may not
                    demote a town with a wonder to a village. If a player has no
                    towns without wonders, they are treated similarly as having
                    no towns when calculating the players with the least number
                    of active knights.
                </div>

                <div className="text-3xl font-bold py-3">Town Fence</div>

                <div className="mb-2">
                    The player may build a fence for towns to keep out the
                    robber. For each fence built, the discard limit of the
                    player is increased by 2. Upto 3 fences may be built by any
                    player, and a town can have only one fence at any time. If a
                    town is destroyed by the dragon, the fence is also
                    destroyed.
                </div>

                <div className="text-3xl font-bold py-3">Action Cards</div>

                <div className="mb-2">
                    Players receive action cards as detailed in the improvements
                    section. The color of each card corresponds to the
                    improvement type for which it may be received.
                </div>
                <div className="mb-2">
                    Unlike the basic mode, players may use as many action cards
                    as they desire during their turn. However, the player may
                    not hold more than 4 action cards in their hand when it's
                    not their turn. If the player has more than 4 action cards,
                    they must discard one back to the market.
                </div>

                <img
                    src={cards106.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards107.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards108.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards109.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards110.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards111.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>

                <img
                    src={cards112.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards113.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards114.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards115.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards116.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards117.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards118.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards119.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards120.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards121.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards122.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards123.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards124.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards125.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards126.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards127.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards128.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards129.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
                <img
                    src={cards130.src}
                    className="h-[300px] mr-4 my-2 inline-block rounded-2xl"
                ></img>
            </div>
        </div>
    </>
);

export default Rules;
