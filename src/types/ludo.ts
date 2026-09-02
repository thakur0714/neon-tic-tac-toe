export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export type LudoPlayerType = 'human' | 'ai' | 'online' | 'none';

export interface LudoToken {
  id: number; // 0, 1, 2, 3
  color: LudoColor;
  step: number; // -1: in yard base, 0..50: on 52-tile track relative to player start, 51..55: in home stretch, 56: finished inside center home
  position: { r: number; c: number }; // Visual (row, col) grid coordinates
  isHome: boolean; // reached center triangle (step === 56)
  isInYard: boolean; // in player base (step === -1)
}

export interface LudoPlayer {
  color: LudoColor;
  name: string;
  type: LudoPlayerType;
  tokens: LudoToken[];
  tokensHome: number;
  rank: number | null; // 1 for 1st, 2 for 2nd, etc.
  hasRolledSix?: boolean;
  avatar: string;
}

export interface LudoBoardCell {
  r: number;
  c: number;
  type: 'yard' | 'track' | 'home-path' | 'center-home';
  color?: LudoColor;
  isSafe?: boolean;
  isStart?: boolean;
  starIcon?: boolean;
  trackIndex?: number; // 0 to 51
  arrowDirection?: 'up' | 'down' | 'left' | 'right';
}

export interface LudoStats {
  gamesPlayed: number;
  winsRed: number;
  winsGreen: number;
  winsYellow: number;
  winsBlue: number;
  tokensCaptured: number;
  bestWinStreak: number;
  currentWinStreak: number;
}

export type LudoThemeMode = 'cyber' | 'classic';

export type LudoTurnState = 'waiting_roll' | 'rolling' | 'select_token' | 'animating';
