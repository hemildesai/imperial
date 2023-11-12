/* eslint-disable @typescript-eslint/no-explicit-any */

export type IGameSettings = {
    Mode: GameMode /* entities.GameMode */;
    Private: boolean;
    MapName: string;
    DiscardLimit: number;
    VictoryPoints: number;
    SpecialBuild: boolean;
    MaxPlayers: number;
    EnableKarma: boolean;
    Speed: string;
    Advanced: boolean;
};

export class GameSettings implements IGameSettings {
    public Mode: GameMode /* entities.GameMode */;
    public Private: boolean;
    public MapName: string;
    public DiscardLimit: number;
    public VictoryPoints: number;
    public SpecialBuild: boolean;
    public MaxPlayers: number;
    public EnableKarma: boolean;
    public Speed: string;
    public Advanced: boolean;

    constructor(input: any) {
        this.Mode = input.Mode;
        this.Private = input.Private;
        this.MapName = input.MapName;
        this.DiscardLimit = input.DiscardLimit;
        this.VictoryPoints = input.VictoryPoints;
        this.SpecialBuild = input.SpecialBuild;
        this.MaxPlayers = input.MaxPlayers;
        this.EnableKarma = input.EnableKarma;
        this.Speed = input.Speed;
        this.Advanced = input.Advanced;
    }

    public encode() {
        const out: any = {};
        out.Mode = this.Mode;
        out.Private = this.Private;
        out.MapName = this.MapName;
        out.DiscardLimit = this.DiscardLimit;
        out.VictoryPoints = this.VictoryPoints;
        out.SpecialBuild = this.SpecialBuild;
        out.MaxPlayers = this.MaxPlayers;
        out.EnableKarma = this.EnableKarma;
        out.Speed = this.Speed;
        out.Advanced = this.Advanced;
        return out;
    }
}

export type GameMode = number;
export type IGameMode = number;
export type IAdvancedSettings = {
    RerollOn7: boolean;
};

export class AdvancedSettings implements IAdvancedSettings {
    public RerollOn7: boolean;

    constructor(input: any) {
        this.RerollOn7 = input.RerollOn7;
    }

    public encode() {
        const out: any = {};
        out.RerollOn7 = this.RerollOn7;
        return out;
    }
}

export type IGameState = {
    CurrentPlayerOrder: number;
    NeedDice: boolean;
    Robber: Robber /* entities.Robber */;
    PlayerStates: PlayerState /* []*entities.PlayerState */[];
    BarbarianPosition: number;
    BarbarianStrength: number;
    BarbarianKnights: number;
    Merchant: Merchant /* entities.Merchant */;
};

export class GameState implements IGameState {
    public CurrentPlayerOrder: number;
    public NeedDice: boolean;
    public Robber: Robber /* entities.Robber */;
    public PlayerStates: PlayerState /* []*entities.PlayerState */[];
    public BarbarianPosition: number;
    public BarbarianStrength: number;
    public BarbarianKnights: number;
    public Merchant: Merchant /* entities.Merchant */;

    constructor(input: any) {
        this.CurrentPlayerOrder = input.c;
        this.NeedDice = input.d;
        this.Robber = input.r ? new Robber(input.r) : input.r;
        this.PlayerStates = input.p?.map((v: any) =>
            v ? new PlayerState(v) : undefined,
        );
        this.BarbarianPosition = input.bp;
        this.BarbarianStrength = input.bs;
        this.BarbarianKnights = input.bk;
        this.Merchant = input.tm ? new Merchant(input.tm) : input.tm;
    }

    public encode() {
        const out: any = {};
        out.c = this.CurrentPlayerOrder;
        out.d = this.NeedDice;
        out.r = this.Robber?.encode?.();
        out.p = this.PlayerStates?.map((v: any) => v?.encode?.());
        out.bp = this.BarbarianPosition;
        out.bs = this.BarbarianStrength;
        out.bk = this.BarbarianKnights;
        out.tm = this.Merchant?.encode?.();
        return out;
    }
}

export type IRobber = {
    Tile: Tile /* entities.Tile */;
};

export class Robber implements IRobber {
    public Tile: Tile /* entities.Tile */;

    constructor(input: any) {
        this.Tile = input.t ? new Tile(input.t) : input.t;
    }

    public encode() {
        const out: any = {};
        out.t = this.Tile?.encode?.();
        return out;
    }
}

