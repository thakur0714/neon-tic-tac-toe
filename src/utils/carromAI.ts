import { CarromPiece, CarromPieceType, ShotIntent } from '../types/carrom';
import {
  BASELINE_X_MAX,
  BASELINE_X_MIN,
  BASELINE_Y_TOP,
  COIN_RADIUS,
  POCKETS,
  STRIKER_RADIUS,
  canPlaceStrikerAt,
} from './carromPhysics';

interface BestShotCandidate {
  sliderX: number;
  angle: number;
  power: number;
  score: number;
  targetId: string;
}

/**
 * Calculates optimal striker position and shot angle for AI opponent
 */
export function calculateCarromAIShot(
  pieces: CarromPiece[],
  aiType: CarromPieceType,
  difficulty: 'easy' | 'medium' | 'hard'
): ShotIntent {
  const activePieces = pieces.filter((p) => !p.isPocketed);

  // Targets: AI's assigned coins or Queen
  let candidates = activePieces.filter((p) => p.type === aiType || p.type === 'queen');
  if (candidates.length === 0) {
    candidates = activePieces.filter((p) => p.type !== 'striker');
  }

  let best: BestShotCandidate | null = null;

  // Sample discrete slider positions along AI baseline
  const sliderSteps = difficulty === 'hard' ? 12 : difficulty === 'medium' ? 8 : 5;

  for (let s = 0; s <= sliderSteps; s++) {
    const sliderX = s / sliderSteps;
    const strikerX = BASELINE_X_MIN + sliderX * (BASELINE_X_MAX - BASELINE_X_MIN);
    const strikerY = BASELINE_Y_TOP;

    if (!canPlaceStrikerAt(strikerX, strikerY, pieces)) {
      continue;
    }

    for (const coin of candidates) {
      for (let pIdx = 0; pIdx < POCKETS.length; pIdx++) {
        const pocket = POCKETS[pIdx];

        // 1. Vector from coin to pocket
        const c2pX = pocket.x - coin.x;
        const c2pY = pocket.y - coin.y;
        const c2pDist = Math.hypot(c2pX, c2pY);
        if (c2pDist < 10) continue;

        const normP2cX = c2pX / c2pDist;
        const normP2cY = c2pY / c2pDist;

        // 2. Ghost ball position for striker contact
        const contactDist = STRIKER_RADIUS + COIN_RADIUS;
        const ghostX = coin.x - normP2cX * contactDist;
        const ghostY = coin.y - normP2cY * contactDist;

        // 3. Vector from striker to ghost ball
        const s2gX = ghostX - strikerX;
        const s2gY = ghostY - strikerY;
        const s2gDist = Math.hypot(s2gX, s2gY);

        // Striker must shoot forward (downwards for AI at top baseline)
        if (s2gY <= 15) continue;

        const shotAngle = Math.atan2(s2gY, s2gX);

        // Alignment check (dot product between strike line and pocket line)
        const dot = (s2gX / s2gDist) * normP2cX + (s2gY / s2gDist) * normP2cY;
        if (dot < 0.2) continue; // Too sharp of a cut shot

        // Calculate score: higher for closer to pocket, better alignment, and queen
        let score = dot * 100 - c2pDist * 0.12 - s2gDist * 0.08;
        if (coin.type === 'queen') score += 40;

        // Calculate required power based on distance
        const totalDist = s2gDist + c2pDist;
        const basePower = Math.min(1.0, Math.max(0.38, totalDist / 650 + 0.18));

        if (!best || score > best.score) {
          best = {
            sliderX,
            angle: shotAngle,
            power: basePower,
            score,
            targetId: coin.id,
          };
        }
      }
    }
  }

  // Fallback if no clean shot found: direct hit to closest target coin
  if (!best) {
    const fallbackTarget = candidates[0] || pieces[0];
    const midSlider = 0.5;
    const sx = BASELINE_X_MIN + midSlider * (BASELINE_X_MAX - BASELINE_X_MIN);
    const sy = BASELINE_Y_TOP;
    const angle = Math.atan2(fallbackTarget.y - sy, fallbackTarget.x - sx);

    return {
      strikerX: midSlider,
      angle,
      power: 0.65,
    };
  }

  // Apply difficulty jitter (human error emulation)
  let finalAngle = best.angle;
  let finalPower = best.power;

  if (difficulty === 'easy') {
    const jitter = (Math.random() - 0.5) * 0.22;
    finalAngle += jitter;
    finalPower = Math.max(0.3, Math.min(1.0, finalPower + (Math.random() - 0.5) * 0.25));
  } else if (difficulty === 'medium') {
    const jitter = (Math.random() - 0.5) * 0.08;
    finalAngle += jitter;
    finalPower = Math.max(0.35, Math.min(1.0, finalPower + (Math.random() - 0.5) * 0.12));
  } else {
    // Hard has minor realistic variance
    const jitter = (Math.random() - 0.5) * 0.02;
    finalAngle += jitter;
  }

  return {
    strikerX: best.sliderX,
    angle: finalAngle,
    power: finalPower,
  };
}
