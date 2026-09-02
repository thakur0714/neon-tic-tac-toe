import { LudoColor } from '../types/ludo';

/**
 * Standard 15x15 Ludo Board Coordinate System
 * Rows (r): 0 to 14 (top to bottom)
 * Cols (c): 0 to 14 (left to right)
 */

export const GRID_SIZE = 15;

// The 52 track coordinates ordered sequentially in clockwise direction
export const MAIN_TRACK_COORDINATES: Array<{ r: number; c: number }> = [
  // 0..4: Red entry arm (going right)
  { r: 6, c: 1 }, // 0: Red Start (Safe Star)
  { r: 6, c: 2 }, // 1
  { r: 6, c: 3 }, // 2
  { r: 6, c: 4 }, // 3
  { r: 6, c: 5 }, // 4
  // 5..10: Going up to top arm
  { r: 5, c: 6 }, // 5
  { r: 4, c: 6 }, // 6
  { r: 3, c: 6 }, // 7
  { r: 2, c: 6 }, // 8: Safe Star
  { r: 1, c: 6 }, // 9
  { r: 0, c: 6 }, // 10
  // 11..12: Turning around top center
  { r: 0, c: 7 }, // 11
  { r: 0, c: 8 }, // 12
  // 13..17: Green entry arm (going down)
  { r: 1, c: 8 }, // 13: Green Start (Safe Star)
  { r: 2, c: 8 }, // 14
  { r: 3, c: 8 }, // 15
  { r: 4, c: 8 }, // 16
  { r: 5, c: 8 }, // 17
  // 18..23: Going right on top-right arm
  { r: 6, c: 9 },  // 18
  { r: 6, c: 10 }, // 19
  { r: 6, c: 11 }, // 20
  { r: 6, c: 12 }, // 21: Safe Star
  { r: 6, c: 13 }, // 22
  { r: 6, c: 14 }, // 23
  // 24..25: Turning around right center
  { r: 7, c: 14 }, // 24
  { r: 8, c: 14 }, // 25
  // 26..30: Yellow entry arm (going left)
  { r: 8, c: 13 }, // 26: Yellow Start (Safe Star)
  { r: 8, c: 12 }, // 27
  { r: 8, c: 11 }, // 28
  { r: 8, c: 10 }, // 29
  { r: 8, c: 9 },  // 30
  // 31..36: Going down on bottom-right arm
  { r: 9, c: 8 },  // 31
  { r: 10, c: 8 }, // 32
  { r: 11, c: 8 }, // 33
  { r: 12, c: 8 }, // 34: Safe Star
  { r: 13, c: 8 }, // 35
  { r: 14, c: 8 }, // 36
  // 37..38: Turning around bottom center
  { r: 14, c: 7 }, // 37
  { r: 14, c: 6 }, // 38
  // 39..43: Blue entry arm (going up)
  { r: 13, c: 6 }, // 39: Blue Start (Safe Star)
  { r: 12, c: 6 }, // 40
  { r: 11, c: 6 }, // 41
  { r: 10, c: 6 }, // 42
  { r: 9, c: 6 },  // 43
  // 44..49: Going left on bottom-left arm
  { r: 8, c: 5 },  // 44
  { r: 8, c: 4 },  // 45
  { r: 8, c: 3 },  // 46
  { r: 8, c: 2 },  // 47: Safe Star
  { r: 8, c: 1 },  // 48
  { r: 8, c: 0 },  // 49
  // 50..51: Turning around left center
  { r: 7, c: 0 },  // 50
  { r: 6, c: 0 },  // 51 (wraps to 0 next)
];

// Color start indices on the 52-tile track
export const COLOR_START_INDICES: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// 8 Safe Spot Indices on Main Track
export const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 5 Home path steps per color (steps 51 to 55 relative to player)
export const HOME_PATH_COORDINATES: Record<LudoColor, Array<{ r: number; c: number }>> = {
  red: [
    { r: 7, c: 1 },
    { r: 7, c: 2 },
    { r: 7, c: 3 },
    { r: 7, c: 4 },
    { r: 7, c: 5 },
  ],
  green: [
    { r: 1, c: 7 },
    { r: 2, c: 7 },
    { r: 3, c: 7 },
    { r: 4, c: 7 },
    { r: 5, c: 7 },
  ],
  yellow: [
    { r: 7, c: 13 },
    { r: 7, c: 12 },
    { r: 7, c: 11 },
    { r: 7, c: 10 },
    { r: 7, c: 9 },
  ],
  blue: [
    { r: 13, c: 7 },
    { r: 12, c: 7 },
    { r: 11, c: 7 },
    { r: 10, c: 7 },
    { r: 9, c: 7 },
  ],
};

