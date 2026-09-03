export type CarromPieceType = 'white' | 'black' | 'queen' | 'striker';

export type CarromGameMode = 'disc-pool' | 'classic';
export type CarromPlayType = 'pass-and-play' | 'vs-ai' | 'online';
export type CarromAIDifficulty = 'easy' | 'medium' | 'hard';

export interface Vector2D {
  x: number;
  y: number;
}

export interface CarromPiece {
  id: string;
  type: CarromPieceType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  color: string;
  borderColor: string;
  isPocketed: boolean;
  pocketAnimation?: {
    progress: number; // 0 to 1
    pocketIndex: number;
  };
}

export interface CarromPlayer {
  id: string;
  name: string;
  assignedType: 'white' | 'black';
  score: number; // coins pocketed or points
  isHost: boolean;
  isAI?: boolean;
}

export interface ShotIntent {
  strikerX: number;
  angle: number; // radians
  power: number; // 0 to 1
}

export interface CarromGameState {
  pieces: CarromPiece[];
  striker: CarromPiece;
  currentTurn: 'player1' | 'player2';
  player1: CarromPlayer;
  player2: CarromPlayer;
  mode: CarromGameMode;
  playType: CarromPlayType;
  aiDifficulty: CarromAIDifficulty;
  isAiming: boolean;
  isMoving: boolean;
  aimAngle: number;
  aimPower: number;
  strikerPlaced: boolean;
  strikerSliderX: number; // 0 to 1 normalized on baseline
  winner: 'player1' | 'player2' | null;
  lastEventMessage: string;
  queenCoverNeeded: boolean;
  queenPocketedBy: 'player1' | 'player2' | null;
  turnCountdown: number;
}

/* Online multiplayer room types (Ludo King style) */
export type CarromRoomStatus =
  | 'idle'
  | 'creating'
  | 'lobby'
  | 'connecting'
  | 'playing'
  | 'disconnected'
  | 'error';

export interface CarromSeatInfo {
  seat: 'player1' | 'player2';
  name: string;
  connected: boolean;
  isHost: boolean;
  assignedType: 'white' | 'black';
}

export interface CarromLobbyState {
  roomCode: string;
  seats: CarromSeatInfo[];
  ready: boolean;
  gameMode: CarromGameMode;
}

export interface CarromSnapshot {
  pieces: { id: string; type: CarromPieceType; x: number; y: number; isPocketed: boolean }[];
  striker: { x: number; y: number; isPocketed: boolean };
  currentTurn: 'player1' | 'player2';
  player1Score: number;
  player2Score: number;
  winner: 'player1' | 'player2' | null;
  statusText: string;
}

export type CarromRoomMessage =
  | { type: 'HELLO'; name: string; rejoinToken?: string }
  | { type: 'LOBBY'; lobby: CarromLobbyState }
  | { type: 'ASSIGN'; seat: 'player1' | 'player2'; assignedType: 'white' | 'black'; rejoinToken: string }
  | { type: 'START' }
  | { type: 'STRIKE_ACTION'; intent: ShotIntent; seat: 'player1' | 'player2' }
  | { type: 'SYNC_STATE'; snapshot: CarromSnapshot }
  | { type: 'REMATCH_REQ' }
  | { type: 'REMATCH_ACCEPT' }
  | { type: 'HOST_LEFT' }
  | { type: 'PING'; t: number }
  | { type: 'PONG'; t: number };
