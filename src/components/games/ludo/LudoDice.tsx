import React, { useState, useEffect } from 'react';
import { LudoColor } from '../../../types/ludo';
import { LUDO_COLOR_THEMES } from '../../../utils/ludoConstants';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../../utils/audio';

export interface LudoDiceProps {
  value: number | null; // 1 to 6, or null
  isRolling: boolean;
  canRoll: boolean;
  activeColor: LudoColor;
  onRoll: () => void;
  consecutiveSixes?: number;
  theme?: 'cyber' | 'classic';
  soundEnabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

// 3x3 Pip coordinates for realistic dice faces
const DICE_PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export const LudoDice: React.FC<LudoDiceProps> = ({
  value,
  isRolling = false,
  canRoll = true,
  activeColor = 'red',
  onRoll,
  consecutiveSixes = 0,
  size = 'lg',
  showLabel = true,
  className = '',
}) => {
  const colorTheme = LUDO_COLOR_THEMES[activeColor];
  
  // Track last displayed face during roll tumble
  const [tumbleFace, setTumbleFace] = useState<number>(1);
  const [lastRolledFace, setLastRolledFace] = useState<number>(1);

  // Update last rolled face whenever a genuine roll value comes in
  useEffect(() => {
    if (value && value >= 1 && value <= 6) {
      setLastRolledFace(value);
    }
  }, [value]);

  // Rapidly shuffle random faces while rolling for authentic 3D dice roll
  useEffect(() => {
    if (!isRolling) return;
    const interval = setInterval(() => {
      setTumbleFace(Math.floor(Math.random() * 6) + 1);
    }, 65);
    return () => clearInterval(interval);
  }, [isRolling]);

  // Which face to render: when rolling, the tumbling face; otherwise the actual roll value or last rolled face (NEVER hardcoded 6!)
  const displayFace = isRolling ? tumbleFace : (value ?? lastRolledFace ?? 1);

  const handleDiceClick = () => {
    if (!canRoll || isRolling) return;
    triggerHaptic('medium');
    onRoll();
  };

  // Dimensions based on size prop (ensuring mobile devices have a large, prominent dice)
  const sizeClasses = {
    sm: 'w-10 h-10 rounded-xl',
    md: 'w-12 h-12 rounded-xl',
    lg: 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl',
    xl: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
  }[size];

  const dotSizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3 sm:w-3.5 sm:h-3.5',
    xl: 'w-3.5 h-3.5 sm:w-4 sm:h-4',
  }[size];

