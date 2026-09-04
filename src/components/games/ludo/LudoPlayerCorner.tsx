import React from 'react';
import { LudoColor, LudoPlayer, LudoThemeMode } from '../../../types/ludo';
import { LUDO_COLOR_THEMES } from '../../../utils/ludoConstants';
import { motion, AnimatePresence } from 'motion/react';
import { User, Bot, Crown, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../../../utils/audio';

interface LudoPlayerCornerProps {
  player: LudoPlayer;
  isCurrentTurn: boolean;
  canRoll: boolean;
  isRolling: boolean;
  diceValue: number | null;
  consecutiveSixes?: number;
  onRoll: () => void;
  theme?: LudoThemeMode;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export const LudoPlayerCorner: React.FC<LudoPlayerCornerProps> = ({
  player,
  isCurrentTurn,
  canRoll,
  isRolling,
  diceValue,
  consecutiveSixes = 0,
  onRoll,
  theme = 'cyber',
  position,
}) => {
  const isCyber = theme === 'cyber';
  const colorTheme = LUDO_COLOR_THEMES[player.color];
  const isRightSide = position === 'top-right' || position === 'bottom-right';

  // Render dice pips (1 to 6 dots on white acrylic dice)
  const renderPips = (val: number) => {
    const dotColor = val === 1 ? colorTheme.neonColor : '#0F172A';
    const dotGlow = val === 1 ? `0 0 5px ${colorTheme.neonColor}` : 'none';

    switch (val) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="w-3 h-3 rounded-full shadow-inner"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 rounded-full self-end"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1 relative">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 rounded-full self-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
            <span
              className="w-2 h-2 rounded-full self-end"
              style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
            />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-0.5 gap-1 place-items-center">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-0.5 gap-1 place-items-center relative">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 6:
      default:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-0.5 gap-x-1 gap-y-0.5 place-items-center">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
    }
  };

  const handleDiceClick = () => {
    if (isCurrentTurn && canRoll && !isRolling) {
      triggerHaptic('medium');
      onRoll();
    }
  };

  // Display value on this player's dice (never hardcoded 6!)
  const displayValue = isCurrentTurn ? (diceValue && diceValue >= 1 && diceValue <= 6 ? diceValue : 1) : 1;

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 rounded-xl border transition-all duration-300 ${
        isRightSide ? 'flex-row-reverse text-right' : 'flex-row text-left'
      } ${
        isCurrentTurn
          ? 'bg-slate-900/95 border-2 shadow-lg ring-1'
          : 'bg-slate-900/60 border-slate-800/80 opacity-75'
      }`}
      style={{
        borderColor: isCurrentTurn
          ? isCyber
            ? colorTheme.neonBorder
            : colorTheme.classicBorder
          : undefined,
        boxShadow: isCurrentTurn && isCyber ? `0 0 16px ${colorTheme.neonColor}40` : undefined,
      }}
    >
      {/* 1. Interactive 3D Dice Box */}
      <div className="relative shrink-0">
        <motion.button
          type="button"
          whileHover={isCurrentTurn && canRoll && !isRolling ? { scale: 1.1 } : undefined}
          whileTap={isCurrentTurn && canRoll && !isRolling ? { scale: 0.9 } : undefined}
          onClick={handleDiceClick}
          disabled={!isCurrentTurn || !canRoll || isRolling}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl relative flex items-center justify-center transition-all ${
            isCurrentTurn && canRoll && !isRolling
              ? 'cursor-pointer shadow-lg'
              : 'cursor-default opacity-85'
          }`}
          style={{
            background: 'linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 55%, #E2E8F0 100%)',
            border: `2px solid ${isCurrentTurn ? colorTheme.neonBorder : '#CBD5E1'}`,
            boxShadow: isCurrentTurn
              ? `0 0 14px ${colorTheme.neonColor}80, 0 4px 10px rgba(0,0,0,0.35), inset 0 2px 4px #FFFFFF, inset 0 -3px 5px rgba(0,0,0,0.12)`
              : '0 4px 8px rgba(0,0,0,0.25), inset 0 2px 3px #FFFFFF, inset 0 -2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {/* Pulsing ring when active turn & ready to roll */}
          {isCurrentTurn && canRoll && !isRolling && (
            <span
              className="absolute -inset-1 rounded-xl animate-ping opacity-60 pointer-events-none"
              style={{ backgroundColor: colorTheme.neonColor }}
            />
          )}

          {/* 3D Dice Content */}
          <AnimatePresence mode="wait">
            {isCurrentTurn && isRolling ? (
              <motion.div
                key="rolling"
                animate={{
                  rotate: [0, 90, 180, 270, 360],
                  scale: [1, 1.25, 0.9, 1.2, 1],
                }}
                transition={{
                  duration: 0.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="w-6 h-6 rounded-lg bg-slate-800/90 border border-slate-600 flex items-center justify-center"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full animate-spin"
                  style={{ backgroundColor: colorTheme.neonColor }}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`${player.color}_${displayValue}`}
                initial={isCurrentTurn ? { scale: 0.6, rotate: -20, opacity: 0 } : false}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="w-full h-full p-0.5 flex items-center justify-center"
              >
                {renderPips(displayValue)}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Turn Action Badge directly under/over dice */}
        {isCurrentTurn && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`absolute -bottom-2 ${
              isRightSide ? 'right-0' : 'left-0'
            } z-20 pointer-events-none`}
          >
            <span
              className="text-[7px] font-orbitron font-black px-1 py-0.2 rounded border shadow whitespace-nowrap uppercase"
              style={{
                backgroundColor: isCyber ? colorTheme.neonDarkBg : '#0F172A',
                borderColor: colorTheme.neonBorder,
                color: isCyber ? colorTheme.neonColor : '#F8FAFC',
              }}
            >
              {isRolling ? 'ROLLING' : canRoll ? 'TAP TO ROLL' : 'PICK GOTI'}
            </span>
          </motion.div>
        )}
      </div>

      {/* 2. Player Info & Avatar */}
      <div className="flex flex-col min-w-0">
        <div
          className={`flex items-center gap-1 ${
            isRightSide ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
          }`}
        >
          <div
            className="w-5 h-5 rounded-lg border flex items-center justify-center shrink-0"
            style={{
              backgroundColor: isCyber ? colorTheme.neonDarkBg : '#1E293B',
              borderColor: isCyber ? colorTheme.neonBorder : '#475569',
            }}
          >
            {player.type === 'ai' ? (
              <Bot className="w-3 h-3" style={{ color: colorTheme.neonColor }} />
            ) : (
              <User className="w-3 h-3" style={{ color: colorTheme.neonColor }} />
            )}
          </div>

          <span
            className="text-[10px] sm:text-[11px] font-orbitron font-bold tracking-tight truncate leading-tight"
            style={{ color: isCyber ? colorTheme.neonColor : '#F8FAFC' }}
          >
            {player.name}
          </span>
        </div>

        {/* Home pawns status & streak bonus */}
        <div
          className={`flex items-center gap-1 mt-0.5 text-[8px] text-slate-400 leading-tight ${
            isRightSide ? 'justify-end' : 'justify-start'
          }`}
        >
          <span className="font-medium">
            {player.tokensHome}/4 Home
          </span>
          {consecutiveSixes > 0 && isCurrentTurn && (
            <span className="text-amber-400 font-bold px-1 rounded bg-amber-500/20 border border-amber-500/30">
              6x{consecutiveSixes}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