export type ITile = {
    Center: Coordinate /* entities.Coordinate */;
    Type: TileType /* entities.TileType */;
    Number: number;
    Fog: boolean;
};

export class Tile implements ITile {
    public Center: Coordinate /* entities.Coordinate */;
    public Type: TileType /* entities.TileType */;
    public Number: number;
    public Fog: boolean;

    constructor(input: any) {
        this.Center = input.c ? new Coordinate(input.c) : input.c;
        this.Type = input.t;
        this.Number = input.n;
        this.Fog = input.f;
    }

    public encode() {
        const out: any = {};
        out.c = this.Center?.encode?.();
        out.t = this.Type;
        out.n = this.Number;
        out.f = this.Fog;
        return out;
    }
}

export type ICoordinate = {
    X: number;
    Y: number;
};

export class Coordinate implements ICoordinate {
    public X: number;
    public Y: number;

    constructor(input: any) {
        this.X = input.x;
        this.Y = input.y;
    }

    public encode() {
        const out: any = {};
        out.x = this.X;
        out.y = this.Y;
        return out;
    }
}

export type TileType = number;
export type ITileType = number;
export type IPlayerState = {
    Id: string;
    Username: string;
    Order: number;
    Color: string;
    RandInt: number;
    NumCards: number;
    NumDevelopmentCards: number;
    Current: boolean;
    HasPendingAction: boolean;
    VictoryPoints: number;
    LongestRoad: number;
    Knights: number;
    TimeLeft: number;
    Improvements: { [key: int]: int | undefined };
    DiscardLimit: number;
    IsBot?: boolean;
    HasLongestRoad?: boolean;
    HasLargestArmy?: boolean;
    DevCardVp?: number;
};

export class PlayerState implements IPlayerState {
    public Id: string;
    public Username: string;
    public Order: number;
    public Color: string;
    public RandInt: number;
    public NumCards: number;
    public NumDevelopmentCards: number;
    public Current: boolean;
    public HasPendingAction: boolean;
    public VictoryPoints: number;
    public LongestRoad: number;
    public Knights: number;
    public TimeLeft: number;
    public Improvements: { [key: int]: int | undefined };
    public DiscardLimit: number;
    public IsBot?: boolean;
    public HasLongestRoad?: boolean;
    public HasLargestArmy?: boolean;
    public DevCardVp?: number;

    constructor(input: any) {
        this.Id = input.id;
        this.Username = input.u;
        this.Order = input.o;
        this.Color = input.c;
        this.RandInt = input.r;
        this.NumCards = input.n;
        this.NumDevelopmentCards = input.d;
        this.Current = input.t;
        this.HasPendingAction = input.a;
        this.VictoryPoints = input.v;
        this.LongestRoad = input.j;
        this.Knights = input.k;
        this.TimeLeft = input.i;
        this.Improvements = input.ci;
        this.DiscardLimit = input.l;
        this.IsBot = input.b;
        this.HasLongestRoad = input.lr;
        this.HasLargestArmy = input.la;
        this.DevCardVp = input.dv;
    }

    public encode() {
        const out: any = {};
        out.id = this.Id;
        out.u = this.Username;
        out.o = this.Order;
        out.c = this.Color;
        out.r = this.RandInt;
        out.n = this.NumCards;
        out.d = this.NumDevelopmentCards;
        out.t = this.Current;
        out.a = this.HasPendingAction;
        out.v = this.VictoryPoints;
        out.j = this.LongestRoad;
        out.k = this.Knights;
        out.i = this.TimeLeft;
        out.ci = this.Improvements;
        out.l = this.DiscardLimit;
        out.b = this.IsBot;
        out.lr = this.HasLongestRoad;
        out.la = this.HasLargestArmy;
        out.dv = this.DevCardVp;
        return out;
    }
}

export type int = number;
export type Iint = number;
export type IMerchant = {
    Tile: Tile /* entities.Tile */;
    Owner: Player /* entities.Player */;
};

export class Merchant implements IMerchant {
    public Tile: Tile /* entities.Tile */;
    public Owner: Player /* entities.Player */;

    constructor(input: any) {
        this.Tile = input.t ? new Tile(input.t) : input.t;
        this.Owner = input.p ? new Player(input.p) : input.p;
    }

    public encode() {
        const out: any = {};
        out.t = this.Tile?.encode?.();
        out.p = this.Owner?.encode?.();
        return out;
    }
}

