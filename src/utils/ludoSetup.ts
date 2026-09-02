import { LudoColor, LudoPlayer, LudoPlayerType, LudoToken } from '../types/ludo';
import { YARD_SPAWN_COORDINATES } from './ludoConstants';

/**
 * Ludo game setup / seat configuration.
 *
 * A "seat" is one of the four board colors. Every board always renders all four
 * colors, but a seat can be occupied by a human, an AI, a remote player, or left
 * empty ('none'). Turn rotation skips 'none' seats.
 */

export type LudoGameMode = 'vs-computer' | 'pass-and-play' | 'online';
export type LudoDifficulty = 'easy' | 'medium' | 'hard';

// Clockwise seating order used across the game.
export const SEAT_ORDER: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

// Which colors are used for a given player count (opposite corners for 2P).
export const SEATS_FOR_COUNT: Record<2 | 3 | 4, LudoColor[]> = {
  2: ['red', 'yellow'],
  3: ['red', 'green', 'yellow'],
  4: ['red', 'green', 'yellow', 'blue'],
};

const COLOR_META: Record<LudoColor, { label: string; avatar: string }> = {
  red: { label: 'Red', avatar: '🔴' },
  green: { label: 'Green', avatar: '🟢' },
  yellow: { label: 'Yellow', avatar: '🟡' },
  blue: { label: 'Blue', avatar: '🔵' },
};

export interface LudoSetupConfig {
  mode: LudoGameMode;
  playerCount: 2 | 3 | 4;
  difficulty: LudoDifficulty;
  /** Per-seat occupancy. Colors not in the active set are 'none'. */
  seats: Record<LudoColor, LudoPlayerType>;
}

/**
 * Build the default seat map for a mode + player count.
 * - pass-and-play: every active seat is a local human.
 * - vs-computer: the first active seat (red) is human, the rest are AI.
 * - online: red is the local human, green is the remote player, extra active
 *   seats fall back to AI (used once online setup-sync lands).
 */
export function defaultSeats(
  mode: LudoGameMode,
  playerCount: 2 | 3 | 4
): Record<LudoColor, LudoPlayerType> {
  const active = SEATS_FOR_COUNT[playerCount];
  const seats: Record<LudoColor, LudoPlayerType> = {
    red: 'none',
    green: 'none',
    yellow: 'none',
    blue: 'none',
  };

  active.forEach((color, index) => {
    if (mode === 'pass-and-play') {
      seats[color] = 'human';
    } else if (mode === 'vs-computer') {
      seats[color] = index === 0 ? 'human' : 'ai';
    } else {
      // online: local player is the host seat, every other active seat is remote
      seats[color] = index === 0 ? 'human' : 'online';
    }
  });

  return seats;
}

export function createSetupConfig(
  mode: LudoGameMode,
  playerCount: 2 | 3 | 4,
  difficulty: LudoDifficulty = 'medium'
): LudoSetupConfig {
  return { mode, playerCount, difficulty, seats: defaultSeats(mode, playerCount) };
}

/** Current shipping behaviour: 4 local humans. */
export const DEFAULT_SETUP: LudoSetupConfig = createSetupConfig('pass-and-play', 4);

function createTokens(color: LudoColor): LudoToken[] {
  return YARD_SPAWN_COORDINATES[color].map((coord, id) => ({
    id,
    color,
    step: -1,
    position: { r: coord.r, c: coord.c },
    isHome: false,
    isInYard: true,
  }));
}

function seatName(color: LudoColor, type: LudoPlayerType, humanIndex: number): string {
  const { label } = COLOR_META[color];
  if (type === 'ai') return `${label} CPU`;
  if (type === 'online') return `${label} (Online)`;
  if (type === 'human') return `${label} (P${humanIndex})`;
  return label;
}

/**
 * Build the 4-color players array from a seat map. Always returns all four
 * colors so board rendering stays stable; inactive seats get type 'none'.
 */
export function buildPlayers(seats: Record<LudoColor, LudoPlayerType>): LudoPlayer[] {
  let humanCount = 0;
  return SEAT_ORDER.map((color) => {
    const type = seats[color] ?? 'none';
    if (type === 'human') humanCount += 1;
    return {
      color,
      name: seatName(color, type, humanCount),
      type,
      avatar: COLOR_META[color].avatar,
      tokensHome: 0,
      rank: null,
      tokens: createTokens(color),
    };
  });
}
