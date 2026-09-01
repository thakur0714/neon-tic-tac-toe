import React from 'react';
import { motion } from 'motion/react';
import { RotateCcw, Volume2, VolumeX, ArrowLeft, Flame, Zap, Bot, User, Trophy, HelpCircle } from 'lucide-react';
import { GameConfig, GameStats, Player } from '../types';
import { playClickSound } from '../utils/audio';

interface ScoreBoardProps {
  config: GameConfig;
  stats: GameStats;
  currentPlayer: Player;
  isAiThinking: boolean;
  onReset: () => void;
  onBackToMenu: () => void;
  onToggleSound: () => void;
  onOpenStats: () => void;
  onOpenRules: () => void;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  config,
  stats,
  currentPlayer,
  isAiThinking,
  onReset,
  onBackToMenu,
  onToggleSound,
  onOpenStats,
  onOpenRules,
}) => {
  const isPlayerXTurn = currentPlayer === 'X';
  const isPlayerOTurn = currentPlayer === 'O';

  const getModeLabel = () => {
    switch (config.mode) {
      case 'pvp':
        return 'PASS & PLAY';
      case 'ai-easy':
        return 'CASUAL AI';
      case 'ai-hard':
        return 'UNBEATABLE AI';
      default:
        return 'AI DUEL';
    }
  };

  const getPlayer2Label = () => {
    if (config.mode === 'pvp') return 'PLAYER O';
    return config.mode === 'ai-hard' ? 'MINIMAX AI' : 'EASY BOT';
  };

  return (
    <div className="w-full flex flex-col gap-2.5 px-4 pt-2">
      {/* Top Utility Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            playClickSound(config.soundEnabled);
            onBackToMenu();
          }}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
          title="Back to Mode Selection"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">MENU</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-orbitron font-bold tracking-wider text-slate-300 flex items-center gap-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>{getModeLabel()}</span>
          </div>

          {stats.currentStreak > 1 && (
            <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-[10px] font-bold text-amber-300 flex items-center gap-1">
              <Flame className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{stats.currentStreak}x</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onToggleSound();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
            title={config.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {config.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onOpenStats();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-yellow-400 hover:bg-yellow-950/30 transition-all cursor-pointer"
            title="Achievements"
          >
            <Trophy className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onOpenRules();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onReset();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Reset Board"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3-Part Sleek HUD Scoreboard */}
      <div className="grid grid-cols-3 gap-2 w-full">
        {/* Player X HUD Box */}
        <div
          className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col items-center relative overflow-hidden backdrop-blur-md ${
            isPlayerXTurn
              ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_15px_rgba(0,240,255,0.35)]'
              : 'bg-slate-900/40 border-slate-800/80 opacity-80'
          }`}
        >
          {isPlayerXTurn && (
            <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          )}
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            <User className="w-3 h-3 text-cyan-400" />
            <span className="truncate max-w-[70px]">
              {config.mode.startsWith('ai') && config.playerSymbol === 'X' ? 'YOU (X)' : 'PLAYER X'}
            </span>
          </div>
          <span className="text-2xl font-black font-orbitron text-cyan-400 glow-cyan-text mt-0.5">
            {stats.winsX}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">WINS</span>
        </div>

        {/* Center Draws & Round Box */}
        <div className="p-2.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex flex-col items-center justify-center backdrop-blur-md">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 font-orbitron">
            ROUND {stats.totalGames + 1}
          </span>
          <span className="text-2xl font-black font-orbitron text-amber-400 glow-gold-text mt-0.5">
            {stats.draws}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">DRAWS</span>
        </div>

        {/* Player O / AI HUD Box */}
        <div
          className={`p-2.5 rounded-2xl border transition-all duration-300 flex flex-col items-center relative overflow-hidden backdrop-blur-md ${
            isPlayerOTurn
              ? 'bg-slate-900/90 border-pink-500 shadow-[0_0_15px_rgba(255,0,127,0.35)]'
              : 'bg-slate-900/40 border-slate-800/80 opacity-80'
          }`}
        >
          {isPlayerOTurn && (
            <div className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
          )}
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
            {config.mode.startsWith('ai') ? (
              <Bot className="w-3 h-3 text-pink-400" />
            ) : (
              <User className="w-3 h-3 text-pink-400" />
            )}
            <span className="truncate max-w-[70px]">
              {config.mode.startsWith('ai') && config.playerSymbol === 'O' ? 'YOU (O)' : getPlayer2Label()}
            </span>
          </div>
          <span className="text-2xl font-black font-orbitron text-pink-500 glow-pink-text mt-0.5">
            {stats.winsO}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">WINS</span>
        </div>
      </div>

      {/* Active Player Turn Banner with Glowing Animation */}
      <div className="w-full flex justify-center mt-0.5">
        <motion.div
          animate={{ scale: isAiThinking ? [1, 1.03, 1] : 1 }}
          transition={{ duration: 0.8, repeat: isAiThinking ? Infinity : 0 }}
          className={`px-4 py-1.5 rounded-full border text-xs font-orbitron font-bold flex items-center gap-2 shadow-md ${
            isPlayerXTurn
              ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-cyan-950/50'
              : 'bg-pink-950/70 border-pink-500/50 text-pink-300 shadow-pink-950/50'
          }`}
        >
          {isAiThinking ? (
            <>
              <Zap className="w-3.5 h-3.5 text-pink-400 animate-spin" />
              <span className="tracking-wider">AI IS CALCULATING MOVE...</span>
            </>
          ) : (
            <>
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlayerXTurn ? 'bg-cyan-400 shadow-[0_0_8px_#00F0FF]' : 'bg-pink-500 shadow-[0_0_8px_#FF007F]'
                } animate-pulse`}
              />
              <span className="tracking-wider">
                {config.mode.startsWith('ai') && currentPlayer === config.aiSymbol
                  ? 'AI TURN'
                  : `${currentPlayer === 'X' ? 'PLAYER X' : 'PLAYER O'}'S MOVE`}
              </span>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