export type IPlayer = {
    Username: string;
    Color: string;
    Order: number;
};

export class Player implements IPlayer {
    public Username: string;
    public Color: string;
    public Order: number;

    constructor(input: any) {
        this.Username = input.u;
        this.Color = input.c;
        this.Order = input.o;
    }

    public encode() {
        const out: any = {};
        out.u = this.Username;
        out.c = this.Color;
        out.o = this.Order;
        return out;
    }
}

export type IVertex = {
    C: Coordinate /* entities.Coordinate */;
};

export class Vertex implements IVertex {
    public C: Coordinate /* entities.Coordinate */;

    constructor(input: any) {
        this.C = input.c ? new Coordinate(input.c) : input.c;
    }

    public encode() {
        const out: any = {};
        out.c = this.C?.encode?.();
        return out;
    }
}

export type IEdge = {
    C: EdgeCoordinate /* entities.EdgeCoordinate */;
    IsBeach: boolean;
    Orientation: number;
};

export class Edge implements IEdge {
    public C: EdgeCoordinate /* entities.EdgeCoordinate */;
    public IsBeach: boolean;
    public Orientation: number;

    constructor(input: any) {
        this.C = input.c ? new EdgeCoordinate(input.c) : input.c;
        this.IsBeach = input.b;
        this.Orientation = input.o;
    }

    public encode() {
        const out: any = {};
        out.c = this.C?.encode?.();
        out.b = this.IsBeach;
        out.o = this.Orientation;
        return out;
    }
}

export type IEdgeCoordinate = {
    C1: Coordinate /* entities.Coordinate */;
    C2: Coordinate /* entities.Coordinate */;
};

export class EdgeCoordinate implements IEdgeCoordinate {
    public C1: Coordinate /* entities.Coordinate */;
    public C2: Coordinate /* entities.Coordinate */;

    constructor(input: any) {
        this.C1 = input.c1 ? new Coordinate(input.c1) : input.c1;
        this.C2 = input.c2 ? new Coordinate(input.c2) : input.c2;
    }

    public encode() {
        const out: any = {};
        out.c1 = this.C1?.encode?.();
        out.c2 = this.C2?.encode?.();
        return out;
    }
}

export type IVertexPlacement = {
    Owner: Player /* entities.Player */;
    Location: Vertex /* entities.Vertex */;
    Type: BuildableType /* entities.BuildableType */;
    Metropolis: CardType /* entities.CardType */;
    Activated: boolean;
    Wall: boolean;
};

export class VertexPlacement implements IVertexPlacement {
    public Owner: Player /* entities.Player */;
    public Location: Vertex /* entities.Vertex */;
    public Type: BuildableType /* entities.BuildableType */;
    public Metropolis: CardType /* entities.CardType */;
    public Activated: boolean;
    public Wall: boolean;

    constructor(input: any) {
        this.Owner = input.p ? new Player(input.p) : input.p;
        this.Location = input.l ? new Vertex(input.l) : input.l;
        this.Type = input.t;
        this.Metropolis = input.m;
        this.Activated = input.a;
        this.Wall = input.w;
    }

    public encode() {
        const out: any = {};
        out.p = this.Owner?.encode?.();
        out.l = this.Location?.encode?.();
        out.t = this.Type;
        out.m = this.Metropolis;
        out.a = this.Activated;
        out.w = this.Wall;
        return out;
    }
}

export type BuildableType = number;
export type IBuildableType = number;
export type CardType = number;
export type ICardType = number;
export type IRoad = {
    Owner: Player /* entities.Player */;
    Location: Edge /* entities.Edge */;
    Type: BuildableType /* entities.BuildableType */;
};

export class Road implements IRoad {
    public Owner: Player /* entities.Player */;
    public Location: Edge /* entities.Edge */;
    public Type: BuildableType /* entities.BuildableType */;

    constructor(input: any) {
        this.Owner = input.p ? new Player(input.p) : input.p;
        this.Location = input.e ? new Edge(input.e) : input.e;
        this.Type = input.t;
    }

    public encode() {
        const out: any = {};
        out.p = this.Owner?.encode?.();
        out.e = this.Location?.encode?.();
        out.t = this.Type;
        return out;
    }
}

export type IPort = {
    Type: PortType /* entities.PortType */;
    Vertices: Vertex /* []*entities.Vertex */[];
    Edge: Edge /* entities.Edge */;
    Ratio: number;
};

