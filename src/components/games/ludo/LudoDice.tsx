import React, { useState } from 'react';
import { LudoColor } from '../../../types/ludo';
import { LUDO_COLOR_THEMES } from '../../../utils/ludoConstants';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../../utils/audio';

interface LudoDiceProps {
  value: number | null; // 1 to 6
  isRolling: boolean;
  canRoll: boolean;
  activeColor: LudoColor;
  onRoll: () => void;
  consecutiveSixes?: number;
  theme?: 'cyber' | 'classic';
  soundEnabled?: boolean;
}

export const LudoDice: React.FC<LudoDiceProps> = ({
  value = 1,
  isRolling = false,
  canRoll = true,
  activeColor = 'red',
  onRoll,
  consecutiveSixes = 0,
  theme = 'cyber',
}) => {
  const isCyber = theme === 'cyber';
  const colorTheme = LUDO_COLOR_THEMES[activeColor];

  // Helper to render dice pips (dots)
  const renderPips = (val: number) => {
    const dotColor = isCyber ? colorTheme.neonColor : '#1E293B';
    const dotGlow = isCyber ? `0 0 6px ${colorTheme.neonColor}` : 'none';

    switch (val) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full shadow-inner"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-1">
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-end"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1 relative">
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full self-end"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-1 gap-1 place-items-center">
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-1 gap-1 place-items-center relative">
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 6:
      default:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-1 gap-x-1 gap-y-0.5 place-items-center">
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
    }
  };

  const handleDiceClick = () => {
    if (!canRoll || isRolling) return;
    triggerHaptic('medium');
    onRoll();
  };

  return (
    <div className="flex items-center gap-2 select-none relative">
      {/* 3D Dice Button Box */}
      <motion.button
        type="button"
        whileHover={canRoll && !isRolling ? { scale: 1.08 } : undefined}
        whileTap={canRoll && !isRolling ? { scale: 0.92 } : undefined}
        onClick={handleDiceClick}
        disabled={!canRoll || isRolling}
        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl relative flex items-center justify-center cursor-pointer transition-all duration-200 border-2 ${
          canRoll && !isRolling
            ? 'ring-2 ring-white/60 cursor-pointer shadow-[0_0_15px_rgba(255,255,255,0.4)]'
            : 'opacity-90 cursor-default'
        }`}
        style={{
          backgroundColor: isCyber ? '#0B0F19' : '#FFFFFF',
          borderColor: isCyber ? colorTheme.neonBorder : '#CBD5E1',
          boxShadow: isCyber
            ? `0 0 12px ${colorTheme.neonColor}, inset 0 2px 4px rgba(255,255,255,0.2)`
            : '0 4px 8px rgba(0,0,0,0.25), inset 0 2px 4px rgba(255,255,255,0.8)',
        }}
      >
        {/* Animated Pulsing Ring when it's your turn to roll */}
        {canRoll && !isRolling && (
          <span
            className="absolute -inset-1 rounded-xl animate-ping opacity-60 pointer-events-none"
            style={{ backgroundColor: colorTheme.neonColor }}
          />
        )}

        {/* 3D Rolling Tumbling Animation */}
        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="rolling"
              animate={{
                rotate: [0, 90, 180, 270, 360],
                scale: [1, 1.2, 0.9, 1.15, 1],
              }}
              transition={{
                duration: 0.45,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800/90 border border-slate-600 flex items-center justify-center"
            >
              <div
                className="w-2.5 h-2.5 rounded-full animate-spin"
                style={{ backgroundColor: colorTheme.neonColor }}
              />
            </motion.div>
          ) : (
            <motion.div
              key={value || 'idle'}
              initial={{ scale: 0.7, rotate: -25, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              className="w-full h-full p-1 flex items-center justify-center"
            >
              {renderPips(value || 1)}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Turn & Status Floating Pill */}
      <div className="flex flex-col items-start gap-0.5">
        <span
          className="text-[9px] font-orbitron font-bold tracking-wider px-1.5 py-0.2 rounded border shadow-sm"
          style={{
            backgroundColor: isCyber ? colorTheme.neonDarkBg : '#1E293B',
            borderColor: isCyber ? colorTheme.neonBorder : '#475569',
            color: isCyber ? colorTheme.neonColor : '#F8FAFC',
          }}
        >
          {isRolling ? 'ROLLING...' : canRoll ? 'TAP TO ROLL' : 'SELECT TOKEN'}
        </span>

        {/* Consecutive Six Indicator */}
        {consecutiveSixes > 0 && (
          <span className="text-[8px] font-orbitron font-black text-amber-400 px-1 py-0.2 rounded bg-amber-500/20 border border-amber-500/40 animate-pulse">
            SIX x{consecutiveSixes}
          </span>
        )}
      </div>
    </div>
  );
};
