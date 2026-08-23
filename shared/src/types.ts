export type CardColor = 'RED' | 'BLUE' | 'YELLOW' | 'GREEN' | 'WILD';

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'SKIP' | 'REVERSE' | 'DRAW_TWO'
  | 'SKIP_EVERYONE' | 'DRAW_FIVE'
  | 'WILD' | 'WILD_DRAW_FOUR' | 'WILD_DRAW_FIVE'
  | 'FLIP';

export type CardSide = 'LIGHT' | 'DARK';

export interface CardFace {
  color: CardColor;
  value: CardValue;
}

export interface Card {
  id: string;
  lightFace: CardFace;
  darkFace: CardFace;
}

export type AiPersonality = 'Strategist' | 'Aggressive' | 'Defensive' | 'Chaotic' | 'Troll';
export type AiDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export interface Player {
  id: string;
  name: string;
  avatar: string; // URL or ID of avatar
  isAi: boolean;
  aiDifficulty?: AiDifficulty;
  aiPersonality?: AiPersonality;
  isReady: boolean;
  cards: Card[];
  isSpectator: boolean;
  isDisconnected: boolean;
  score: number; // cumulative score across rounds
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'GAME_OVER';

export interface MatchRules {
  stacking: boolean;        // allow stacking +2 on +2, +4 on +4 (and maybe +4 on +2)
  jumpIn: boolean;          // exact match play out of turn
  drawUntilPlayable: boolean; // draw until a playable card is found
  challengeWild4: boolean;   // challenge wild draw 4 play
  timerMode: boolean;       // enable turn timer
  timerSeconds: number;     // duration of timer
  startingHandSize: number; // default 7
  scoreLimit: number;       // default 500
  roundLimit: number;       // default 5
  flipMode: boolean;        // enable flip mode (dual-face cards)
  maxPlayers?: number;      // optional custom-room capacity
  practiceMode?: boolean;   // local AI-practice room, no invite code shown
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  type: 'PLAY' | 'DRAW' | 'SKIP' | 'SKIP_EVERYONE' | 'REVERSE' | 'CARD_CALL' | 'CARD_PENALTY' | 'CHALLENGE' | 'SYSTEM' | 'CHAT';
  message: string;
  playerId?: string;
}

export interface GameState {
  roomId: string;
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  discardPile: Card[];
  drawPileCount: number;
  activeColor: CardColor;
  activeValue: CardValue;
  direction: 'CW' | 'CCW';
  drawStackCount: number; // accumulative draw stack (e.g. +2, +4 stack)
  winnerId: string | null;
  rules: MatchRules;
  logs: GameLogEntry[];
  turnTimeLeft?: number; // server turn timer ticking down
  turnStartedAt?: number;
  stateVersion: number; // Increment on each state change for desync detection
  activeSide: CardSide; // LIGHT or DARK side for flip mode
}

export interface ReplayFrame {
  timestamp: number;
  moveIndex: number;
  action: {
    type: string;
    playerId?: string;
    card?: Card;
    targetPlayerId?: string;
    calledColor?: CardColor;
  };
  stateSnapshot: Omit<GameState, 'discardPile'> & { discardPileTop: Card | null };
}

// User types for auth
export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  banner: string;
  xp: number;
  level: number;
  mmr: number;
  rankedTier: string;
  gamesPlayed: number;
  gamesWon: number;
}
