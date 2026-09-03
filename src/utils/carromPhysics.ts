import { CarromPiece, CarromPieceType, Vector2D } from '../types/carrom';

// Virtual coordinate space (standard 600 x 600 board)
export const BOARD_SIZE = 600;
export const CUSHION_WIDTH = 38;
export const PLAY_MIN = CUSHION_WIDTH;
export const PLAY_MAX = BOARD_SIZE - CUSHION_WIDTH;

export const POCKET_RADIUS = 28;
export const POCKET_INFLUENCE_RADIUS = 36;

export const POCKETS: Vector2D[] = [
  { x: 44, y: 44 }, // Top-Left
  { x: 556, y: 44 }, // Top-Right
  { x: 44, y: 556 }, // Bottom-Left
  { x: 556, y: 556 }, // Bottom-Right
];

export const COIN_RADIUS = 13.5;
export const STRIKER_RADIUS = 18.5;

export const COIN_MASS = 1.0;
export const STRIKER_MASS = 2.8;

export const BASELINE_Y_BOTTOM = 476;
export const BASELINE_Y_TOP = 124;
export const BASELINE_X_MIN = 150;
export const BASELINE_X_MAX = 450;

export const FRICTION = 0.984; // Smooth carrom powder glide
export const MIN_VELOCITY = 0.08;
export const RESTITUTION_COIN = 0.92;
export const RESTITUTION_CUSHION = 0.86;

/**
 * Generates initial star arrangement for standard 19 carrom coins
 */
export function createInitialPieces(): CarromPiece[] {
  const pieces: CarromPiece[] = [];
  const cx = BOARD_SIZE / 2;
  const cy = BOARD_SIZE / 2;
  const r = COIN_RADIUS;

  // 1. Center Queen (Red)
  pieces.push({
    id: 'queen',
    type: 'queen',
    x: cx,
    y: cy,
    vx: 0,
    vy: 0,
    radius: r,
    mass: COIN_MASS,
    color: '#ef4444',
    borderColor: '#ffd700',
    isPocketed: false,
  });

  // 2. Inner Ring (6 coins: 3 White, 3 Black alternating)
  const innerDist = r * 2.05;
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    const isWhite = i % 2 === 0;
    pieces.push({
      id: `inner-${i}`,
      type: isWhite ? 'white' : 'black',
      x: cx + Math.cos(angle) * innerDist,
      y: cy + Math.sin(angle) * innerDist,
      vx: 0,
      vy: 0,
      radius: r,
      mass: COIN_MASS,
      color: isWhite ? '#f8fafc' : '#1e293b',
      borderColor: isWhite ? '#cbd5e1' : '#475569',
      isPocketed: false,
    });
  }

  // 3. Outer Ring (12 coins: 6 White, 6 Black alternating)
  const outerDist = innerDist * 1.88;
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6 + Math.PI / 12;
    const isWhite = i % 2 === 1;
    pieces.push({
      id: `outer-${i}`,
      type: isWhite ? 'white' : 'black',
      x: cx + Math.cos(angle) * outerDist,
      y: cy + Math.sin(angle) * outerDist,
      vx: 0,
      vy: 0,
      radius: r,
      mass: COIN_MASS,
      color: isWhite ? '#f8fafc' : '#1e293b',
      borderColor: isWhite ? '#cbd5e1' : '#475569',
      isPocketed: false,
    });
  }

  return pieces;
}

/**
 * Creates striker disc at specified baseline position
 */
export function createStriker(turn: 'player1' | 'player2', sliderX = 0.5): CarromPiece {
  const y = turn === 'player1' ? BASELINE_Y_BOTTOM : BASELINE_Y_TOP;
  const x = BASELINE_X_MIN + sliderX * (BASELINE_X_MAX - BASELINE_X_MIN);

  return {
    id: 'striker',
    type: 'striker',
    x,
    y,
    vx: 0,
    vy: 0,
    radius: STRIKER_RADIUS,
    mass: STRIKER_MASS,
    color: '#06b6d4',
    borderColor: '#38bdf8',
    isPocketed: false,
  };
}

/**
 * Checks if striker placed at (x, y) collides with any existing board pieces.
 */