// Center Final Victory Coordinates (step 56)
export const CENTER_HOME_COORDINATES: Record<LudoColor, { r: number; c: number }> = {
  red: { r: 7, c: 6.3 },
  green: { r: 6.3, c: 7 },
  yellow: { r: 7, c: 7.7 },
  blue: { r: 7.7, c: 7 },
};

// 4 Yard Spawn Coordinates per color (r, c) matching base nest cells (1, 4, 10, 13)
export const YARD_SPAWN_COORDINATES: Record<LudoColor, Array<{ r: number; c: number }>> = {
  red: [
    { r: 1, c: 1 },
    { r: 1, c: 4 },
    { r: 4, c: 1 },
    { r: 4, c: 4 },
  ],
  green: [
    { r: 1, c: 10 },
    { r: 1, c: 13 },
    { r: 4, c: 10 },
    { r: 4, c: 13 },
  ],
  yellow: [
    { r: 10, c: 10 },
    { r: 10, c: 13 },
    { r: 13, c: 10 },
    { r: 13, c: 13 },
  ],
  blue: [
    { r: 10, c: 1 },
    { r: 10, c: 4 },
    { r: 13, c: 1 },
    { r: 13, c: 4 },
  ],
};

// Color Scheme Details for Cyber Neon & Classic Regal
export const LUDO_COLOR_THEMES: Record<
  LudoColor,
  {
    name: string;
    neonColor: string;
    neonGlow: string;
    neonDarkBg: string;
    neonBorder: string;
    classicColor: string;
    classicDark: string;
    classicBorder: string;
    text: string;
    badgeBg: string;
    arrowColor: string;
    starColor: string;
  }
> = {
  red: {
    name: 'Crimson Cyber',
    neonColor: '#EF4444',
    neonGlow: '0 0 15px rgba(239, 68, 68, 0.75)',
    neonDarkBg: 'rgba(239, 68, 68, 0.15)',
    neonBorder: '#F87171',
    classicColor: '#DC2626',
    classicDark: '#991B1B',
    classicBorder: '#B91C1C',
    text: 'text-red-400',
    badgeBg: 'bg-red-500/20 text-red-300 border-red-500/40',
    arrowColor: '#F87171',
    starColor: '#FCA5A5',
  },
  green: {
    name: 'Emerald Matrix',
    neonColor: '#10B981',
    neonGlow: '0 0 15px rgba(16, 185, 129, 0.75)',
    neonDarkBg: 'rgba(16, 185, 129, 0.15)',
    neonBorder: '#34D399',
    classicColor: '#059669',
    classicDark: '#065F46',
    classicBorder: '#047857',
    text: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    arrowColor: '#34D399',
    starColor: '#6EE7B7',
  },
  yellow: {
    name: 'Solar Amber',
    neonColor: '#F59E0B',
    neonGlow: '0 0 15px rgba(245, 158, 11, 0.75)',
    neonDarkBg: 'rgba(245, 158, 11, 0.15)',
    neonBorder: '#FBBF24',
    classicColor: '#D97706',
    classicDark: '#92400E',
    classicBorder: '#B45309',
    text: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    arrowColor: '#FBBF24',
    starColor: '#FDE68A',
  },
  blue: {
    name: 'Neon Cobalt',
    neonColor: '#06B6D4',
    neonGlow: '0 0 15px rgba(6, 182, 212, 0.75)',
    neonDarkBg: 'rgba(6, 182, 212, 0.15)',
    neonBorder: '#22D3EE',
    classicColor: '#2563EB',
    classicDark: '#1E40AF',
    classicBorder: '#1D4ED8',
    text: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    arrowColor: '#22D3EE',
    starColor: '#A5F3FC',
  },
};

/**
 * Calculates current visual (row, col) grid coordinates for a token given its step.
 */
export function getTokenCoordinates(color: LudoColor, tokenId: number, step: number): { r: number; c: number } {
  // 1. In Yard Base
  if (step === -1) {
    return YARD_SPAWN_COORDINATES[color][tokenId] || { r: 0, c: 0 };
  }

  // 2. On 52 Main Track (step: 0 to 50)
  if (step >= 0 && step <= 50) {
    const startIndex = COLOR_START_INDICES[color];
    const trackIndex = (startIndex + step) % 52;
    return MAIN_TRACK_COORDINATES[trackIndex];
  }

  // 3. In Home Path (step: 51 to 55)
  if (step >= 51 && step <= 55) {
    const homeIndex = step - 51;
    return HOME_PATH_COORDINATES[color][homeIndex];
  }

  // 4. Finished Center Home (step: 56)
  return CENTER_HOME_COORDINATES[color];
}
