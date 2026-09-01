import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Home, Sparkles, Scale, Flame, ArrowRight } from 'lucide-react';
import { GameConfig, GameStats, Player, WinResult } from '../types';
import { playClickSound, triggerHaptic } from '../utils/audio';

interface WinnerModalProps {
  isOpen: boolean;
  winResult: WinResult;
  config: GameConfig;
  stats: GameStats;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  onOpenStats: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  isOpen,
  winResult,
  config,
  stats,
  onPlayAgain,
  onMainMenu,
  onOpenStats,
}) => {
  if (!isOpen) return null;

  const isDraw = winResult.winner === 'draw';
  const winner = winResult.winner as Player;

  const isUserWinner =
    config.mode.startsWith('ai') && winner === config.playerSymbol;
  const isAiWinner =
    config.mode.startsWith('ai') && winner === config.aiSymbol;

  // Title generation
  let title = '';
  let subtitle = '';
  let badgeColor = '';

  if (isDraw) {
    title = 'EPIC DRAW!';
    subtitle = 'A flawless clash of equal minds. Neither side gave ground.';
    badgeColor = 'from-amber-500 to-yellow-400';
  } else if (isUserWinner) {
    title = 'VICTORY IS YOURS!';
    subtitle =
      config.mode === 'ai-hard'
        ? 'Incredible! You outsmarted the Unbeatable Minimax AI!'
        : 'Superb tactics! You claimed the round with authority.';
    badgeColor = winner === 'X' ? 'from-cyan-400 to-sky-400' : 'from-pink-500 to-rose-400';
  } else if (isAiWinner) {
    title = 'AI CLAIMS VICTORY!';
    subtitle =
      config.mode === 'ai-hard'
        ? 'The Minimax algorithm computed every variation with ruthless precision.'
        : 'The bot caught you off guard! Ready for a comeback?';
    badgeColor = 'from-pink-500 to-purple-600';
  } else {
    // PvP
    title = `PLAYER ${winner} WINS!`;
    subtitle = `Player ${winner} dominated the arena with a decisive 3-in-a-row strike.`;
    badgeColor = winner === 'X' ? 'from-cyan-400 to-sky-400' : 'from-pink-500 to-rose-400';
  }

  const handlePlayAgain = () => {
    playClickSound(config.soundEnabled);
    triggerHaptic('medium', config.hapticsEnabled);
    onPlayAgain();
  };

  const handleMainMenu = () => {
    playClickSound(config.soundEnabled);
    triggerHaptic('light', config.hapticsEnabled);
    onMainMenu();
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`w-full max-w-sm rounded-3xl p-6 bg-slate-900/98 border flex flex-col items-center text-center shadow-2xl relative overflow-hidden will-change-transform ${
            isDraw
              ? 'border-amber-500/40 shadow-amber-900/30'
              : winner === 'X'
              ? 'border-cyan-500/50 shadow-cyan-900/40 glow-cyan-box'
              : 'border-pink-500/50 shadow-pink-900/40 glow-pink-box'
          }`}
        >
          {/* Top Ambient Glow */}
          <div
            className={`absolute -top-16 inset-x-0 h-28 blur-2xl opacity-25 pointer-events-none ${
              isDraw ? 'bg-amber-400' : winner === 'X' ? 'bg-cyan-400' : 'bg-pink-500'
            }`}
          />

          {/* Trophy / Result Icon Badge */}
          <div
            className={`w-18 h-18 rounded-2xl flex items-center justify-center mb-4 shadow-lg border transform transition-transform ${
              isDraw
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-400'
                : winner === 'X'
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-400'
                : 'bg-pink-500/20 border-pink-400/60 text-pink-500'
            }`}
          >
            {isDraw ? (
              <Scale className="w-9 h-9" />
            ) : (
              <Trophy className="w-9 h-9 drop-shadow-md" />
            )}
          </div>

          {/* Winner Token Indicator if not draw */}
          {!isDraw && (
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-xs uppercase tracking-widest font-orbitron font-bold text-slate-400">
                ROUND WINNER
              </span>
              <span
                className={`text-sm font-black font-orbitron px-2 py-0.5 rounded-md border ${
                  winner === 'X'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                    : 'bg-pink-950 text-pink-300 border-pink-500/50'
                }`}
              >
                {winner}
              </span>
            </div>
          )}

          {/* Result Main Title */}
          <h2 className="text-2xl font-black font-orbitron tracking-wide text-white mb-1">
            {title}
          </h2>

          <p className="text-xs text-slate-300 max-w-[260px] leading-relaxed mb-4">
            {subtitle}
          </p>

          {/* Mini Score Pill */}
          <div className="w-full grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 mb-5">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-bold">X WINS</span>
              <span className="text-sm font-black font-orbitron text-cyan-400">{stats.winsX}</span>
            </div>
            <div className="flex flex-col items-center border-x border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold">DRAWS</span>
              <span className="text-sm font-black font-orbitron text-amber-400">{stats.draws}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-slate-400 font-bold">O WINS</span>
              <span className="text-sm font-black font-orbitron text-pink-500">{stats.winsO}</span>
            </div>
          </div>

          {/* Primary Action Button: Play Again */}
          <div className="w-full flex flex-col gap-2.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              onClick={handlePlayAgain}
              className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-slate-950 font-black font-orbitron text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.4)] border border-cyan-200/60 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 stroke-[3]" />
              <span>PLAY AGAIN</span>
            </motion.button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleMainMenu}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>MAIN MENU</span>
              </button>

              <button
                onClick={onOpenStats}
                className="py-2.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-amber-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>ALL STATS</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
