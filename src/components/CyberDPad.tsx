import React, { useState, useRef, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { playDPadSound, triggerHaptic } from '../utils/audio';

export type DPadDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type DPadLayoutMode = 'wheel' | 'split-bar' | 'compact-cross';

interface CyberDPadProps {
  onDirection: (direction: DPadDirection) => void;
  activeDirection?: DPadDirection | null;
  soundEnabled?: boolean;
  theme?: 'emerald' | 'cyan' | 'amber' | 'pink';
  layoutMode?: DPadLayoutMode;
  onToggleLayoutMode?: () => void;
}

export const CyberDPad: React.FC<CyberDPadProps> = ({
  onDirection,
  activeDirection = null,
  soundEnabled = true,
  theme = 'emerald',
  layoutMode = 'wheel',
  onToggleLayoutMode,
}) => {
  const [pressedDirection, setPressedDirection] = useState<DPadDirection | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchOriginRef = useRef<{ x: number; y: number } | null>(null);
  const lastFiredDirRef = useRef<DPadDirection | null>(null);

  // Theme color styles
  const themeStyles = {
    emerald: {
      activeBg: 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_#10B981] border-emerald-200 scale-95',
      idleBg: 'bg-slate-900/90 text-emerald-400 border-emerald-500/30 hover:border-emerald-400 hover:text-emerald-300',
      activeSector: 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
      centerRing: 'border-emerald-500/50 bg-emerald-950/80',
      centerDot: 'bg-emerald-400 shadow-[0_0_10px_#10B981]',
      borderActive: 'border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)]',
    },
    cyan: {
      activeBg: 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_#00F0FF] border-cyan-100 scale-95',
      idleBg: 'bg-slate-900/90 text-cyan-400 border-cyan-500/30 hover:border-cyan-400 hover:text-cyan-300',
      activeSector: 'bg-cyan-500/30 text-cyan-300 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.5)]',
      centerRing: 'border-cyan-500/50 bg-cyan-950/80',
      centerDot: 'bg-cyan-400 shadow-[0_0_10px_#00F0FF]',
      borderActive: 'border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.5)]',
    },
    amber: {
      activeBg: 'bg-amber-400 text-slate-950 shadow-[0_0_20px_#F59E0B] border-amber-100 scale-95',
      idleBg: 'bg-slate-900/90 text-amber-400 border-amber-500/30 hover:border-amber-400 hover:text-amber-300',
      activeSector: 'bg-amber-500/30 text-amber-300 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
      centerRing: 'border-amber-500/50 bg-amber-950/80',
      centerDot: 'bg-amber-400 shadow-[0_0_10px_#F59E0B]',
      borderActive: 'border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]',
    },
    pink: {
      activeBg: 'bg-pink-500 text-white shadow-[0_0_20px_#FF007F] border-pink-200 scale-95',
      idleBg: 'bg-slate-900/90 text-pink-400 border-pink-500/30 hover:border-pink-400 hover:text-pink-300',
      activeSector: 'bg-pink-500/30 text-pink-300 border-pink-400 shadow-[0_0_15px_rgba(255,0,127,0.5)]',
      centerRing: 'border-pink-500/50 bg-pink-950/80',
      centerDot: 'bg-pink-500 shadow-[0_0_10px_#FF007F]',
      borderActive: 'border-pink-400 shadow-[0_0_12px_rgba(255,0,127,0.5)]',
    },
  }[theme];

  // Execute directional command with tactile feel
  const triggerDirection = useCallback(
    (dir: DPadDirection) => {
      setPressedDirection(dir);
      triggerHaptic('medium');
      playDPadSound(dir, soundEnabled);
      onDirection(dir);

      setTimeout(() => {
        setPressedDirection((prev) => (prev === dir ? null : prev));
      }, 160);
    },
    [onDirection, soundEnabled]
  );

  // Direction calculation from touch coordinates relative to center
  const computeDirectionFromCoords = (clientX: number, clientY: number): DPadDirection | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Dead zone in center
    if (dist < 10) return null;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'RIGHT' : 'LEFT';
    } else {
      return dy > 0 ? 'DOWN' : 'UP';
    }
  };

  // Continuous Thumb Glide & Touch Sector Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchOriginRef.current = { x: touch.clientX, y: touch.clientY };

    const dir = computeDirectionFromCoords(touch.clientX, touch.clientY);
    if (dir) {
      lastFiredDirRef.current = dir;
      triggerDirection(dir);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dir = computeDirectionFromCoords(touch.clientX, touch.clientY);

    if (dir && dir !== lastFiredDirRef.current) {
      lastFiredDirRef.current = dir;
      triggerDirection(dir);
    }
  };

  const handleTouchEnd = () => {
    touchOriginRef.current = null;
    lastFiredDirRef.current = null;
    setPressedDirection(null);
  };

  const isHighlighted = (dir: DPadDirection) =>
    pressedDirection === dir || activeDirection === dir;

  // 1. Split-Bar Layout (Dual Thumb Wide Controls)
  if (layoutMode === 'split-bar') {
    return (
      <div className="w-full flex items-center justify-between gap-2 max-w-sm mx-auto px-1 select-none">
        {/* Left Hand: LEFT & DOWN */}
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerDirection('LEFT');
            }}
            className={`flex-1 h-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center gap-1 font-orbitron font-black text-xs transition-all active:scale-90 cursor-pointer ${
              isHighlighted('LEFT') ? themeStyles.activeBg : themeStyles.idleBg
            }`}
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            <span>LEFT</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerDirection('DOWN');
            }}
            className={`flex-1 h-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center gap-1 font-orbitron font-black text-xs transition-all active:scale-90 cursor-pointer ${
              isHighlighted('DOWN') ? themeStyles.activeBg : themeStyles.idleBg
            }`}
          >
            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
            <span>DOWN</span>
          </button>
        </div>

        {/* Right Hand: UP & RIGHT */}
        <div className="flex items-center gap-1.5 flex-1">
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerDirection('UP');
            }}
            className={`flex-1 h-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center gap-1 font-orbitron font-black text-xs transition-all active:scale-90 cursor-pointer ${
              isHighlighted('UP') ? themeStyles.activeBg : themeStyles.idleBg
            }`}
          >
            <span>UP</span>
            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              triggerDirection('RIGHT');
            }}
            className={`flex-1 h-12 sm:h-14 rounded-2xl border-2 flex items-center justify-center gap-1 font-orbitron font-black text-xs transition-all active:scale-90 cursor-pointer ${
              isHighlighted('RIGHT') ? themeStyles.activeBg : themeStyles.idleBg
            }`}
          >
            <span>RIGHT</span>
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }

  // 2. Full-Sector Cyber Wheel D-Pad (Default: Easy Blind Gliding with Large Hitboxes)
  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className="relative w-36 h-36 sm:w-40 sm:h-40 select-none touch-none flex items-center justify-center p-1 rounded-full bg-slate-950/95 border-2 border-slate-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_6px_20px_rgba(0,0,0,0.6)] backdrop-blur-md"
    >
      {/* 4 Large Touch Quadrants (Zero Dead-Zones for Blind Thumb Navigation) */}
      {/* UP Sector */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('UP');
        }}
        className={`absolute top-0.5 left-1/2 -translate-x-1/2 w-20 h-14 rounded-t-full rounded-b-lg border flex flex-col items-center justify-start pt-1 transition-all duration-75 cursor-pointer active:scale-95 ${
          isHighlighted('UP') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="Up"
      >
        <ChevronUp className="w-5 h-5 stroke-[3]" />
        <span className="text-[8px] font-orbitron font-black -mt-1 tracking-wider opacity-80">
          UP
        </span>
      </button>

      {/* DOWN Sector */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('DOWN');
        }}
        className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-20 h-14 rounded-b-full rounded-t-lg border flex flex-col items-center justify-end pb-1 transition-all duration-75 cursor-pointer active:scale-95 ${
          isHighlighted('DOWN') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="Down"
      >
        <span className="text-[8px] font-orbitron font-black -mb-1 tracking-wider opacity-80">
          DOWN
        </span>
        <ChevronDown className="w-5 h-5 stroke-[3]" />
      </button>

      {/* LEFT Sector */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('LEFT');
        }}
        className={`absolute left-0.5 top-1/2 -translate-y-1/2 w-14 h-20 rounded-l-full rounded-r-lg border flex items-center justify-start pl-1 transition-all duration-75 cursor-pointer active:scale-95 ${
          isHighlighted('LEFT') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="Left"
      >
        <ChevronLeft className="w-5 h-5 stroke-[3]" />
        <span className="text-[8px] font-orbitron font-black -ml-0.5 tracking-wider opacity-80">
          L
        </span>
      </button>

      {/* RIGHT Sector */}
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          triggerDirection('RIGHT');
        }}
        className={`absolute right-0.5 top-1/2 -translate-y-1/2 w-14 h-20 rounded-r-full rounded-l-lg border flex items-center justify-end pr-1 transition-all duration-75 cursor-pointer active:scale-95 ${
          isHighlighted('RIGHT') ? themeStyles.activeBg : themeStyles.idleBg
        }`}
        aria-label="Right"
      >
        <span className="text-[8px] font-orbitron font-black -mr-0.5 tracking-wider opacity-80">
          R
        </span>
        <ChevronRight className="w-5 h-5 stroke-[3]" />
      </button>

      {/* Central Thumb Pivot Anchor with Tactile Dot */}
      <div
        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center pointer-events-none transition-all shadow-inner z-20 ${themeStyles.centerRing}`}
      >
        <div className={`w-3.5 h-3.5 rounded-full ${themeStyles.centerDot} animate-pulse`} />
      </div>
    </div>
  );
};
