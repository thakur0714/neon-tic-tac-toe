import React from 'react';
import { LudoColor, LudoToken } from '../../../types/ludo';
import { LUDO_COLOR_THEMES } from '../../../utils/ludoConstants';
import { motion } from 'motion/react';

interface LudoTokenVisualProps {
  token: LudoToken;
  isSelectable?: boolean;
  isCurrentTurn?: boolean;
  onClick?: () => void;
  stackCount?: number;
  stackIndex?: number;
  theme?: 'cyber' | 'classic';
}

export const LudoTokenVisual: React.FC<LudoTokenVisualProps> = ({
  token,
  isSelectable = false,
  onClick,
  stackCount = 1,
  theme = 'cyber',
}) => {
  const colorTheme = LUDO_COLOR_THEMES[token.color];
  const isCyber = theme === 'cyber';

  return (
    <motion.button
      type="button"
      whileHover={isSelectable ? { scale: 1.2 } : undefined}
      whileTap={isSelectable ? { scale: 0.92 } : undefined}
      onClick={isSelectable ? onClick : undefined}
      disabled={!isSelectable && !onClick}
      className={`w-6 h-6 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center relative select-none transform-gpu ${
        isSelectable ? 'cursor-pointer z-30' : 'cursor-default pointer-events-none z-20'
      }`}
    >
      {/* 1. Selection Pulsing Neon Beacon Aura */}
      {isSelectable && (
        <span
          className="absolute -inset-1.5 rounded-full animate-ping opacity-80 pointer-events-none"
          style={{
            backgroundColor: colorTheme.neonColor,
          }}
        />
      )}

      {/* 2. Outer 3D Metallic Ring */}
      <div
        className={`w-full h-full rounded-full flex items-center justify-center relative transition-all duration-200 border-2 ${
          isSelectable
            ? 'ring-2 ring-white shadow-[0_0_16px_rgba(255,255,255,0.9)]'
            : 'shadow-[0_4px_8px_rgba(0,0,0,0.6)]'
        }`}
        style={{
          backgroundColor: isCyber ? colorTheme.neonColor : colorTheme.classicColor,
          borderColor: isSelectable ? '#FFFFFF' : isCyber ? '#FFFFFFE0' : colorTheme.classicBorder,
          boxShadow: isCyber
            ? `0 0 12px ${colorTheme.neonColor}, inset 0 2px 3px rgba(255,255,255,0.7), inset 0 -2px 3px rgba(0,0,0,0.5)`
            : '0 3px 6px rgba(0,0,0,0.5), inset 0 2px 3px rgba(255,255,255,0.5)',
        }}
      >
        {/* 3. Deep Obsidian Recessed Core */}
        <div
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center border shadow-inner"
          style={{
            backgroundColor: isCyber ? '#090D16' : '#1E293B',
            borderColor: isCyber ? `${colorTheme.neonColor}90` : '#475569',
          }}
        >
          {/* 4. Center Glowing Energy Gem */}
          <div
            className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full"
            style={{
              backgroundColor: isCyber ? colorTheme.neonColor : '#FFFFFF',
              boxShadow: isCyber ? `0 0 6px ${colorTheme.neonColor}` : 'none',
            }}
          />
        </div>

        {/* Stack Multiplier Badge (if 2+ tokens on same square) */}
        {stackCount > 1 && (
          <span className="absolute -top-1 -right-1 bg-slate-950 border border-white/90 text-[7px] sm:text-[8px] font-black font-orbitron text-white rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center shadow-lg">
            {stackCount}
          </span>
        )}
      </div>
    </motion.button>
  );
};