export class Port implements IPort {
    public Type: PortType /* entities.PortType */;
    public Vertices: Vertex /* []*entities.Vertex */[];
    public Edge: Edge /* entities.Edge */;
    public Ratio: number;

    constructor(input: any) {
        this.Type = input.t;
        this.Vertices = input.v?.map((v: any) =>
            v ? new Vertex(v) : undefined,
        );
        this.Edge = input.e ? new Edge(input.e) : input.e;
        this.Ratio = input.r;
    }

    public encode() {
        const out: any = {};
        out.t = this.Type;
        out.v = this.Vertices?.map((v: any) => v?.encode?.());
        out.e = this.Edge?.encode?.();
        out.r = this.Ratio;
        return out;
    }
}

export type PortType = number;
export type IPortType = number;
export type IPlayerSecretState = {
    Cards: { [key: CardType]: int | undefined };
    DevelopmentCards: int /* []int */[];
    BuildablesLeft: { [key: BuildableType]: int | undefined };
    VictoryPoints: number;
    AllowedActions: AllowedActionsMap /* entities.AllowedActionsMap */;
    TradeRatios: int /* []int */[];
};

export class PlayerSecretState implements IPlayerSecretState {
    public Cards: { [key: CardType]: int | undefined };
    public DevelopmentCards: int /* []int */[];
    public BuildablesLeft: { [key: BuildableType]: int | undefined };
    public VictoryPoints: number;
    public AllowedActions: AllowedActionsMap /* entities.AllowedActionsMap */;
    public TradeRatios: int /* []int */[];

    constructor(input: any) {
        this.Cards = input.c;
        this.DevelopmentCards = input.d;
        this.BuildablesLeft = input.b;
        this.VictoryPoints = input.v;
        this.AllowedActions = input.a
            ? new AllowedActionsMap(input.a)
            : input.a;
        this.TradeRatios = input.r;
    }

    public encode() {
        const out: any = {};
        out.c = this.Cards;
        out.d = this.DevelopmentCards;
        out.b = this.BuildablesLeft;
        out.v = this.VictoryPoints;
        out.a = this.AllowedActions?.encode?.();
        out.r = this.TradeRatios;
        return out;
    }
}

export type IAllowedActionsMap = {
    BuildSettlement?: boolean;
    BuildCity?: boolean;
    BuildRoad?: boolean;
    BuyDevelopmentCard?: boolean;
    Trade?: boolean;
    EndTurn?: boolean;
    BuildKnight?: boolean;
    ActivateKnight?: boolean;
    RobberKnight?: boolean;
    MoveKnight?: boolean;
    BuildWall?: boolean;
    ImprovePaper?: boolean;
    ImproveCloth?: boolean;
    ImproveCoin?: boolean;
    SpecialBuild?: boolean;
};

export class AllowedActionsMap implements IAllowedActionsMap {
    public BuildSettlement?: boolean;
    public BuildCity?: boolean;
    public BuildRoad?: boolean;
    public BuyDevelopmentCard?: boolean;
    public Trade?: boolean;
    public EndTurn?: boolean;
    public BuildKnight?: boolean;
    public ActivateKnight?: boolean;
    public RobberKnight?: boolean;
    public MoveKnight?: boolean;
    public BuildWall?: boolean;
    public ImprovePaper?: boolean;
    public ImproveCloth?: boolean;
    public ImproveCoin?: boolean;
    public SpecialBuild?: boolean;

    constructor(input: any) {
        this.BuildSettlement = input.s;
        this.BuildCity = input.c;
        this.BuildRoad = input.r;
        this.BuyDevelopmentCard = input.d;
        this.Trade = input.t;
        this.EndTurn = input.e;
        this.BuildKnight = input.kb;
        this.ActivateKnight = input.ka;
        this.RobberKnight = input.kr;
        this.MoveKnight = input.km;
        this.BuildWall = input.w;
        this.ImprovePaper = input.ip;
        this.ImproveCloth = input.il;
        this.ImproveCoin = input.ic;
        this.SpecialBuild = input.sb;
    }