  // Render authentic dice pips: Clean high-contrast dots on pure white acrylic
  const renderPips = (faceVal: number) => {
    const validVal = Math.min(6, Math.max(1, faceVal));
    const activePips = DICE_PIPS[validVal] || DICE_PIPS[1];
    const isOne = validVal === 1;

    return (
      <div className="w-full h-full grid grid-cols-3 grid-rows-3 place-items-center p-[15%] select-none pointer-events-none">
        {Array.from({ length: 9 }).map((_, idx) => {
          const hasPip = activePips.includes(idx);
          if (!hasPip) return <div key={idx} className="w-full h-full" />;

          // Face 1 has the iconic bold colored centerpiece; 2-6 have deep obsidian/slate dots with subtle inner depth
          const pipColor = isOne ? colorTheme.neonColor : '#0F172A';

          return (
            <div
              key={idx}
              className={`${dotSizeClasses} rounded-full transition-transform duration-100 flex items-center justify-center shadow-inner`}
              style={{
                backgroundColor: pipColor,
                boxShadow: isOne
                  ? `0 0 8px ${colorTheme.neonColor}aa, inset 0 1px 2px rgba(0,0,0,0.4)`
                  : 'inset 0 1px 2px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.8)',
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className={`flex items-center gap-2.5 select-none relative ${className}`}>
      {/* 3D WHITE DICE BUTTON */}
      <motion.button
        type="button"
        whileHover={canRoll && !isRolling ? { scale: 1.08, y: -2 } : undefined}
        whileTap={canRoll && !isRolling ? { scale: 0.92, y: 1 } : undefined}
        onClick={handleDiceClick}
        disabled={!canRoll || isRolling}
        aria-label={canRoll ? 'Roll dice' : `Dice value ${displayFace}`}
        className={`${sizeClasses} relative flex items-center justify-center cursor-pointer transition-all duration-150 transform-gpu ${
          canRoll && !isRolling
            ? 'cursor-pointer ring-4 ring-white/70 shadow-[0_0_20px_rgba(255,255,255,0.7)]'
            : 'cursor-default opacity-95'
        }`}
        style={{
          // Authentic pure white acrylic dice styling with realistic 3D depth and glossy shine
          background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 55%, #E2E8F0 100%)',
          border: '2px solid #CBD5E1',
          boxShadow: canRoll && !isRolling
            ? `0 10px 22px -3px rgba(0,0,0,0.5), 0 0 16px ${colorTheme.neonColor}80, inset 0 3px 5px #FFFFFF, inset 0 -4px 6px rgba(0,0,0,0.15)`
            : '0 8px 18px -2px rgba(0,0,0,0.4), inset 0 2px 4px #FFFFFF, inset 0 -3px 5px rgba(0,0,0,0.12)',
        }}
      >
        {/* Pulsing neon halo beacon when it's this player's turn to roll */}
        {canRoll && !isRolling && (
          <motion.span
            className="absolute -inset-2 rounded-2xl pointer-events-none opacity-60"
            style={{ backgroundColor: colorTheme.neonColor }}
            animate={{
              scale: [1, 1.25, 1],
              opacity: [0.6, 0.1, 0.6],
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* 3D Rolling Tumbling Animation */}
        <AnimatePresence mode="wait">
          {isRolling ? (
            <motion.div
              key="tumbling_dice"
              className="w-full h-full relative"
              animate={{
                rotateX: [0, 180, 360, 540, 720],
                rotateY: [0, -180, -360, -540, -720],
                rotateZ: [0, 45, -45, 90, 0],
                scale: [1, 1.15, 0.92, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {renderPips(tumbleFace)}
            </motion.div>
          ) : (
            <motion.div
              key={`face_${displayFace}`}
              initial={{ scale: 0.7, rotate: -15, opacity: 0.6 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 22 }}
              className="w-full h-full relative"
            >
              {renderPips(displayFace)}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Glossy top-light reflection overlay */}
        <div className="absolute inset-x-1.5 top-1 h-1/3 rounded-t-xl bg-gradient-to-b from-white/80 to-transparent pointer-events-none opacity-80" />
      </motion.button>

      {/* Turn & Status Label */}
      {showLabel && (
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={canRoll && !isRolling ? handleDiceClick : undefined}
            disabled={!canRoll || isRolling}
            className={`text-[10px] sm:text-[11px] font-orbitron font-extrabold tracking-wider px-2.5 py-1 rounded-lg border shadow-md transition-all uppercase whitespace-nowrap ${
              canRoll && !isRolling
                ? 'cursor-pointer hover:scale-105 active:scale-95 animate-pulse'
                : 'cursor-default'
            }`}
            style={{
              backgroundColor: canRoll ? colorTheme.neonDarkBg : '#0F172A',
              borderColor: canRoll ? colorTheme.neonBorder : '#334155',
              color: canRoll ? colorTheme.neonColor : '#94A3B8',
              boxShadow: canRoll ? `0 0 12px ${colorTheme.neonColor}40` : 'none',
            }}
          >
            {isRolling ? 'ROLLING...' : canRoll ? 'TAP TO ROLL' : `ROLLED: ${displayFace}`}
          </button>

          {/* Consecutive Six Indicator */}
          {consecutiveSixes > 0 && (
            <span className="text-[9px] font-orbitron font-black text-amber-300 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 animate-bounce">
              SIX x{consecutiveSixes} ⚡ BONUS!
            </span>
          )}
        </div>
      )}
    </div>
  );
};
