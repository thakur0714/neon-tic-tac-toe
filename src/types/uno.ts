export type UnoCardColor = 'red' | 'blue' | 'green' | 'yellow' | 'wild';

export type UnoCardValue =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 'skip'
  | 'reverse'
  | 'draw2'
  | 'wild'
  | 'wild4';

export interface UnoCard {
  id: string;
  color: UnoCardColor;
  value: UnoCardValue;
}

export type UnoPlayerType = 'human' | 'ai';

export type UnoPlayType = 'vs-ai' | 'pass-and-play' | 'online';

export type UnoDifficulty = 'rookie' | 'pro' | 'master';

export type UnoTablePosition = 'bottom' | 'top' | 'left' | 'right';

export interface UnoPlayer {
  id: string;
  name: string;
  type: UnoPlayerType;
  hand: UnoCard[];
  avatarColor: string;
  position: UnoTablePosition;
  hasCalledUno?: boolean;
}

export type UnoGameStatus = 'setup' | 'shuffling' | 'dealing' | 'playing' | 'color-picking' | 'game-over';

export type UnoDirection = 1 | -1; // 1 = clockwise, -1 = counter-clockwise

export interface UnoGameState {
  players: UnoPlayer[];
  currentTurnIndex: number;
  direction: UnoDirection;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  activeColor: UnoCardColor;
  status: UnoGameStatus;
  winner: UnoPlayer | null;
  pendingDrawCount: number; // For cumulative/penalty draw (+2, +4)
  lastActionMessage: string;
  unoPenaltyTargetId: string | null; // Player who forgot to call UNO
  hasDrawnThisTurn: boolean;
  roundNumber: number;
}

export interface UnoGameStats {
  wins: number;
  losses: number;
  totalGames: number;
  unoCalls: number;
  wildsPlayed: number;
  drawFoursPlayed: number;
}

// ── Online Multiplayer Room Types ──
export type UnoRoomStatus =
  | 'idle'
  | 'creating'
  | 'lobby'
  | 'connecting'
  | 'playing'
  | 'disconnected'
  | 'error';

export interface UnoSeatInfo {
  index: number;
  name: string;
  connected: boolean;
  isHost: boolean;
  avatarColor: string;
}

export interface UnoLobbyState {
  seats: UnoSeatInfo[];
  maxPlayers: number;
  locked: boolean;
  roomCode: string;
  cardEightWild: boolean;
  initialCardCount?: number;
}

export interface UnoOnlinePlayerSummary {
  id: string;
  name: string;
  cardCount: number;
  avatarColor: string;
  position: UnoTablePosition;
  hasCalledUno: boolean;
}

export interface UnoOnlineSnapshot {
  players: UnoOnlinePlayerSummary[];
  myHand: UnoCard[];
  currentTurnIndex: number;
  direction: UnoDirection;
  drawPileCount: number;
  topCard: UnoCard | null;
  activeColor: UnoCardColor;
  gameStatus: 'playing' | 'color-picking' | 'game-over';
  winnerName: string | null;
  lastActionMessage: string;
  pendingCardForColor?: UnoCard | null;
  isMyTurn: boolean;
  initialCardCount?: number;
  isDealing?: boolean;
}

export type UnoRoomMessage =
  | { type: 'HELLO'; name: string; rejoinToken?: string }
  | { type: 'LOBBY'; lobby: UnoLobbyState }
  | { type: 'ASSIGN'; seatIndex: number; rejoinToken: string }
  | { type: 'START'; initialCardCount?: number }
  | { type: 'STATE'; snapshot: UnoOnlineSnapshot }
  | {
      type: 'INTENT';
      seatIndex: number;
      action: 'play' | 'draw' | 'call_uno' | 'choose_color';
      cardId?: string;
      chosenColor?: UnoCardColor;
    }
  | { type: 'DEAL_ACK'; seatIndex: number }
  | { type: 'DEAL_GO' }
  | { type: 'HOST_LEFT' }
  | { type: 'PING'; t: number }
  | { type: 'PONG'; t: number };
