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
