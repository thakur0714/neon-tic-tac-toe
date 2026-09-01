import React, { useState, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { playDPadSound, triggerHaptic } from '../utils/audio';

export type DPadDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

interface CyberDPadProps {
  onDirection: (direction: DPadDirection) => void;
  activeDirection?: DPadDirection | null;
  soundEnabled?: boolean;
  theme?: 'emerald' | 'cyan' | 'amber' | 'pink';
  size?: 'sm' | 'md' | 'lg';
}

export const CyberDPad: React.FC<CyberDPadProps> = ({
  onDirection,
  activeDirection = null,
  soundEnabled = true,
  theme = 'emerald',
  size = 'md',
}) => {
  const [pressedDirection, setPressedDirection] = useState<DPadDirection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastTriggeredDirRef = useRef<DPadDirection | null>(null);

  // Theme color styles
  const themeStyles = {
    emerald: {
      activeBg: 'bg-emerald-500 text-slate-950 shadow-[0_0_18px_#10B981] border-emerald-300',
      idleBg: 'bg-slate-900/90 text-emerald-400 border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-300',
      centerRing: 'border-emerald-500/40 bg-emerald-950/60',
      centerDot: 'bg-emerald-400 shadow-[0_0_8px_#10B981]',
      borderActive: 'border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    },
    cyan: {
      activeBg: 'bg-cyan-400 text-slate-950 shadow-[0_0_18px_#00F0FF] border-cyan-200',
      idleBg: 'bg-slate-900/90 text-cyan-400 border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-300',
      centerRing: 'border-cyan-500/40 bg-cyan-950/60',
      centerDot: 'bg-cyan-400 shadow-[0_0_8px_#00F0FF]',
      borderActive: 'border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.5)]',
    },
    amber: {
      activeBg: 'bg-amber-400 text-slate-950 shadow-[0_0_18px_#F59E0B] border-amber-200',
      idleBg: 'bg-slate-900/90 text-amber-400 border-amber-500/30 hover:border-amber-400 hover:text-amber-300',
      centerRing: 'border-amber-500/40 bg-amber-950/60',
      centerDot: 'bg-amber-400 shadow-[0_0_8px_#F59E0B]',
      borderActive: 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
    },
    pink: {
      activeBg: 'bg-pink-500 text-white shadow-[0_0_18px_#FF007F] border-pink-300',
      idleBg: 'bg-slate-900/90 text-pink-400 border-pink-500/30 hover:border-pink-400 hover:text-pink-300',
      centerRing: 'border-pink-500/40 bg-pink-950/60',
      centerDot: 'bg-pink-500 shadow-[0_0_8px_#FF007F]',
      borderActive: 'border-pink-400 shadow-[0_0_12px_rgba(255,0,127,0.5)]',
    },
  }[theme];

  // Execute directional command with feedback
  const triggerDirection = useCallback(
    (dir: DPadDirection) => {
      setPressedDirection(dir);
      triggerHaptic('light');
      playDPadSound(dir, soundEnabled);
      onDirection(dir);

      setTimeout(() => {
        setPressedDirection((prev) => (prev === dir ? null : prev));
      }, 140);
    },
    [onDirection, soundEnabled]
  );

  // Continuous Thumb Slide / Glide Touch Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    touchOriginRef.current = { x: centerX, y: centerY };

    // Calculate immediate touch angle from center
    const dx = touch.clientX - centerX;
    const dy = touch.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 14) {
      const dir = getDirectionFromDelta(dx, dy);
      if (dir) {
        lastTriggeredDirRef.current = dir;
        triggerDirection(dir);
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchOriginRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchOriginRef.current.x;
    const dy = touch.clientY - touchOriginRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 18) {
      const dir = getDirectionFromDelta(dx, dy);
      if (dir && dir !== lastTriggeredDirRef.current) {
        lastTriggeredDirRef.current = dir;
        triggerDirection(dir);
      }
    }
  };

  const handleTouchEnd = () => {
    touchOriginRef.current = null;
    lastTriggeredDirRef.current = null;
    setPressedDirection(null);
  };

  function getDirectionFromDelta(dx: number, dy: number): DPadDirection | null {
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      return dy > 0 ? 'DOWN' : 'UP';
    }
  }

  // Size variations
  const sizeConfig = {
    sm: 'w-32 h-32',
    md: 'w-38 h-38',
    lg: 'w-44 h-44',
  }[size];

  const buttonSize = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-14 h-14',
  }[size];

  const isHighlighted = (dir: DPadDirection) =>
    pressedDirection === dir || activeDirection === dir;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`relative ${sizeConfig} select-none touch-none flex items-center justify-center p-1 rounded-full bg-slate-950/80 border border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_4px_15px_rgba(0,0,0,0.6)]`}
    >
      {/* Background Cyber Compass Ring */}
      <div className="absolute inset-2 rounded-full border border-dashed border-slate-800/80 pointer-events-none" />

      {/* UP Wing Button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('UP');
        }}
        className={`absolute top-1 left-1/2 -translate-x-1/2 ${buttonSize} rounded-t-2xl rounded-b-lg border-2 flex flex-col items-center justify-start pt-1.5 transition-all duration-75 cursor-pointer active:scale-90 ${
          isHighlighted('UP') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="D-Pad Up"
      >
        <ChevronUp className="w-5 h-5 stroke-[2.5]" />
        <span className="text-[7px] font-orbitron font-black -mt-1 tracking-tighter opacity-70">
          UP
        </span>
      </button>

      {/* DOWN Wing Button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('DOWN');
        }}
        className={`absolute bottom-1 left-1/2 -translate-x-1/2 ${buttonSize} rounded-b-2xl rounded-t-lg border-2 flex flex-col items-center justify-end pb-1.5 transition-all duration-75 cursor-pointer active:scale-90 ${
          isHighlighted('DOWN') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="D-Pad Down"
      >
        <span className="text-[7px] font-orbitron font-black -mb-1 tracking-tighter opacity-70">
          DN
        </span>
        <ChevronDown className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* LEFT Wing Button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('LEFT');
        }}
        className={`absolute left-1 top-1/2 -translate-y-1/2 ${buttonSize} rounded-l-2xl rounded-r-lg border-2 flex items-center justify-start pl-1.5 transition-all duration-75 cursor-pointer active:scale-90 ${
          isHighlighted('LEFT') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="D-Pad Left"
      >
        <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        <span className="text-[7px] font-orbitron font-black -ml-0.5 tracking-tighter opacity-70">
          L
        </span>
      </button>

      {/* RIGHT Wing Button */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('RIGHT');
        }}
        className={`absolute right-1 top-1/2 -translate-y-1/2 ${buttonSize} rounded-r-2xl rounded-l-lg border-2 flex items-center justify-end pr-1.5 transition-all duration-75 cursor-pointer active:scale-90 ${
          isHighlighted('RIGHT') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="D-Pad Right"
      >
        <span className="text-[7px] font-orbitron font-black -mr-0.5 tracking-tighter opacity-70">
          R
        </span>
        <ChevronRight className="w-5 h-5 stroke-[2.5]" />
      </button>

      {/* Central Thumb Pivot Rest (Tactile Anchor) */}
      <div
        className={`w-9 h-9 rounded-full border-2 flex items-center justify-center pointer-events-none transition-all shadow-inner ${themeStyles.centerRing}`}
      >
        <div className={`w-3.5 h-3.5 rounded-full ${themeStyles.centerDot} animate-pulse`} />
      </div>
    </div>
  );
};