    public encode() {
        const out: any = {};
        out.s = this.BuildSettlement;
        out.c = this.BuildCity;
        out.r = this.BuildRoad;
        out.d = this.BuyDevelopmentCard;
        out.t = this.Trade;
        out.e = this.EndTurn;
        out.kb = this.BuildKnight;
        out.ka = this.ActivateKnight;
        out.kr = this.RobberKnight;
        out.km = this.MoveKnight;
        out.w = this.BuildWall;
        out.ip = this.ImprovePaper;
        out.il = this.ImproveCloth;
        out.ic = this.ImproveCoin;
        out.sb = this.SpecialBuild;
        return out;
    }
}

export type IDieRollState = {
    RedRoll: number;
    WhiteRoll: number;
    EventRoll: number;
    GainInfo: CardMoveInfo /* []entities.CardMoveInfo */[];
    IsInit?: boolean;
};

export class DieRollState implements IDieRollState {
    public RedRoll: number;
    public WhiteRoll: number;
    public EventRoll: number;
    public GainInfo: CardMoveInfo /* []entities.CardMoveInfo */[];
    public IsInit?: boolean;

    constructor(input: any) {
        this.RedRoll = input.r;
        this.WhiteRoll = input.w;
        this.EventRoll = input.e;
        this.GainInfo = input.g?.map((v: any) =>
            v ? new CardMoveInfo(v) : undefined,
        );
        this.IsInit = input.ii;
    }

    public encode() {
        const out: any = {};
        out.r = this.RedRoll;
        out.w = this.WhiteRoll;
        out.e = this.EventRoll;
        out.g = this.GainInfo?.map((v: any) => v?.encode?.());
        out.ii = this.IsInit;
        return out;
    }
}

export type ICardMoveInfo = {
    Tile: Tile /* entities.Tile */;
    GainerOrder: number;
    GiverOrder: number;
    CardType: CardType /* entities.CardType */;
    Quantity: number;
};

export class CardMoveInfo implements ICardMoveInfo {
    public Tile: Tile /* entities.Tile */;
    public GainerOrder: number;
    public GiverOrder: number;
    public CardType: CardType /* entities.CardType */;
    public Quantity: number;

    constructor(input: any) {
        this.Tile = input.t ? new Tile(input.t) : input.t;
        this.GainerOrder = input.a;
        this.GiverOrder = input.i;
        this.CardType = input.c;
        this.Quantity = input.q;
    }

    public encode() {
        const out: any = {};
        out.t = this.Tile?.encode?.();
        out.a = this.GainerOrder;
        out.i = this.GiverOrder;
        out.c = this.CardType;
        out.q = this.Quantity;
        return out;
    }
}

export type ICardDeck = {
    Type: CardType /* entities.CardType */;
    Quantity: number;
};

export class CardDeck implements ICardDeck {
    public Type: CardType /* entities.CardType */;
    public Quantity: number;

    constructor(input: any) {
        this.Type = input.t;
        this.Quantity = input.q;
    }

    public encode() {
        const out: any = {};
        out.t = this.Type;
        out.q = this.Quantity;
        return out;
    }
}

export type IDevelopmentCardDeck = {
    Type: DevelopmentCardType /* entities.DevelopmentCardType */;
    Quantity: number;
    CanUse: boolean;
    NumUsed: number;
};

export class DevelopmentCardDeck implements IDevelopmentCardDeck {
    public Type: DevelopmentCardType /* entities.DevelopmentCardType */;
    public Quantity: number;
    public CanUse: boolean;
    public NumUsed: number;

    constructor(input: any) {
        this.Type = input.t;
        this.Quantity = input.q;
        this.CanUse = input.u;
        this.NumUsed = input.k;
    }

    public encode() {
        const out: any = {};
        out.t = this.Type;
        out.q = this.Quantity;
        out.u = this.CanUse;
        out.k = this.NumUsed;
        return out;
    }
}

export type DevelopmentCardType = number;
export type IDevelopmentCardType = number;
export type IDevCardUseInfo = {
    CardType: DevelopmentCardType /* entities.DevelopmentCardType */;
    Time: number;
    DestOrder: number;
};

export class DevCardUseInfo implements IDevCardUseInfo {
    public CardType: DevelopmentCardType /* entities.DevelopmentCardType */;
    public Time: number;
    public DestOrder: number;

    constructor(input: any) {
        this.CardType = input.c;
        this.Time = input.t;
        this.DestOrder = input.d;
    }

    public encode() {
        const out: any = {};
        out.c = this.CardType;
        out.t = this.Time;
        out.d = this.DestOrder;
        return out;
    }
}

