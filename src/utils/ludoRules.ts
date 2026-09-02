import { LudoColor, LudoPlayer, LudoToken } from '../types/ludo';
import {
  COLOR_START_INDICES,
  SAFE_TRACK_INDICES,
} from './ludoConstants';

/**
 * Checks if a specific token can legally move given the dice roll value.
 */
export function canTokenMove(token: LudoToken, diceValue: number): boolean {
  // 1. Already finished in center home
  if (token.step === 56 || token.isHome) {
    return false;
  }

  // 2. In Yard Base: Can only unlock on rolling 6
  if (token.step === -1 || token.isInYard) {
    return diceValue === 6;
  }

  // 3. On Track or Home Path: Step + diceValue must not exceed 56
  return token.step + diceValue <= 56;
}

/**
 * Returns array of token IDs (0..3) that can legally move.
 */
export function getSelectableTokenIds(player: LudoPlayer, diceValue: number): number[] {
  return player.tokens
    .filter((token) => canTokenMove(token, diceValue))
    .map((token) => token.id);
}

/**
 * Returns array of LudoToken objects that can legally move.
 */
export function getSelectableTokens(player: LudoPlayer, diceValue: number): LudoToken[] {
  return player.tokens.filter((token) => canTokenMove(token, diceValue));
}

/**
 * Calculate the target step for a token.
 */
export function getTargetStep(token: LudoToken, diceValue: number): number {
  if (token.step === -1 || token.isInYard) {
    return 0; // Unlocks directly to starting tile
  }
  return token.step + diceValue;
}

/**
 * Check if the token will reach home (step 56) with this roll.
 */
export function willTokenReachHome(initialStep: number, diceValue: number): boolean {
  if (initialStep === -1) return false;
  return initialStep + diceValue === 56;
}

/**
 * Calculate the sequence of intermediate steps for hop-by-hop animation.
 */
export function getAnimationSteps(initialStep: number, diceValue: number): number[] {
  if (initialStep === -1) {
    return [0]; // Unlock is 1 direct jump to 0
  }

  const steps: number[] = [];
  const target = initialStep + diceValue;
  for (let s = initialStep + 1; s <= target; s++) {
    steps.push(s);
  }
  return steps;
}

/**
 * Checks if landing on a tile captures any opponent tokens.
 * Safe spots (8 stars) cannot be captured.
 */
export function checkTokenCapture(
  movingColor: LudoColor,
  landingStep: number,
  allPlayers: LudoPlayer[]
): Array<{ color: LudoColor; tokenId: number }> {
  // Only tokens on main track (0..50) can capture or be captured
  if (landingStep < 0 || landingStep > 50) {
    return [];
  }

  const myStartIdx = COLOR_START_INDICES[movingColor];
  const landingTrackIdx = (myStartIdx + landingStep) % 52;

  // Safe Star Spot? Safe from captures!
  if (SAFE_TRACK_INDICES.has(landingTrackIdx)) {
    return [];
  }

  const capturedList: Array<{ color: LudoColor; tokenId: number }> = [];

  allPlayers.forEach((player) => {
    // Only opponent tokens
    if (player.color === movingColor) return;

    player.tokens.forEach((oppToken) => {
      if (oppToken.step >= 0 && oppToken.step <= 50) {
        const oppStartIdx = COLOR_START_INDICES[oppToken.color];
        const oppTrackIdx = (oppStartIdx + oppToken.step) % 52;

        if (oppTrackIdx === landingTrackIdx) {
          capturedList.push({ color: oppToken.color, tokenId: oppToken.id });
        }
      }
    });
  });

  return capturedList;
}

// Alias for convenience
export const checkCapture = (
  landingStepOrTrackIdx: number,
  movingColor: LudoColor,
  allPlayers: LudoPlayer[]
) => {
  return checkTokenCapture(movingColor, landingStepOrTrackIdx, allPlayers);
};

/**
 * Returns the next player color in clockwise order (red -> green -> yellow -> blue)
 */
export const TURN_ORDER: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

export function getNextTurnColor(
  currentColor: LudoColor,
  players: LudoPlayer[]
): LudoColor {
  const currentIdx = TURN_ORDER.indexOf(currentColor);
  for (let i = 1; i <= 4; i++) {
    const nextColor = TURN_ORDER[(currentIdx + i) % 4];
    const player = players.find((p) => p.color === nextColor);
    // Only pass to active player who hasn't already finished all 4 tokens
    if (player && player.type !== 'none' && player.tokensHome < 4) {
      return nextColor;
    }
  }
  return currentColor;
}
