export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type Board = CellValue[];

export type GameMode = 'pvp' | 'ai-easy' | 'ai-medium' | 'ai-hard';
export type AILevel = 'easy' | 'medium' | 'hard';

export type GameState = 'splash' | 'menu' | 'playing' | 'gameover';

export interface WinResult {
  winner: Player | 'draw' | null;
  line: [number, number, number] | null;
  direction?: 'row-0' | 'row-1' | 'row-2' | 'col-0' | 'col-1' | 'col-2' | 'diag-main' | 'diag-anti';
}

export interface GameStats {
  winsX: number;
  winsO: number;
  draws: number;
  totalGames: number;
  currentStreak: number;
  bestStreak: number;
  lastWinner: Player | 'draw' | null;
}

export interface GameConfig {
  mode: GameMode;
  playerSymbol: Player;
  aiSymbol: Player;
  startingPlayer: Player;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

/* =========================================================================
   Arcade Hub & Additional Games Types
   ========================================================================= */

export type ArcadeGameId = 'hub' | 'tictactoe' | 'ludo' | 'carrom' | 'snake' | 'connect4' | '2048';

export interface ArcadeGameInfo {
  id: ArcadeGameId;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  themeColor: 'cyan' | 'pink' | 'emerald' | 'amber' | 'purple' | 'orange';
  description: string;
  modes: string[];
}

// Snake Types
export type SnakeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type SnakeDifficulty = 'easy' | 'medium' | 'hard';

export interface Point {
  x: number;
  y: number;
}

export interface SnakeFood extends Point {
  type: 'regular' | 'special' | 'speed';
  points: number;
}

export interface SnakeStats {
  highScore: number;
  totalGames: number;
  highestLength: number;
  totalApples: number;
}

// Connect 4 Types
export type Connect4Player = 'P1' | 'P2';
export type Connect4Cell = Connect4Player | null;
export type Connect4Board = Connect4Cell[][]; // 6 rows x 7 cols

export interface Connect4Stats {
  winsP1: number;
  winsP2: number;
  draws: number;
  totalGames: number;
}

// 2048 Types
export interface Game2048Tile {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerged?: boolean;
}

export interface Game2048Stats {
  highScore: number;
  bestTile: number;
  totalGames: number;
}

/* =========================================================================
   Online P2P Multiplayer Types
   ========================================================================= */

export type MultiplayerRole = 'host' | 'client' | null;

export type MultiplayerStatus =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

export type MultiplayerGameType = 'ludo' | 'tictactoe';

export interface MultiplayerMessage {
  type:
    | 'HANDSHAKE'
    | 'GAME_START'
    | 'MOVE_TICTACTOE'
    | 'MOVE_CONNECT4'
    | 'SNAKE_UPDATE'
    | 'SNAKE_GAMEOVER'
    | 'LUDO_ROLL'
    | 'LUDO_MOVE'
    | 'LUDO_SYNC'
    | 'LUDO_REMATCH'
    | 'REMATCH_REQ'
    | 'REMATCH_ACCEPT'
    | 'REMATCH_CANCEL'
    | 'REMATCH_START'
    | 'FLIP_COIN_REQ'
    | 'FLIP_COIN_CHOICE'
    | 'FLIP_COIN_RESULT'
    | 'OPPONENT_LEFT'
    | 'EMOTE'
    | 'PING'
    | 'PONG';
  gameType?: MultiplayerGameType;
  index?: number; // for TicTacToe cell or Connect4 column
  player?: Player | Connect4Player;
  board?: any;
  score?: number;
  length?: number;
  alive?: boolean;
  emote?: string;
  coinFlip?: 'head' | 'tail';
  playerChoice?: 'head' | 'tail';
  chosenByRole?: MultiplayerRole;
  coinWinner?: Player; // Winner of coin flip ('X' or 'O')
  startingPlayer?: Player; // Who will make the first move
  roundNumber?: number;
  senderName?: string;
  timestamp?: number;
  // Ludo payload
  color?: string;
  diceValue?: number;
  tokenId?: number;
  playersState?: any;
  turnColor?: string;
}

export interface MultiplayerSession {
  roomCode: string;
  role: MultiplayerRole;
  status: MultiplayerStatus;
  gameType: MultiplayerGameType;
  opponentName: string;
  latencyMs: number;
  isOpponentReady: boolean;
}
