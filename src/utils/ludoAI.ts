import { LudoColor, LudoPlayer, LudoToken } from '../types/ludo';
import { COLOR_START_INDICES, SAFE_TRACK_INDICES } from './ludoConstants';
import { canTokenMove, checkTokenCapture, getTargetStep } from './ludoRules';
import { LudoDifficulty } from './ludoSetup';

/**
 * Lightweight heuristic AI for Ludo. Pure functions only — no allocations beyond
 * a small candidate list, safe to call on every CPU turn on low-end devices.
 *
 * The dice roll itself is not a decision in Ludo, so the AI only needs to answer:
 * "given this roll, which of my movable tokens should I move?".
 */

const MAIN_TRACK_LEN = 52;
const LAST_MAIN_STEP = 50; // steps 0..50 live on the shared loop; 51..55 = home lane

function trackIndex(color: LudoColor, step: number): number {
  return (COLOR_START_INDICES[color] + step) % MAIN_TRACK_LEN;
}

/** Can any opponent token land on `idx` with a roll of 1..6 next turn? */
function squareIsThreatened(idx: number, myColor: LudoColor, allPlayers: LudoPlayer[]): boolean {
  if (SAFE_TRACK_INDICES.has(idx)) return false;
  for (const p of allPlayers) {
    if (p.color === myColor || p.type === 'none') continue;
    for (const t of p.tokens) {
      if (t.step < 0 || t.step > LAST_MAIN_STEP) continue;
      const from = trackIndex(t.color, t.step);
      for (let d = 1; d <= 6; d++) {
        if (t.step + d > LAST_MAIN_STEP) break; // opponent would turn into its home lane
        if ((from + d) % MAIN_TRACK_LEN === idx) return true;
      }
    }
  }
  return false;
}

interface Candidate {
  tokenId: number;
  score: number;
}

function scoreMove(
  token: LudoToken,
  dice: number,
  player: LudoPlayer,
  allPlayers: LudoPlayer[],
  lookahead: boolean
): number {
  let score = 0;
  const target = getTargetStep(token, dice);

  // Unlock from the yard.
  if (token.step === -1) {
    const tokensOut = player.tokens.filter((t) => t.step >= 0 && t.step < 56).length;
    score += 55 - tokensOut * 8; // valuable, less so when the board is already busy
    const startIdx = COLOR_START_INDICES[player.color];
    if (checkTokenCapture(player.color, 0, allPlayers).length > 0) score += 60;
    if (SAFE_TRACK_INDICES.has(startIdx)) score += 6;
    return score;
  }

  // Finishing a token.
  if (target === 56) return 120;
  // Sliding into the safe home lane.
  if (target >= 51) score += 45 + (target - 51) * 4;

  // Captures.
  const victims = checkTokenCapture(player.color, target, allPlayers);
  for (const v of victims) {
    const vp = allPlayers.find((p) => p.color === v.color);
    const vt = vp?.tokens.find((t) => t.id === v.tokenId);
    score += 55 + (vt ? vt.step : 0); // sending a far-advanced token back hurts more
  }

  // Progress — nudge the token that is closest to home so leads get locked in.
  score += token.step * 0.4 + dice;

  if (target <= LAST_MAIN_STEP && SAFE_TRACK_INDICES.has(trackIndex(player.color, target))) {
    score += 12;
  }

  if (lookahead && token.step >= 0 && token.step <= LAST_MAIN_STEP) {
    const here = trackIndex(player.color, token.step);
    const wasThreatened = squareIsThreatened(here, player.color, allPlayers);
    const willBeThreatened =
      target <= LAST_MAIN_STEP && squareIsThreatened(trackIndex(player.color, target), player.color, allPlayers);
    if (wasThreatened && !willBeThreatened) score += 22; // escaping danger
    if (!wasThreatened && willBeThreatened) score -= 18; // walking into danger
  }

  return score;
}

/**
 * Choose which token the CPU should move. Assumes at least one legal move exists
 * for `dice` (caller already checked). Returns the token id.
 */
export function pickAIMove(
  player: LudoPlayer,
  dice: number,
  allPlayers: LudoPlayer[],
  difficulty: LudoDifficulty = 'medium'
): number {
  const movable = player.tokens.filter((t) => canTokenMove(t, dice));
  if (movable.length === 0) return -1;
  if (movable.length === 1) return movable[0].id;

  // Easy: mostly random, occasionally sensible.
  if (difficulty === 'easy' && Math.random() < 0.7) {
    return movable[Math.floor(Math.random() * movable.length)].id;
  }

  const lookahead = difficulty === 'hard';
  const candidates: Candidate[] = movable.map((t) => ({
    tokenId: t.id,
    score: scoreMove(t, dice, player, allPlayers, lookahead),
  }));

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].tokenId;
}
