import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Undo2,
  Sliders,
  Hand,
} from 'lucide-react';
import { Game2048Stats } from '../../types';
import {
  playClickSound,
  playMergeSound,
  playWinSound,
  triggerHaptic,
} from '../../utils/audio';
import { fireWinnerConfetti } from '../../utils/confetti';
import { CyberDPad, DPadDirection, DPadLayoutMode } from '../CyberDPad';

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
  const [controlMode, setControlMode] = useState<'swipe' | 'wheel' | 'split-bar'>('swipe');
  const [activeSwipeIndicator, setActiveSwipeIndicator] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeIndicatorTimerRef = useRef<number | null>(null);

  const flashSwipeIndicator = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    setActiveSwipeIndicator(dir);
    if (swipeIndicatorTimerRef.current) clearTimeout(swipeIndicatorTimerRef.current);
    swipeIndicatorTimerRef.current = window.setTimeout(() => {
      setActiveSwipeIndicator(null);
    }, 120);
  }, []);

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

  // Check if any valid moves remain
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

  // Find max tile on board
  const getMaxTile = (currentBoard: Board2048): number => {
    let max = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] > max) max = currentBoard[r][c];
      }
    }
    return max;
  };

  // Move Logic
  const move = useCallback(
    (direction: DPadDirection) => {
      if (isGameOver) return;

      let rotated = false;
      let rotatedBoard = board.map((row) => [...row]);

      const rotateClockwise = (matrix: Board2048): Board2048 => {
        const N = matrix.length;
        const res = createEmptyBoard();
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            res[c][N - 1 - r] = matrix[r][c];
          }
        }
        return res;
      };

      if (direction === 'RIGHT') {
        rotatedBoard = rotateClockwise(rotateClockwise(rotatedBoard));
        rotated = true;
      } else if (direction === 'UP') {
        rotatedBoard = rotateClockwise(rotateClockwise(rotateClockwise(rotatedBoard)));
        rotated = true;
      } else if (direction === 'DOWN') {
        rotatedBoard = rotateClockwise(rotatedBoard);
        rotated = true;
      }

      let moved = false;
      let gainedScore = 0;
      const newGrid = createEmptyBoard();

      for (let r = 0; r < 4; r++) {
        const filtered = rotatedBoard[r].filter((val) => val !== 0);
        const newRow: number[] = [];
        let skip = false;

        for (let i = 0; i < filtered.length; i++) {
          if (skip) {
            skip = false;
            continue;
          }
          if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
            const mergedVal = filtered[i] * 2;
            newRow.push(mergedVal);
            gainedScore += mergedVal;
            skip = true;
          } else {
            newRow.push(filtered[i]);
          }
        }

        while (newRow.length < 4) {
          newRow.push(0);
        }

        for (let c = 0; c < 4; c++) {
          newGrid[r][c] = newRow[c];
          if (newGrid[r][c] !== rotatedBoard[r][c]) {
            moved = true;
          }
        }
      }

      let finalBoard = newGrid;
      if (direction === 'RIGHT') {
        finalBoard = rotateClockwise(rotateClockwise(finalBoard));
      } else if (direction === 'UP') {
        finalBoard = rotateClockwise(finalBoard);
      } else if (direction === 'DOWN') {
        finalBoard = rotateClockwise(rotateClockwise(rotateClockwise(finalBoard)));
      }

      if (moved) {
        setPrevBoard(board);
        setPrevScore(score);

        const boardWithTile = addRandomTile(finalBoard);
        const newScore = score + gainedScore;
        setBoard(boardWithTile);
        setScore(newScore);

        triggerHaptic(gainedScore > 0 ? 'medium' : 'light');
        if (gainedScore > 0) {
          playMergeSound(gainedScore, soundEnabled);
        }

        const maxTile = getMaxTile(boardWithTile);
        if (maxTile >= 2048 && !hasWon2048) {
          setHasWon2048(true);
          playWinSound(soundEnabled);
          fireWinnerConfetti();
        }

        const over = checkGameOver(boardWithTile);
        if (over) {
          setIsGameOver(true);
        }

        onUpdateStats((prev) => ({
          highScore: Math.max(prev.highScore, newScore),
          totalGames: over ? prev.totalGames + 1 : prev.totalGames,
          bestTile: Math.max(prev.bestTile || 0, maxTile),
        }));
      }
    },
    [board, hasWon2048, isGameOver, onUpdateStats, score, soundEnabled]
  );

  // Undo move
  const undoMove = () => {
    if (!prevBoard) return;
    playClickSound(soundEnabled);
    triggerHaptic('light');
    setBoard(prevBoard);
    setScore(prevScore);
    setPrevBoard(null);
    setIsGameOver(false);
  };

  // Restart game
  const restartGame = () => {
    playClickSound(soundEnabled);
    triggerHaptic('medium');
    setBoard(createInitialBoard());
    setScore(0);
    setPrevBoard(null);
    setIsGameOver(false);
    setHasWon2048(false);
  };

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

  // Touch Swipe Gesture Handling with Ultra-Fast Zero-Lag Sensitivity
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const SWIPE_THRESHOLD = 8; // Ultra-fast micro-flick detection

    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      if (absX > absY) {
        const dir = deltaX > 0 ? 'RIGHT' : 'LEFT';
        move(dir);
        flashSwipeIndicator(dir);
      } else {
        const dir = deltaY > 0 ? 'DOWN' : 'UP';
        move(dir);
        flashSwipeIndicator(dir);
      }
      // Re-anchor to current finger point for instant continuous chaining
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
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
        return 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_25px_#00F0FF] border-white';
      case 2048:
        return 'bg-amber-400 text-slate-950 font-black shadow-[0_0_30px_#F59E0B] border-white animate-pulse';
      default:
        return 'bg-slate-950/60 border-slate-800 text-transparent';
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full max-h-full flex-1 flex flex-col justify-between p-2 sm:p-3 relative overflow-hidden bg-slate-950 touch-none select-none overscroll-none"
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -right-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="shrink-0 w-full flex items-center justify-between z-10">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>HUB</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[10px] font-orbitron text-amber-300 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#F59E0B]" />
            <span>NEON 2048</span>
          </div>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setControlMode((prev) =>
                prev === 'swipe' ? 'wheel' : prev === 'wheel' ? 'split-bar' : 'swipe'
              );
            }}
            className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 text-[10px] font-orbitron font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            title="Toggle Control Style (Swipe / D-Pad)"
          >
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>{controlMode === 'swipe' ? 'SWIPE (BIG)' : controlMode === 'wheel' ? 'D-PAD' : 'BAR'}</span>
          </button>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-amber-400 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Compact Score HUD */}
      <div className="shrink-0 grid grid-cols-2 gap-2 w-full my-0.5 z-10">
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">SCORE</span>
          <span className="text-lg font-black font-orbitron text-cyan-400 leading-tight">
            {score}
          </span>
        </div>

        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
            <Trophy className="w-2.5 h-2.5" />
            BEST
          </span>
          <span className="text-lg font-black font-orbitron text-amber-300 leading-tight">
            {stats.highScore}
          </span>
        </div>
      </div>

      {/* 4x4 2048 Grid Matrix (Expands dynamically in Swipe Mode) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full aspect-square mx-auto bg-slate-900/90 p-2 rounded-2xl border-2 border-slate-800/90 shadow-[0_0_25px_rgba(0,0,0,0.5)] grid grid-cols-4 gap-1.5 relative z-10 select-none shrink-0 transition-all duration-200 ${
          controlMode === 'swipe'
            ? 'max-w-[min(355px,53vh)] gap-2'
            : 'max-w-[min(270px,35vh)] gap-1.5'
        }`}
      >
        {/* Directional Flash Visual Feedback on Zero-Lag Swipe */}
        {activeSwipeIndicator && (
          <div
            className={`absolute inset-0 pointer-events-none z-25 border-2 rounded-2xl transition-all duration-100 ${
              activeSwipeIndicator === 'UP'
                ? 'border-t-4 border-t-amber-300 bg-gradient-to-b from-amber-500/20 to-transparent shadow-[0_0_20px_#F59E0B]'
                : activeSwipeIndicator === 'DOWN'
                ? 'border-b-4 border-b-amber-300 bg-gradient-to-t from-amber-500/20 to-transparent shadow-[0_0_20px_#F59E0B]'
                : activeSwipeIndicator === 'LEFT'
                ? 'border-l-4 border-l-amber-300 bg-gradient-to-r from-amber-500/20 to-transparent shadow-[0_0_20px_#F59E0B]'
                : 'border-r-4 border-r-amber-300 bg-gradient-to-l from-amber-500/20 to-transparent shadow-[0_0_20px_#F59E0B]'
            }`}
          />
        )}

        {board.map((row, r) =>
          row.map((val, c) => (
            <div
              key={`${r}-${c}`}
              className={`w-full h-full rounded-xl border flex items-center justify-center font-orbitron font-black text-base transition-all duration-100 will-change-transform ${getTileStyle(
                val
              )} ${val > 0 ? 'scale-100' : 'scale-95 opacity-50'}`}
            >
              {val > 0 ? (
                <span className={val >= 1024 ? 'text-xs' : val >= 128 ? 'text-sm' : 'text-base font-black'}>
                  {val}
                </span>
              ) : null}
            </div>
          ))
        )}

        {/* Game Over Modal */}
        {isGameOver && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-3 z-30">
            <h3 className="text-lg font-black font-orbitron text-white">NO MORE MOVES</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Final Score: <strong className="text-cyan-400 font-orbitron">{score}</strong></p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={restartGame}
                className="px-3.5 py-1.5 bg-amber-500 text-slate-950 font-orbitron font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.5)]"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RETRY</span>
              </button>
              {prevBoard && (
                <button
                  onClick={undoMove}
                  className="px-3.5 py-1.5 bg-slate-800 text-slate-200 font-orbitron font-bold text-xs rounded-xl flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="w-3 h-3" />
                  <span>UNDO</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Large Board Swipe HUD or Cyber D-Pad */}
      {controlMode === 'swipe' ? (
        <div className="w-full flex items-center justify-between px-2 pt-1 pb-0.5 z-10">
          <button
            onClick={undoMove}
            disabled={!prevBoard}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              prevBoard
                ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:text-white shadow-sm'
                : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed opacity-50'
            }`}
          >
            <Undo2 className="w-3 h-3" />
            <span>UNDO</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800/80 text-[10px] font-orbitron text-slate-400 font-bold shadow-inner">
            <Hand className="w-3 h-3 text-amber-400 animate-pulse" />
            <span className="text-amber-400 font-bold">SWIPE ANYWHERE</span>
          </div>

          <button
            onClick={restartGame}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-orbitron text-[10px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3 h-3 text-amber-400" />
            <span>RESET</span>
          </button>
        </div>
      ) : (
        <div className="w-full flex items-center justify-between px-1 pt-1 z-10">
          <div className="flex flex-col gap-1.5">
            <button
              onClick={restartGame}
              className="p-1.5 px-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-[10px] font-orbitron font-bold"
              title="Restart"
            >
              <RotateCcw className="w-3 h-3" />
              <span>RESET</span>
            </button>
            <button
              onClick={undoMove}
              disabled={!prevBoard}
              className={`p-1.5 px-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 text-[10px] font-orbitron font-bold ${
                prevBoard
                  ? 'bg-slate-900 border-slate-800 text-cyan-400 hover:text-white'
                  : 'bg-slate-950 border-slate-900 text-slate-700 cursor-not-allowed'
              }`}
              title="Undo Move"
            >
              <Undo2 className="w-3 h-3" />
              <span>UNDO</span>
            </button>
          </div>

          {/* Tactile D-Pad / Split-Bar */}
          <div className="flex-1 flex justify-center">
            <CyberDPad
              onDirection={(dir: DPadDirection) => move(dir)}
              soundEnabled={soundEnabled}
              theme="amber"
              layoutMode={controlMode as DPadLayoutMode}
              onToggleLayoutMode={() =>
                setControlMode((prev) => (prev === 'wheel' ? 'split-bar' : 'wheel'))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
};
