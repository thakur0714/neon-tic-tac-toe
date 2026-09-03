import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RotateCcw, Home, Scale, Zap, Loader2, Sparkles } from 'lucide-react';
import { GameConfig, GameStats, Player, WinResult } from '../types';
import { playClickSound, triggerHaptic } from '../utils/audio';

interface WinnerModalProps {
  isOpen: boolean;
  winResult: WinResult;
  config: GameConfig;
  stats: GameStats;
  onPlayAgain: () => void;
  onCancelRematch?: () => void;
  onMainMenu: () => void;
  onOpenStats: () => void;
  isOnlineMultiplayer?: boolean;
  onlineRole?: 'host' | 'client' | null;
  isRematchRequestedByMe?: boolean;
  isRematchRequestedByOpponent?: boolean;
  nextStartingPlayer?: Player;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  isOpen,
  winResult,
  config,
  stats,
  onPlayAgain,
  onCancelRematch,
  onMainMenu,
  onOpenStats,
  isOnlineMultiplayer = false,
  onlineRole = null,
  isRematchRequestedByMe = false,
  isRematchRequestedByOpponent = false,
  nextStartingPlayer = 'X',
}) => {
  if (!isOpen) return null;

  const isDraw = winResult.winner === 'draw';
  const winner = winResult.winner as Player;

  const myToken: Player = onlineRole === 'client' ? 'O' : 'X';
  const isUserWinner =
    isOnlineMultiplayer
      ? winner === myToken
      : config.mode.startsWith('ai')
      ? winner === config.playerSymbol
      : winner === 'X';

  const isOpponentWinner = isOnlineMultiplayer && !isDraw && winner !== null && winner !== myToken;
  const isAiWinner =
    !isOnlineMultiplayer && config.mode.startsWith('ai') && winner === config.aiSymbol;

  // Title generation
  let title = '';
  let subtitle = '';

  if (isDraw) {
    title = 'EPIC DRAW!';
    subtitle = 'A flawless clash of equal minds. Neither side gave ground.';
  } else if (isOnlineMultiplayer) {
    if (isUserWinner) {
      title = 'YOU WON THE MATCH!';
      subtitle = 'Brilliant strategy! You outmaneuvered your opponent.';
    } else {
      title = 'OPPONENT WON!';
      subtitle = 'Tough battle! Gear up for the rematch to take the lead.';
    }
  } else if (isUserWinner) {
    title = 'VICTORY IS YOURS!';
    subtitle =
      config.mode === 'ai-hard'
        ? 'Incredible! You outsmarted the Unbeatable Minimax AI!'
        : 'Superb tactics! You claimed the round with authority.';
  } else if (isAiWinner) {
    title = 'AI CLAIMS VICTORY!';
    subtitle =
      config.mode === 'ai-hard'
        ? 'The Minimax algorithm computed every variation with ruthless precision.'
        : 'The bot caught you off guard! Ready for a comeback?';
  } else {
    // Local PvP
    title = `PLAYER ${winner} WINS!`;
    subtitle = `Player ${winner} dominated the arena with a decisive 3-in-a-row strike.`;
  }

  // Next Round Turn Description
  const isMyNextTurn = isOnlineMultiplayer
    ? nextStartingPlayer === myToken
    : !config.mode.startsWith('ai')
    ? true
    : nextStartingPlayer === config.playerSymbol;

  const getNextTurnLabel = () => {
    if (isOnlineMultiplayer) {
      return isMyNextTurn
        ? `YOU GO FIRST (${myToken})`
        : `OPPONENT GOES FIRST (${myToken === 'X' ? 'O' : 'X'})`;
    }
    if (config.mode.startsWith('ai')) {
      return nextStartingPlayer === config.playerSymbol
        ? `YOU GO FIRST (${config.playerSymbol})`
        : `AI GOES FIRST (${config.aiSymbol})`;
    }
    return `PLAYER ${nextStartingPlayer} GOES FIRST`;
  };

  const handlePlayAgain = () => {
    if (isRematchRequestedByMe) return; // already waiting
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
            className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-lg border transform transition-transform ${
              isDraw
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-400'
                : winner === 'X'
                ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-400'
                : 'bg-pink-500/20 border-pink-400/60 text-pink-500'
            }`}
          >
            {isDraw ? (
              <Scale className="w-8 h-8" />
            ) : (
              <Trophy className="w-8 h-8 drop-shadow-md" />
            )}
          </div>

          {/* Winner Token Indicator if not draw */}
          {!isDraw && (
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] uppercase tracking-widest font-orbitron font-bold text-slate-400">
                ROUND WINNER
              </span>
              <span
                className={`text-xs font-black font-orbitron px-2 py-0.5 rounded-md border ${
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
          <h2 className="text-xl font-black font-orbitron tracking-wide text-white mb-1">
            {title}
          </h2>

          <p className="text-xs text-slate-300 max-w-[260px] leading-relaxed mb-3">
            {subtitle}
          </p>

          {/* Mini Score Pill */}
          <div className="w-full grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-950/70 border border-slate-800 mb-3">
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold">
                {isOnlineMultiplayer ? (onlineRole === 'host' ? 'YOU (X)' : 'OPP (X)') : 'X WINS'}
              </span>
              <span className="text-sm font-black font-orbitron text-cyan-400">{stats.winsX}</span>
            </div>
            <div className="flex flex-col items-center border-x border-slate-800">
              <span className="text-[9px] text-slate-400 font-bold">DRAWS</span>
              <span className="text-sm font-black font-orbitron text-amber-400">{stats.draws}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-bold">
                {isOnlineMultiplayer ? (onlineRole === 'client' ? 'YOU (O)' : 'OPP (O)') : 'O WINS'}
              </span>
              <span className="text-sm font-black font-orbitron text-pink-500">{stats.winsO}</span>
            </div>
          </div>

          {/* ⚡ NEXT ROUND FIRST TURN CLARITY BADGE */}
          <div
            className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between mb-4 ${
              isMyNextTurn
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-950/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-left">
              <Zap className={`w-3.5 h-3.5 ${isMyNextTurn ? 'text-emerald-400 fill-emerald-400' : 'text-amber-400'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  NEXT ROUND 1ST MOVE:
                </span>
                <span className="text-[11px] font-black font-orbitron">
                  {getNextTurnLabel()}
                </span>
              </div>
            </div>
            <span
              className={`text-[10px] font-orbitron font-bold px-2 py-0.5 rounded-full border ${
                isMyNextTurn
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {isMyNextTurn ? 'YOUR TURN' : 'WAIT'}
            </span>
          </div>

          {/* Rematch Opponent Notification */}
          {isRematchRequestedByOpponent && !isRematchRequestedByMe && (
            <div className="w-full mb-2.5 py-1 px-3 rounded-lg bg-pink-500/20 border border-pink-400/50 text-pink-300 text-[11px] font-orbitron font-bold animate-pulse flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>OPPONENT WANTS A REMATCH!</span>
            </div>
          )}

          {/* Primary Action Button: Play Again */}
          <div className="w-full flex flex-col gap-2">
            <motion.button
              whileHover={{ scale: isRematchRequestedByMe ? 1 : 1.02 }}
              whileTap={{ scale: isRematchRequestedByMe ? 1 : 0.96 }}
              onClick={handlePlayAgain}
              disabled={isRematchRequestedByMe}
              className={`w-full py-3 px-5 rounded-xl font-black font-orbitron text-xs tracking-wider flex items-center justify-center gap-2 border cursor-pointer transition-all ${
                isRematchRequestedByMe
                  ? 'bg-slate-800/80 border-slate-700 text-cyan-400 cursor-not-allowed opacity-80'
                  : isRematchRequestedByOpponent
                  ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-slate-950 border-emerald-200/60 shadow-[0_0_20px_rgba(52,211,153,0.5)] animate-bounce'
                  : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-slate-950 shadow-[0_0_20px_rgba(0,240,255,0.4)] border-cyan-200/60'
              }`}
            >
              {isRematchRequestedByMe ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>WAITING FOR OPPONENT...</span>
                </>
              ) : isRematchRequestedByOpponent ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
                  <span>ACCEPT REMATCH & START</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5 stroke-[3]" />
                  <span>PLAY AGAIN</span>
                </>
              )}
            </motion.button>

            {isRematchRequestedByMe && onCancelRematch && (
              <button
                onClick={onCancelRematch}
                className="w-full py-2.5 px-5 rounded-xl bg-slate-800/80 hover:bg-rose-900/40 border border-slate-700 hover:border-rose-500/50 text-rose-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>✕ CANCEL REMATCH REQUEST</span>
              </button>
            )}

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