export function canPlaceStrikerAt(x: number, y: number, pieces: CarromPiece[]): boolean {
  for (const piece of pieces) {
    if (piece.isPocketed) continue;
    const dx = piece.x - x;
    const dy = piece.y - y;
    const distSq = dx * dx + dy * dy;
    const minSafeDist = STRIKER_RADIUS + piece.radius + 1.5;
    if (distSq < minSafeDist * minSafeDist) {
      return false;
    }
  }
  return true;
}

/**
 * Check if point is inside or near any corner pocket
 */
export function getNearPocketIndex(x: number, y: number, radius = POCKET_RADIUS): number {
  for (let i = 0; i < POCKETS.length; i++) {
    const p = POCKETS[i];
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < radius * radius) {
      return i;
    }
  }
  return -1;
}

/**
 * One physics simulation step (sub-stepped for high precision collision detection)
 */
export function stepPhysics(
  pieces: CarromPiece[],
  striker: CarromPiece | null,
  onPocketDrop?: (piece: CarromPiece, pocketIdx: number) => void
): { hasMovement: boolean; pocketedThisStep: CarromPiece[] } {
  const all: CarromPiece[] = [];
  if (striker && !striker.isPocketed) {
    all.push(striker);
  }
  for (const p of pieces) {
    if (!p.isPocketed) all.push(p);
  }

  const SUB_STEPS = 4;
  const pocketedThisStep: CarromPiece[] = [];

  for (let step = 0; step < SUB_STEPS; step++) {
    // 1. Move & Apply Friction
    for (const p of all) {
      if (p.isPocketed) continue;

      p.x += p.vx / SUB_STEPS;
      p.y += p.vy / SUB_STEPS;

      // Friction
      p.vx *= Math.pow(FRICTION, 1 / SUB_STEPS);
      p.vy *= Math.pow(FRICTION, 1 / SUB_STEPS);

      if (Math.abs(p.vx) < MIN_VELOCITY) p.vx = 0;
      if (Math.abs(p.vy) < MIN_VELOCITY) p.vy = 0;

      // 2. Check Pocket Ingestion & Gravitational Pull
      const pocketIdx = getNearPocketIndex(p.x, p.y, POCKET_INFLUENCE_RADIUS);
      if (pocketIdx !== -1) {
        const pocket = POCKETS[pocketIdx];
        const dx = pocket.x - p.x;
        const dy = pocket.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Gravitational suction toward pocket center
        if (dist > 0.01) {
          const suction = 0.25 / SUB_STEPS;
          p.vx += (dx / dist) * suction;
          p.vy += (dy / dist) * suction;
        }

        // Pocketed condition
        if (dist < POCKET_RADIUS * 0.78) {
          p.isPocketed = true;
          p.vx = 0;
          p.vy = 0;
          p.x = pocket.x;
          p.y = pocket.y;
          pocketedThisStep.push(p);
          if (onPocketDrop) onPocketDrop(p, pocketIdx);
          continue;
        }
      }

      // 3. Cushion (Wall) Collisions (with corner pocket cutouts)
      const minX = PLAY_MIN + p.radius;
      const maxX = PLAY_MAX - p.radius;
      const minY = PLAY_MIN + p.radius;
      const maxY = PLAY_MAX - p.radius;

      // Left Wall
      if (p.x < minX) {
        // Only bounce if not in pocket region
        if (p.y > PLAY_MIN + 30 && p.y < PLAY_MAX - 30) {
          p.x = minX;
          p.vx = -p.vx * RESTITUTION_CUSHION;
        }
      }
      // Right Wall
      if (p.x > maxX) {
        if (p.y > PLAY_MIN + 30 && p.y < PLAY_MAX - 30) {
          p.x = maxX;
          p.vx = -p.vx * RESTITUTION_CUSHION;
        }
      }
      // Top Wall
      if (p.y < minY) {
        if (p.x > PLAY_MIN + 30 && p.x < PLAY_MAX - 30) {
          p.y = minY;
          p.vy = -p.vy * RESTITUTION_CUSHION;
        }
      }
      // Bottom Wall
      if (p.y > maxY) {
        if (p.x > PLAY_MIN + 30 && p.x < PLAY_MAX - 30) {
          p.y = maxY;
          p.vy = -p.vy * RESTITUTION_CUSHION;
        }
      }
    }

    // 4. Circle-to-Circle Elastic Collisions
    for (let i = 0; i < all.length; i++) {
      const p1 = all[i];
      if (p1.isPocketed) continue;

      for (let j = i + 1; j < all.length; j++) {
        const p2 = all[j];
        if (p2.isPocketed) continue;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        const minDist = p1.radius + p2.radius;

        if (distSq < minDist * minDist && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Separate overlapping spheres
          const overlap = minDist - dist;
          const totalMass = p1.mass + p2.mass;
          p1.x -= nx * overlap * (p2.mass / totalMass);
          p1.y -= ny * overlap * (p2.mass / totalMass);
          p2.x += nx * overlap * (p1.mass / totalMass);
          p2.y += ny * overlap * (p1.mass / totalMass);

          // Relative velocity along normal
          const kx = p1.vx - p2.vx;
          const ky = p1.vy - p2.vy;
          const p = 2 * (nx * kx + ny * ky) / totalMass;

          if (nx * kx + ny * ky > 0) {
            // Impulse transfer with elasticity
            const impulse = p * RESTITUTION_COIN;
            p1.vx -= impulse * p2.mass * nx;
            p1.vy -= impulse * p2.mass * ny;
            p2.vx += impulse * p1.mass * nx;
            p2.vy += impulse * p1.mass * ny;
          }
        }
      }
    }
  }

  // Check if any moving
  let hasMovement = false;
  for (const p of all) {
    if (!p.isPocketed && (Math.abs(p.vx) > 0.01 || Math.abs(p.vy) > 0.01)) {
      hasMovement = true;
      break;
    }
  }

  return { hasMovement, pocketedThisStep };
}

