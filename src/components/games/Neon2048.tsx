import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Undo2,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Game2048Stats } from '../../types';
import {
  playClickSound,
  playMergeSound,
  playWinSound,
  triggerHaptic,
} from '../../utils/audio';
import { fireWinnerConfetti } from '../../utils/confetti';

interface Neon2048Props {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  stats: Game2048Stats;
  onUpdateStats: (newStats: Game2048Stats | ((prev: Game2048Stats) => Game2048Stats)) => void;
}

type Board2048 = number[][];

export const Neon2048: React.FC<Neon2048Props> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
  stats,
  onUpdateStats,
}) => {
  const [board, setBoard] = useState<Board2048>(() => createInitialBoard());
  const [prevBoard, setPrevBoard] = useState<Board2048 | null>(null);
  const [prevScore, setPrevScore] = useState<number>(0);
  const [score, setScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon2048, setHasWon2048] = useState(false);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  function createEmptyBoard(): Board2048 {
    return Array(4)
      .fill(0)
      .map(() => Array(4).fill(0));
  }

  function addRandomTile(currentBoard: Board2048): Board2048 {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) emptyCells.push([r, c]);
      }
    }
    if (emptyCells.length === 0) return currentBoard;

    const [randR, randC] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const newBoard = currentBoard.map((row) => [...row]);
    newBoard[randR][randC] = Math.random() < 0.9 ? 2 : 4;
    return newBoard;
  }

  function createInitialBoard(): Board2048 {
    let b = createEmptyBoard();
    b = addRandomTile(b);
    b = addRandomTile(b);
    return b;
  }

  const restartGame = () => {
    playClickSound(soundEnabled);
    triggerHaptic('light');
    const newB = createInitialBoard();
    setBoard(newB);
    setPrevBoard(null);
    setScore(0);
    setIsGameOver(false);
    setHasWon2048(false);
  };

  const undoMove = () => {
    if (!prevBoard) return;
    playClickSound(soundEnabled);
    triggerHaptic('light');
    setBoard(prevBoard);
    setScore(prevScore);
    setPrevBoard(null);
    setIsGameOver(false);
  };

  // Check if any moves are possible
  const checkGameOver = (currentBoard: Board2048): boolean => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) return false;
        if (c < 3 && currentBoard[r][c] === currentBoard[r][c + 1]) return false;
        if (r < 3 && currentBoard[r][c] === currentBoard[r + 1][c]) return false;
      }
    }
    return true;
  };

  // Slide & Merge logic
  const move = useCallback(
    (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (isGameOver) return;

      let hasMoved = false;
      let gainedScore = 0;
      let maxMerged = 0;

      const newBoard = board.map((row) => [...row]);

      const slideRow = (row: number[]): number[] => {
        let filtered = row.filter((val) => val !== 0);
        let result: number[] = [];

        for (let i = 0; i < filtered.length; i++) {
          if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
            const mergedVal = filtered[i] * 2;
            result.push(mergedVal);
            gainedScore += mergedVal;
            maxMerged = Math.max(maxMerged, mergedVal);
            i++; // skip next
          } else {
            result.push(filtered[i]);
          }
        }

        while (result.length < 4) {
          result.push(0);
        }
        return result;
      };

      if (direction === 'LEFT') {
        for (let r = 0; r < 4; r++) {
          const original = [...newBoard[r]];
          const slided = slideRow(original);
          newBoard[r] = slided;
          if (original.some((val, idx) => val !== slided[idx])) hasMoved = true;
        }
      } else if (direction === 'RIGHT') {
        for (let r = 0; r < 4; r++) {
          const original = [...newBoard[r]];
          const reversed = [...original].reverse();
          const slided = slideRow(reversed).reverse();
          newBoard[r] = slided;
          if (original.some((val, idx) => val !== slided[idx])) hasMoved = true;
        }
      } else if (direction === 'UP') {
        for (let c = 0; c < 4; c++) {
          const original = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const slided = slideRow(original);
          for (let r = 0; r < 4; r++) {
            newBoard[r][c] = slided[r];
          }
          if (original.some((val, idx) => val !== slided[idx])) hasMoved = true;
        }
      } else if (direction === 'DOWN') {
        for (let c = 0; c < 4; c++) {
          const original = [newBoard[0][c], newBoard[1][c], newBoard[2][c], newBoard[3][c]];
          const reversed = [...original].reverse();
          const slided = slideRow(reversed).reverse();
          for (let r = 0; r < 4; r++) {
            newBoard[r][c] = slided[r];
          }
          if (original.some((val, idx) => val !== slided[idx])) hasMoved = true;
        }
      }

      if (hasMoved) {
        setPrevBoard(board);
        setPrevScore(score);

        const boardWithNewTile = addRandomTile(newBoard);
        setBoard(boardWithNewTile);

        const newScore = score + gainedScore;
        setScore(newScore);

        if (maxMerged > 0) {
          playMergeSound(maxMerged, soundEnabled);
          triggerHaptic('light');
        }

        if (maxMerged >= 2048 && !hasWon2048) {
          setHasWon2048(true);
          playWinSound(soundEnabled);
          fireWinnerConfetti();
        }

        const maxTile = Math.max(...boardWithNewTile.flat());
        onUpdateStats((prev) => ({
          highScore: Math.max(prev.highScore, newScore),
          bestTile: Math.max(prev.bestTile, maxTile),
          totalGames: prev.totalGames,
        }));

        if (checkGameOver(boardWithNewTile)) {
          setIsGameOver(true);
          triggerHaptic('heavy');
        }
      }
    },
    [board, isGameOver, score, soundEnabled, hasWon2048, onUpdateStats]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        move('UP');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        move('DOWN');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        move('LEFT');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        move('RIGHT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  // Touch Swipe Gesture Handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) return;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) move('RIGHT');
      else move('LEFT');
    } else {
      if (deltaY > 0) move('DOWN');
      else move('UP');
    }
  };

  // Color mapper for tiles
  const getTileStyle = (val: number) => {
    switch (val) {
      case 2:
        return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.3)]';
      case 4:
        return 'bg-sky-950/80 border-sky-400/60 text-sky-300 shadow-[0_0_10px_rgba(56,189,248,0.3)]';
      case 8:
        return 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]';
      case 16:
        return 'bg-amber-950/80 border-amber-500/60 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]';
      case 32:
        return 'bg-orange-950/80 border-orange-500/70 text-orange-400 shadow-[0_0_14px_rgba(249,115,22,0.4)]';
      case 64:
        return 'bg-pink-950/80 border-pink-500/70 text-pink-400 shadow-[0_0_15px_rgba(255,0,127,0.4)]';
      case 128:
        return 'bg-rose-950/90 border-rose-400 text-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.5)]';
      case 256:
        return 'bg-purple-950/90 border-purple-400 text-purple-300 shadow-[0_0_18px_rgba(168,85,247,0.5)]';
      case 512:
        return 'bg-indigo-950/90 border-indigo-400 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.6)]';
      case 1024:
        return 'bg-yellow-950/90 border-yellow-300 text-yellow-200 shadow-[0_0_22px_rgba(250,204,21,0.7)]';
      case 2048:
        return 'bg-gradient-to-br from-cyan-500 to-pink-500 border-white text-slate-950 font-black shadow-[0_0_30px_rgba(0,240,255,0.9)] animate-pulse';
      default:
        return 'bg-slate-900/60 border-slate-800 text-slate-600';
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-3.5 relative overflow-hidden bg-slate-950">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-10 pb-1">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ARCADE HUB</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] font-orbitron text-amber-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>NEON 2048</span>
          </div>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* HUD Scoreboard */}
      <div className="grid grid-cols-2 gap-2 w-full my-1 z-10">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">CURRENT SCORE</span>
          <span className="text-2xl font-black font-orbitron text-cyan-400 mt-0.5">
            {score}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            BEST SCORE
          </span>
          <span className="text-2xl font-black font-orbitron text-amber-300 mt-0.5">
            {stats.highScore}
          </span>
        </div>
      </div>

      {/* 4x4 2048 Grid Matrix */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full aspect-square max-w-[340px] mx-auto bg-slate-900/90 p-2.5 rounded-2xl border-2 border-slate-800/90 shadow-[0_0_25px_rgba(0,0,0,0.5)] grid grid-cols-4 gap-2 relative z-10 select-none"
      >
        {board.map((row, r) =>
          row.map((val, c) => (
            <motion.div
              key={`${r}-${c}-${val}`}
              initial={{ scale: val > 0 ? 0.8 : 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.15 }}
              className={`w-full h-full rounded-xl border flex items-center justify-center font-orbitron font-black text-lg transition-all ${getTileStyle(
                val
              )}`}
            >
              {val > 0 ? (
                <span className={val >= 1024 ? 'text-sm' : val >= 128 ? 'text-base' : 'text-xl'}>
                  {val}
                </span>
              ) : null}
            </motion.div>
          ))
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-4 z-30">
            <h3 className="text-xl font-black font-orbitron text-white">NO MORE MOVES</h3>
            <p className="text-xs text-slate-400 mt-1">Final Score: <strong className="text-cyan-400 font-orbitron">{score}</strong></p>
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={restartGame}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-orbitron font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RETRY</span>
              </button>
              {prevBoard && (
                <button
                  onClick={undoMove}
                  className="px-4 py-2 bg-slate-800 text-slate-200 font-orbitron font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>UNDO</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* D-Pad Arrow Controls & Utility */}
      <div className="w-full flex items-center justify-between px-2 pt-1 z-10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={restartGame}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={undoMove}
            disabled={!prevBoard}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              prevBoard
                ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:text-white'
                : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed'
            }`}
            title="Undo Move"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Direction Controls */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => move('UP')}
            className="w-10 h-8 rounded-t-xl bg-slate-900/90 active:bg-amber-500 active:text-slate-950 border border-slate-800 flex items-center justify-center text-slate-200"
            aria-label="Up"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => move('LEFT')}
              className="w-10 h-8 rounded-l-xl bg-slate-900/90 active:bg-amber-500 active:text-slate-950 border border-slate-800 flex items-center justify-center text-slate-200"
              aria-label="Left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => move('DOWN')}
              className="w-10 h-8 rounded-b-xl bg-slate-900/90 active:bg-amber-500 active:text-slate-950 border border-slate-800 flex items-center justify-center text-slate-200"
              aria-label="Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button
              onClick={() => move('RIGHT')}
              className="w-10 h-8 rounded-r-xl bg-slate-900/90 active:bg-amber-500 active:text-slate-950 border border-slate-800 flex items-center justify-center text-slate-200"
              aria-label="Right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