export type ITradeOffer = {
    Id: number;
    CreatedBy: number;
    CurrentPlayer: number;
    Details: TradeOfferDetails /* entities.TradeOfferDetails */;
    Acceptances: int /* []int */[];
    Destroyed: boolean;
};

export class TradeOffer implements ITradeOffer {
    public Id: number;
    public CreatedBy: number;
    public CurrentPlayer: number;
    public Details: TradeOfferDetails /* entities.TradeOfferDetails */;
    public Acceptances: int /* []int */[];
    public Destroyed: boolean;

    constructor(input: any) {
        this.Id = input.i;
        this.CreatedBy = input.c;
        this.CurrentPlayer = input.p;
        this.Details = input.d ? new TradeOfferDetails(input.d) : input.d;
        this.Acceptances = input.a;
        this.Destroyed = input.y;
    }

    public encode() {
        const out: any = {};
        out.i = this.Id;
        out.c = this.CreatedBy;
        out.p = this.CurrentPlayer;
        out.d = this.Details?.encode?.();
        out.a = this.Acceptances;
        out.y = this.Destroyed;
        return out;
    }
}

export type ITradeOfferDetails = {
    Give: int /* [9]int */[];
    Ask: int /* [9]int */[];
};

export class TradeOfferDetails implements ITradeOfferDetails {
    public Give: int /* [9]int */[];
    public Ask: int /* [9]int */[];

    constructor(input: any) {
        this.Give = input.g;
        this.Ask = input.a;
    }

    public encode() {
        const out: any = {};
        out.g = this.Give;
        out.a = this.Ask;
        return out;
    }
}

export type IGameOverMessage = {
    Players: PlayerState /* []*entities.PlayerState */[];
    Winner: number;
};

export class GameOverMessage implements IGameOverMessage {
    public Players: PlayerState /* []*entities.PlayerState */[];
    public Winner: number;

    constructor(input: any) {
        this.Players = input.p?.map((v: any) =>
            v ? new PlayerState(v) : undefined,
        );
        this.Winner = input.w;
    }

    public encode() {
        const out: any = {};
        out.p = this.Players?.map((v: any) => v?.encode?.());
        out.w = this.Winner;
        return out;
    }
}

export type IPlayerAction = {
    Type: string;
    Data: any;
    CanCancel: boolean;
    Message: string;
};

export class PlayerAction implements IPlayerAction {
    public Type: string;
    public Data: any;
    public CanCancel: boolean;
    public Message: string;

    constructor(input: any) {
        this.Type = input.t;
        this.Data = input.d;
        this.CanCancel = input.c;
        this.Message = input.m;
    }

    public encode() {
        const out: any = {};
        out.t = this.Type;
        out.d = this.Data;
        out.c = this.CanCancel;
        out.m = this.Message;
        return out;
    }
}

export type IPlayerActionChooseEdge = {
    Allowed: Edge /* []*entities.Edge */[];
};

export class PlayerActionChooseEdge implements IPlayerActionChooseEdge {
    public Allowed: Edge /* []*entities.Edge */[];

    constructor(input: any) {
        this.Allowed = input.e?.map((v: any) => (v ? new Edge(v) : undefined));
    }

    public encode() {
        const out: any = {};
        out.e = this.Allowed?.map((v: any) => v?.encode?.());
        return out;
    }
}

export type IPlayerActionChooseVertex = {
    Allowed: Vertex /* []*entities.Vertex */[];
};

export class PlayerActionChooseVertex implements IPlayerActionChooseVertex {
    public Allowed: Vertex /* []*entities.Vertex */[];

    constructor(input: any) {
        this.Allowed = input.v?.map((v: any) =>
            v ? new Vertex(v) : undefined,
        );
    }

    public encode() {
        const out: any = {};
        out.v = this.Allowed?.map((v: any) => v?.encode?.());
        return out;
    }
}

export type IPlayerActionChooseTile = {
    Allowed: Tile /* []*entities.Tile */[];
};

export class PlayerActionChooseTile implements IPlayerActionChooseTile {
    public Allowed: Tile /* []*entities.Tile */[];

    constructor(input: any) {
        this.Allowed = input.a?.map((v: any) => (v ? new Tile(v) : undefined));
    }

    public encode() {
        const out: any = {};
        out.a = this.Allowed?.map((v: any) => v?.encode?.());
        return out;
    }
}