/**
 * Trajectory Raycast Predictor for Aim Assist
 */
export interface TrajectoryRay {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  targetPiece: CarromPiece | null;
  deflectionX?: number;
  deflectionY?: number;
  strikerBounceX?: number;
  strikerBounceY?: number;
}

export function calculateTrajectory(
  striker: CarromPiece,
  angle: number,
  power: number,
  pieces: CarromPiece[]
): TrajectoryRay {
  const maxDistance = 220 + power * 320;
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);

  let closestDist = maxDistance;
  let hitPiece: CarromPiece | null = null;

  // 1. Raycast against all active pieces
  for (const piece of pieces) {
    if (piece.isPocketed) continue;

    // Vector from striker to piece
    const cx = piece.x - striker.x;
    const cy = piece.y - striker.y;

    // Project onto ray
    const proj = cx * dirX + cy * dirY;
    if (proj <= 0) continue; // Behind striker

    // Perpendicular distance to ray
    const perpSq = cx * cx + cy * cy - proj * proj;
    const colRadius = striker.radius + piece.radius;

    if (perpSq < colRadius * colRadius) {
      // Distance to collision point
      const d = proj - Math.sqrt(Math.max(0, colRadius * colRadius - perpSq));
      if (d > 0 && d < closestDist) {
        closestDist = d;
        hitPiece = piece;
      }
    }
  }

  const endX = striker.x + dirX * closestDist;
  const endY = striker.y + dirY * closestDist;

  const result: TrajectoryRay = {
    startX: striker.x,
    startY: striker.y,
    endX,
    endY,
    targetPiece: hitPiece,
  };

  // If we hit a piece, calculate expected deflection direction for visual guide
  if (hitPiece) {
    const normalX = hitPiece.x - endX;
    const normalY = hitPiece.y - endY;
    const normalLen = Math.sqrt(normalX * normalX + normalY * normalY);
    if (normalLen > 0.01) {
      const nx = normalX / normalLen;
      const ny = normalY / normalLen;

      // Target coin moves along normal
      result.deflectionX = hitPiece.x + nx * 55;
      result.deflectionY = hitPiece.y + ny * 55;

      // Striker deflects tangentially
      const dot = dirX * nx + dirY * ny;
      const tangentX = dirX - dot * nx;
      const tangentY = dirY - dot * ny;
      result.strikerBounceX = endX + tangentX * 35;
      result.strikerBounceY = endY + tangentY * 35;
    }
  }

  return result;
}
