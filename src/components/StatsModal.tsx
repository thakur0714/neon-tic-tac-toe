import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Flame, RotateCcw, Percent, BarChart3, Award } from 'lucide-react';
import { GameStats } from '../types';
import { playClickSound, triggerHaptic } from '../utils/audio';

interface StatsModalProps {
  isOpen: boolean;
  stats: GameStats;
  soundEnabled: boolean;
  onClose: () => void;
  onResetStats: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  stats,
  soundEnabled,
  onClose,
  onResetStats,
}) => {
  if (!isOpen) return null;

  const total = stats.totalGames || 1;
  const xWinRate = Math.round((stats.winsX / total) * 100);
  const oWinRate = Math.round((stats.winsO / total) * 100);
  const drawRate = Math.round((stats.draws / total) * 100);

  const handleReset = () => {
    playClickSound(soundEnabled);
    triggerHaptic('heavy');
    onResetStats();
  };

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm rounded-3xl p-5 bg-slate-900/95 border border-slate-800 shadow-2xl flex flex-col relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-white font-orbitron">
                CAREER STATS
              </h3>
            </div>
            <button
              onClick={() => {
                playClickSound(soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-2 gap-2.5 my-4">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Total Matches</span>
                <BarChart3 className="w-3.5 h-3.5" />
              </div>
              <span className="text-2xl font-black font-orbitron text-white mt-1">
                {stats.totalGames}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span>Best Streak</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-2xl font-black font-orbitron text-amber-400 mt-1">
                {stats.bestStreak}x
              </span>
            </div>
          </div>

          {/* Breakdown Bars */}
          <div className="space-y-2.5 mb-5">
            {/* Player X */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-cyan-400">Player X</span>
                <span className="font-orbitron font-bold text-slate-300">
                  {stats.winsX} ({stats.totalGames > 0 ? xWinRate : 0}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalGames > 0 ? xWinRate : 0}%` }}
                />
              </div>
            </div>

            {/* Draws */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-amber-400">Draws</span>
                <span className="font-orbitron font-bold text-slate-300">
                  {stats.draws} ({stats.totalGames > 0 ? drawRate : 0}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalGames > 0 ? drawRate : 0}%` }}
                />
              </div>
            </div>

            {/* Player O */}
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-pink-400">Player O / AI</span>
                <span className="font-orbitron font-bold text-slate-300">
                  {stats.winsO} ({stats.totalGames > 0 ? oWinRate : 0}%)
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.totalGames > 0 ? oWinRate : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer Reset Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <button
              onClick={handleReset}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>

            <button
              onClick={() => {
                playClickSound(soundEnabled);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer transition-all"
            >
              DONE
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