export type IPlayerActionChoosePlayer = {
    Choices: bool /* []bool */[];
};

export class PlayerActionChoosePlayer implements IPlayerActionChoosePlayer {
    public Choices: bool /* []bool */[];

    constructor(input: any) {
        this.Choices = input.c;
    }

    public encode() {
        const out: any = {};
        out.c = this.Choices;
        return out;
    }
}

export type bool = boolean;
export type Ibool = boolean;
export type IPlayerActionSelectCards = {
    AllowedTypes: int /* []int */[];
    Quantity: number;
    NotSelfHand: boolean;
    Getting: int /* []int */[];
    Hand: int /* []int */[];
    IsDevHand: boolean;
};

export class PlayerActionSelectCards implements IPlayerActionSelectCards {
    public AllowedTypes: int /* []int */[];
    public Quantity: number;
    public NotSelfHand: boolean;
    public Getting: int /* []int */[];
    public Hand: int /* []int */[];
    public IsDevHand: boolean;

    constructor(input: any) {
        this.AllowedTypes = input.a;
        this.Quantity = input.q;
        this.NotSelfHand = input.n;
        this.Getting = input.g;
        this.Hand = input.h;
        this.IsDevHand = input.d;
    }

    public encode() {
        const out: any = {};
        out.a = this.AllowedTypes;
        out.q = this.Quantity;
        out.n = this.NotSelfHand;
        out.g = this.Getting;
        out.h = this.Hand;
        out.d = this.IsDevHand;
        return out;
    }
}

export type ILobbyPlayerState = {
    Username: string;
    Color: string;
    Order: number;
    Ready: boolean;
    GamesStarted: number;
    GamesFinished: number;
};

export class LobbyPlayerState implements ILobbyPlayerState {
    public Username: string;
    public Color: string;
    public Order: number;
    public Ready: boolean;
    public GamesStarted: number;
    public GamesFinished: number;

    constructor(input: any) {
        this.Username = input.u;
        this.Color = input.c;
        this.Order = input.o;
        this.Ready = input.r;
        this.GamesStarted = input.s;
        this.GamesFinished = input.f;
    }

    public encode() {
        const out: any = {};
        out.u = this.Username;
        out.c = this.Color;
        out.o = this.Order;
        out.r = this.Ready;
        out.s = this.GamesStarted;
        out.f = this.GamesFinished;
        return out;
    }
}

export type IStoreGameState = {
    ID: string;
    Settings: GameSettings /* entities.GameSettings */;
    AdvancedSettings: AdvancedSettings /* entities.AdvancedSettings */;
    NumPlayers: number;
    PlayerStates: PlayerState /* []*entities.PlayerState */[];
    PlayerSecretStates: PlayerSecretState /* []*entities.PlayerSecretState */[];
    GameOver: boolean;
    Winner: number;
};

export class StoreGameState implements IStoreGameState {
    public ID: string;
    public Settings: GameSettings /* entities.GameSettings */;
    public AdvancedSettings: AdvancedSettings /* entities.AdvancedSettings */;
    public NumPlayers: number;
    public PlayerStates: PlayerState /* []*entities.PlayerState */[];
    public PlayerSecretStates: PlayerSecretState /* []*entities.PlayerSecretState */[];
    public GameOver: boolean;
    public Winner: number;

    constructor(input: any) {
        this.ID = input.id;
        this.Settings = input.s ? new GameSettings(input.s) : input.s;
        this.AdvancedSettings = input.as
            ? new AdvancedSettings(input.as)
            : input.as;
        this.NumPlayers = input.n;
        this.PlayerStates = input.ps?.map((v: any) =>
            v ? new PlayerState(v) : undefined,
        );
        this.PlayerSecretStates = input.pss?.map((v: any) =>
            v ? new PlayerSecretState(v) : undefined,
        );
        this.GameOver = input.g;
        this.Winner = input.w;
    }

    public encode() {
        const out: any = {};
        out.id = this.ID;
        out.s = this.Settings?.encode?.();
        out.as = this.AdvancedSettings?.encode?.();
        out.n = this.NumPlayers;
        out.ps = this.PlayerStates?.map((v: any) => v?.encode?.());
        out.pss = this.PlayerSecretStates?.map((v: any) => v?.encode?.());
        out.g = this.GameOver;
        out.w = this.Winner;
        return out;
    }
}
