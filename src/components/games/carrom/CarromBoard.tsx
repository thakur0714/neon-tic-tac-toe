import React, { useRef, useEffect, useCallback } from 'react';
import { CarromPiece, ShotIntent, Vector2D } from '../../../types/carrom';
import {
  BOARD_SIZE,
  CUSHION_WIDTH,
  POCKETS,
  POCKET_RADIUS,
  COIN_RADIUS,
  STRIKER_RADIUS,
  BASELINE_Y_BOTTOM,
  BASELINE_Y_TOP,
  BASELINE_X_MIN,
  BASELINE_X_MAX,
  calculateTrajectory,
} from '../../../utils/carromPhysics';

interface CarromBoardProps {
  pieces: CarromPiece[];
  striker: CarromPiece;
  currentTurn: 'player1' | 'player2';
  isAiming: boolean;
  isMoving: boolean;
  aimAngle: number;
  aimPower: number;
  isMyTurn: boolean;
  onAimChange: (angle: number, power: number) => void;
  onFireShot: (intent: ShotIntent) => void;
  strikerSliderX: number;
  onSliderChange: (val: number) => void;
  soundEnabled: boolean;
}

export const CarromBoard: React.FC<CarromBoardProps> = ({
  pieces,
  striker,
  currentTurn,
  isAiming,
  isMoving,
  aimAngle,
  aimPower,
  isMyTurn,
  onAimChange,
  onFireShot,
  strikerSliderX,
  onSliderChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingStrikerRef = useRef(false);
  const isAimDraggingRef = useRef(false);
  const dragStartRef = useRef<Vector2D>({ x: 0, y: 0 });

  // Convert client touch/mouse coordinates to virtual 600x600 board space
  const getBoardCoords = useCallback((e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent): Vector2D => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
    const scale = BOARD_SIZE / rect.width;
    return {
      x: (clientX - rect.left) * scale,
      y: (clientY - rect.top) * scale,
    };
  }, []);

  // ── Render Board & Pieces ───────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // 1. Board Wooden Outer Frame
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

    // Frame bevel & wood grain effect
    const frameGradient = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
    frameGradient.addColorStop(0, '#3e2317');
    frameGradient.addColorStop(0.5, '#26140c');
    frameGradient.addColorStop(1, '#1b0d07');
    ctx.fillStyle = frameGradient;
    ctx.fillRect(4, 4, BOARD_SIZE - 8, BOARD_SIZE - 8);

    // Inner playing surface
    const surfaceGrad = ctx.createRadialGradient(
      BOARD_SIZE / 2,
      BOARD_SIZE / 2,
      40,
      BOARD_SIZE / 2,
      BOARD_SIZE / 2,
      320
    );
    surfaceGrad.addColorStop(0, '#fbf3d5');
    surfaceGrad.addColorStop(0.85, '#eed9a8');
    surfaceGrad.addColorStop(1, '#deb887');
    ctx.fillStyle = surfaceGrad;
    ctx.fillRect(
      CUSHION_WIDTH,
      CUSHION_WIDTH,
      BOARD_SIZE - CUSHION_WIDTH * 2,
      BOARD_SIZE - CUSHION_WIDTH * 2
    );

    // Subtle cushion shadow
    ctx.strokeStyle = '#8c5934';
    ctx.lineWidth = 3;
    ctx.strokeRect(
      CUSHION_WIDTH,
      CUSHION_WIDTH,
      BOARD_SIZE - CUSHION_WIDTH * 2,
      BOARD_SIZE - CUSHION_WIDTH * 2
    );

    // 2. Corner Pockets
    POCKETS.forEach((p) => {
      // Net pocket outer rim
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_RADIUS + 3, 0, Math.PI * 2);
      ctx.fillStyle = '#111827';
      ctx.fill();

      // Deep pocket interior
      const pocketGrad = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, POCKET_RADIUS);
      pocketGrad.addColorStop(0, '#020617');
      pocketGrad.addColorStop(0.75, '#0f172a');
      pocketGrad.addColorStop(1, '#334155');
      ctx.beginPath();
      ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = pocketGrad;
      ctx.fill();

      // Net ring accent
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // 3. Decorative Center Patterns
    const cx = BOARD_SIZE / 2;
    const cy = BOARD_SIZE / 2;

    // Center Large Circle
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.strokeStyle = '#854d0e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center Small Red Queen Ring
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#fee2e2';
    ctx.fill();
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center Red Dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    // Radiating 8-Petal Star Pattern
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * 22, cy + Math.sin(angle) * 22);
      ctx.lineTo(cx + Math.cos(angle) * 44, cy + Math.sin(angle) * 44);
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // 4. Baseline Markings (Top & Bottom)
    const drawBaseline = (y: number) => {
      // Dual track line
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(BASELINE_X_MIN, y - 10);
      ctx.lineTo(BASELINE_X_MAX, y - 10);
      ctx.moveTo(BASELINE_X_MIN, y + 10);
      ctx.lineTo(BASELINE_X_MAX, y + 10);
      ctx.stroke();

      // End circles with red spots
      [BASELINE_X_MIN, BASELINE_X_MAX].forEach((bx) => {
        ctx.beginPath();
        ctx.arc(bx, y, 14, 0, Math.PI * 2);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(bx, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#dc2626';
        ctx.fill();
      });
    };
    drawBaseline(BASELINE_Y_BOTTOM);
    drawBaseline(BASELINE_Y_TOP);

    // Diagonal Corner Arrows (Foul Lines)
    POCKETS.forEach((p) => {
      const dirX = (cx - p.x) / Math.hypot(cx - p.x, cy - p.y);
      const dirY = (cy - p.y) / Math.hypot(cx - p.x, cy - p.y);
      ctx.beginPath();
      ctx.moveTo(p.x + dirX * 42, p.y + dirY * 42);
      ctx.lineTo(p.x + dirX * 115, p.y + dirY * 115);
      ctx.strokeStyle = '#991b1b';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // 5. Aim Trajectory Guide (when aiming & not moving)
    if (isAiming && !isMoving && !striker.isPocketed) {
      const ray = calculateTrajectory(striker, aimAngle, aimPower, pieces);

      // Main aim trajectory line
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(ray.startX, ray.startY);
      ctx.lineTo(ray.endX, ray.endY);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#22d3ee';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // Ghost Striker ring at destination
      ctx.beginPath();
      ctx.arc(ray.endX, ray.endY, STRIKER_RADIUS, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.65)';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
      ctx.fill();
      ctx.stroke();

      // Target Piece Deflection Line
      if (ray.targetPiece && ray.deflectionX !== undefined && ray.deflectionY !== undefined) {
        ctx.beginPath();
        ctx.moveTo(ray.targetPiece.x, ray.targetPiece.y);
        ctx.lineTo(ray.deflectionX, ray.deflectionY);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Highlighting ring on target piece
        ctx.beginPath();
        ctx.arc(ray.targetPiece.x, ray.targetPiece.y, COIN_RADIUS + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Striker Deflection Line
      if (ray.strikerBounceX !== undefined && ray.strikerBounceY !== undefined) {
        ctx.beginPath();
        ctx.moveTo(ray.endX, ray.endY);
        ctx.lineTo(ray.strikerBounceX, ray.strikerBounceY);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    // 6. Draw Regular Pieces (Coins)
    pieces.forEach((p) => {
      if (p.isPocketed) return;

      ctx.save();
      // Drop shadow for 3D depth
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;

      // Base disc
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Border rim
      ctx.lineWidth = 2;
      ctx.strokeStyle = p.borderColor;
      ctx.stroke();

      // Inner engraved rings
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
      ctx.strokeStyle = p.type === 'white' ? '#e2e8f0' : p.type === 'queen' ? '#fca5a5' : '#334155';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Queen emblem
      if (p.type === 'queen') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffd700';
        ctx.fill();
      }

      // 3D Top Highlight
      const highlight = ctx.createRadialGradient(
        p.x - p.radius * 0.3,
        p.y - p.radius * 0.3,
        1,
        p.x,
        p.y,
        p.radius
      );
      highlight.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
      highlight.addColorStop(0.6, 'rgba(255, 255, 255, 0)');
      highlight.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = highlight;
      ctx.fill();

      ctx.restore();
    });

    // 7. Draw Striker Disc
    if (!striker.isPocketed) {
      ctx.save();
      ctx.shadowColor = currentTurn === 'player1' ? 'rgba(6, 182, 212, 0.5)' : 'rgba(239, 68, 68, 0.5)';
      ctx.shadowBlur = isMoving ? 12 : 8;
      ctx.shadowOffsetY = 4;

      // Outer striker disc body
      const strikerGrad = ctx.createRadialGradient(
        striker.x - 5,
        striker.y - 5,
        2,
        striker.x,
        striker.y,
        STRIKER_RADIUS
      );
      strikerGrad.addColorStop(0, '#e0f2fe');
      strikerGrad.addColorStop(0.4, '#38bdf8');
      strikerGrad.addColorStop(1, '#0284c7');

      ctx.beginPath();
      ctx.arc(striker.x, striker.y, STRIKER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = strikerGrad;
      ctx.fill();

      // Neon Rim
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#7dd3fc';
      ctx.stroke();

      // Engraved inner rings and grip ridges
      ctx.beginPath();
      ctx.arc(striker.x, striker.y, STRIKER_RADIUS * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Center Core
      ctx.beginPath();
      ctx.arc(striker.x, striker.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Direction indicator arrow on striker
      if (!isMoving) {
        ctx.beginPath();
        const arrowLen = 14;
        ctx.moveTo(
          striker.x + Math.cos(aimAngle) * arrowLen,
          striker.y + Math.sin(aimAngle) * arrowLen
        );
        ctx.lineTo(
          striker.x + Math.cos(aimAngle + 2.5) * 6,
          striker.y + Math.sin(aimAngle + 2.5) * 6
        );
        ctx.lineTo(
          striker.x + Math.cos(aimAngle - 2.5) * 6,
          striker.y + Math.sin(aimAngle - 2.5) * 6
        );
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.restore();
    }
  }, [pieces, striker, currentTurn, isAiming, isMoving, aimAngle, aimPower]);

  // ── Touch & Pointer Interaction ────────────────────────────────
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMoving || !isMyTurn) return;
    const pt = getBoardCoords(e);

    // 1. Check if tapped on Striker to pull/aim
    const dx = pt.x - striker.x;
    const dy = pt.y - striker.y;
    const distSq = dx * dx + dy * dy;

    if (distSq < (STRIKER_RADIUS + 22) * (STRIKER_RADIUS + 22)) {
      isDraggingStrikerRef.current = true;
      dragStartRef.current = pt;
      return;
    }

    // 2. Or tapped anywhere to set aim direction directly
    isAimDraggingRef.current = true;
    dragStartRef.current = pt;
    const angle = Math.atan2(pt.y - striker.y, pt.x - striker.x);
    onAimChange(angle, aimPower);
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isMoving || !isMyTurn) return;
    const pt = getBoardCoords(e);

    if (isDraggingStrikerRef.current) {
      // Pull-back slingshot mode: pulling back increases power and sets angle opposite
      const pullX = dragStartRef.current.x - pt.x;
      const pullY = dragStartRef.current.y - pt.y;
      const pullDist = Math.hypot(pullX, pullY);

      if (pullDist > 8) {
        // Aim direction is opposite to pull
        const angle = Math.atan2(-pullY, -pullX);
        const power = Math.min(1.0, Math.max(0.15, pullDist / 120));
        onAimChange(angle, power);
      }
    } else if (isAimDraggingRef.current) {
      const angle = Math.atan2(pt.y - striker.y, pt.x - striker.x);
      onAimChange(angle, aimPower);
    }
  };

  const handlePointerUp = () => {
    if (isDraggingStrikerRef.current) {
      isDraggingStrikerRef.current = false;
      // Slingshot release: trigger fire if pulled sufficiently
      if (aimPower >= 0.18) {
        onFireShot({
          strikerX: strikerSliderX,
          angle: aimAngle,
          power: aimPower,
        });
      }
    }
    isAimDraggingRef.current = false;
  };

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-[430px] mx-auto select-none touch-none">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-4 border-amber-950/80 shadow-[0_12px_40px_rgba(0,0,0,0.7)] bg-[#1e1008]">
        <canvas
          ref={canvasRef}
          width={BOARD_SIZE}
          height={BOARD_SIZE}
          className="w-full h-full cursor-crosshair active:cursor-grabbing"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {/* Turn watermark banner overlay */}
        {isMoving && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/75 border border-cyan-500/30 text-[11px] font-mono text-cyan-400 backdrop-blur-xs flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            SIMULATING STRIKE…
          </div>
        )}
      </div>
    </div>
  );
};
