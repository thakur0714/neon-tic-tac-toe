import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Play,
  Pause,
  Sparkles,
  ShieldAlert,
  Sliders,
  Hand,
} from 'lucide-react';
import { Point, SnakeDifficulty, SnakeFood, SnakeStats } from '../../types';
import {
  playClickSound,
  playCrashSound,
  playEatSound,
  playWinSound,
  triggerHaptic,
} from '../../utils/audio';
import { fireWinnerConfetti } from '../../utils/confetti';
import { CyberDPad, DPadDirection, DPadLayoutMode } from '../CyberDPad';

interface CyberSnakeProps {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  stats: SnakeStats;
  onUpdateStats: (newStats: SnakeStats | ((prev: SnakeStats) => SnakeStats)) => void;
}

const GRID_SIZE = 16;
const INITIAL_SNAKE: Point[] = [
  { x: 8, y: 8 },
  { x: 8, y: 9 },
  { x: 8, y: 10 },
];
const INITIAL_DIR: Point = { x: 0, y: -1 }; // UP

const SPEED_MAP: Record<SnakeDifficulty, number> = {
  easy: 140,
  medium: 100,
  hard: 70,
};

export const CyberSnake: React.FC<CyberSnakeProps> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
  stats,
  onUpdateStats,
}) => {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIR);
  const [nextDirection, setNextDirection] = useState<Point>(INITIAL_DIR);
  const [food, setFood] = useState<SnakeFood>({ x: 8, y: 4, type: 'regular', points: 10 });
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [applesEaten, setApplesEaten] = useState(0);
  const [difficulty, setDifficulty] = useState<SnakeDifficulty>('medium');
  const [isWallWrapping, setIsWallWrapping] = useState(false);
  const [controlMode, setControlMode] = useState<'swipe' | 'wheel' | 'split-bar'>('swipe');
  const [activeSwipeIndicator, setActiveSwipeIndicator] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null>(null);

  const [gameState, setGameState] = useState<'idle' | 'running' | 'paused' | 'gameover'>('idle');
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeIndicatorTimerRef = useRef<number | null>(null);

  const flashSwipeIndicator = useCallback((dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    setActiveSwipeIndicator(dir);
    triggerHaptic('light');
    if (swipeIndicatorTimerRef.current) clearTimeout(swipeIndicatorTimerRef.current);
    swipeIndicatorTimerRef.current = window.setTimeout(() => {
      setActiveSwipeIndicator(null);
    }, 120);
  }, []);

  // Generate food avoiding snake body
  const spawnFood = useCallback(
    (currentSnake: Point[]): SnakeFood => {
      let newX = Math.floor(Math.random() * GRID_SIZE);
      let newY = Math.floor(Math.random() * GRID_SIZE);

      let attempts = 0;
      while (
        currentSnake.some((segment) => segment.x === newX && segment.y === newY) &&
        attempts < 100
      ) {
        newX = Math.floor(Math.random() * GRID_SIZE);
        newY = Math.floor(Math.random() * GRID_SIZE);
        attempts++;
      }

      const rand = Math.random();
      if (rand > 0.85) {
        return { x: newX, y: newY, type: 'special', points: 30 };
      } else if (rand > 0.7) {
        return { x: newX, y: newY, type: 'speed', points: 20 };
      }
      return { x: newX, y: newY, type: 'regular', points: 10 };
    },
    []
  );

  // Start / Restart game
  const startGame = () => {
    playClickSound(soundEnabled);
    triggerHaptic('medium');
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIR);
    setNextDirection(INITIAL_DIR);
    setScore(0);
    setMultiplier(1);
    setApplesEaten(0);
    setIsNewHighScore(false);
    setFood(spawnFood(INITIAL_SNAKE));
    setGameState('running');
  };

  // Pause toggle
  const togglePause = () => {
    playClickSound(soundEnabled);
    setGameState((prev) => (prev === 'running' ? 'paused' : prev === 'paused' ? 'running' : prev));
  };

  // Turn directional logic
  const changeDirection = useCallback(
    (newDir: Point) => {
      if (gameState === 'idle') {
        setGameState('running');
      }
      // Prevent 180-degree instant reversal
      if (direction.x + newDir.x === 0 && direction.y + newDir.y === 0) {
        return;
      }
      setNextDirection(newDir);
    },
    [direction, gameState]
  );

  // Handle Game Over
  const handleGameOver = useCallback(
    (finalLength: number, finalScore: number) => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      setGameState('gameover');
      playCrashSound(soundEnabled);
      triggerHaptic('heavy');

      const isHigh = finalScore > stats.highScore;
      if (isHigh) {
        setIsNewHighScore(true);
        playWinSound(soundEnabled);
        fireWinnerConfetti();
      }

      onUpdateStats((prev) => ({
        highScore: Math.max(prev.highScore, finalScore),
        totalApples: (prev.totalApples || 0) + applesEaten,
        totalGames: prev.totalGames + 1,
        highestLength: Math.max(prev.highestLength || 0, finalLength),
      }));
    },
    [applesEaten, onUpdateStats, soundEnabled, stats.highScore]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: 0, y: -1 });
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: 0, y: 1 });
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: -1, y: 0 });
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        changeDirection({ x: 1, y: 0 });
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        } else {
          togglePause();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, gameState]);

  // Touch Swipe Gesture on Canvas & Container with Ultra-Fast Zero-Lag Sensitivity
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

    // Ultra-fast 8px swipe threshold for instant zero-lag response
    const SWIPE_THRESHOLD = 8;

    if (absX > SWIPE_THRESHOLD || absY > SWIPE_THRESHOLD) {
      if (absX > absY) {
        if (deltaX > 0) {
          changeDirection({ x: 1, y: 0 });
          flashSwipeIndicator('RIGHT');
        } else {
          changeDirection({ x: -1, y: 0 });
          flashSwipeIndicator('LEFT');
        }
      } else {
        if (deltaY > 0) {
          changeDirection({ x: 0, y: 1 });
          flashSwipeIndicator('DOWN');
        } else {
          changeDirection({ x: 0, y: -1 });
          flashSwipeIndicator('UP');
        }
      }
      // Re-anchor to current finger position for smooth continuous steering without lifting
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
  };

  // Game Loop Tick
  useEffect(() => {
    if (gameState !== 'running') {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    const intervalTime = SPEED_MAP[difficulty];

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        setDirection(nextDirection);

        let nextX = head.x + nextDirection.x;
        let nextY = head.y + nextDirection.y;

        // Wall collision check or wrap
        if (isWallWrapping) {
          nextX = (nextX + GRID_SIZE) % GRID_SIZE;
          nextY = (nextY + GRID_SIZE) % GRID_SIZE;
        } else {
          if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
            handleGameOver(prevSnake.length, score);
            return prevSnake;
          }
        }

        // Self collision check
        if (prevSnake.slice(0, -1).some((seg) => seg.x === nextX && seg.y === nextY)) {
          handleGameOver(prevSnake.length, score);
          return prevSnake;
        }

        const newHead = { x: nextX, y: nextY };
        const newSnake = [newHead, ...prevSnake];

        // Check if ate food
        if (nextX === food.x && nextY === food.y) {
          const earned = food.points * multiplier;
          const newScore = score + earned;
          setScore(newScore);
          setApplesEaten((prev) => prev + 1);

          playEatSound(food.type !== 'regular', soundEnabled);
          triggerHaptic('light');

          if (food.type === 'special') {
            setMultiplier((m) => Math.min(m + 1, 4));
          }

          setFood(spawnFood(newSnake));
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    gameLoopRef.current = window.setInterval(moveSnake, intervalTime);
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [
    difficulty,
    food,
    gameState,
    handleGameOver,
    isWallWrapping,
    multiplier,
    nextDirection,
    score,
    soundEnabled,
    spawnFood,
  ]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="h-full max-h-full flex-1 flex flex-col justify-between p-2 sm:p-3 relative overflow-hidden bg-slate-950 touch-none select-none overscroll-none"
    >
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="shrink-0 w-full flex items-center justify-between z-10 mb-2">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>HUB</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-orbitron text-emerald-300 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span>CYBER SNAKE</span>
          </div>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setControlMode((prev) =>
                prev === 'swipe' ? 'wheel' : prev === 'wheel' ? 'split-bar' : 'swipe'
              );
            }}
            className="px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-emerald-300 text-[10px] font-orbitron font-bold flex items-center gap-1 cursor-pointer transition-all shadow-sm"
            title="Toggle Control Style (Swipe / D-Pad)"
          >
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span>{controlMode === 'swipe' ? 'SWIPE (BIG)' : controlMode === 'wheel' ? 'D-PAD' : 'BAR'}</span>
          </button>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Compact HUD Scoreboard */}
      <div className="shrink-0 grid grid-cols-3 gap-1.5 w-full mb-2 z-10">
        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">SCORE</span>
          <span className="text-lg font-black font-orbitron text-emerald-400 leading-tight">
            {score}
          </span>
        </div>

        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-0.5">
            <Trophy className="w-2.5 h-2.5" />
            BEST
          </span>
          <span className="text-lg font-black font-orbitron text-amber-300 leading-tight">
            {stats.highScore}
          </span>
        </div>

        <div className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">LENGTH</span>
          <span className="text-lg font-black font-orbitron text-cyan-400 leading-tight">
            {snake.length}
          </span>
        </div>
      </div>

      {/* Main Responsive Snake Canvas Area (Expands to Large Size in Swipe Mode) */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full aspect-square mx-auto relative bg-slate-950/90 rounded-2xl border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)] overflow-hidden flex items-center justify-center select-none shrink-0 transition-all duration-200 ${
          controlMode === 'swipe'
            ? 'max-w-[min(355px,53vh)]'
            : 'max-w-[min(270px,35vh)]'
        }`}
      >
        {/* Subtle Cyber Grid Background */}
        <div className="absolute inset-0 grid grid-cols-16 grid-rows-16 pointer-events-none opacity-25">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-emerald-500/20" />
          ))}
        </div>

        {/* Directional Flash Visual Feedback on Zero-Lag Swipe */}
        {activeSwipeIndicator && (
          <div
            className={`absolute inset-0 pointer-events-none z-25 border-2 rounded-2xl transition-all duration-100 ${
              activeSwipeIndicator === 'UP'
                ? 'border-t-4 border-t-emerald-300 bg-gradient-to-b from-emerald-500/20 to-transparent shadow-[0_0_20px_#10B981]'
                : activeSwipeIndicator === 'DOWN'
                ? 'border-b-4 border-b-emerald-300 bg-gradient-to-t from-emerald-500/20 to-transparent shadow-[0_0_20px_#10B981]'
                : activeSwipeIndicator === 'LEFT'
                ? 'border-l-4 border-l-emerald-300 bg-gradient-to-r from-emerald-500/20 to-transparent shadow-[0_0_20px_#10B981]'
                : 'border-r-4 border-r-emerald-300 bg-gradient-to-l from-emerald-500/20 to-transparent shadow-[0_0_20px_#10B981]'
            }`}
          />
        )}

        {/* Snake Body Rendering (Optimized with standard GPU-accelerated div for 60fps mobile execution) */}
        {snake.map((segment, idx) => {
          const isHead = idx === 0;
          return (
            <div
              key={`${segment.x}-${segment.y}-${idx}`}
              className={`absolute transition-all duration-75 will-change-transform ${
                isHead
                  ? 'bg-emerald-400 shadow-[0_0_12px_#10B981] z-20 border border-white'
                  : 'bg-emerald-500/80 border border-emerald-400/40 z-10'
              }`}
              style={{
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                left: `${(segment.x * 100) / GRID_SIZE}%`,
                top: `${(segment.y * 100) / GRID_SIZE}%`,
                borderRadius: isHead ? '4px' : '2px',
                opacity: Math.max(0.4, 1 - (idx / snake.length) * 0.6),
              }}
            >
              {isHead && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-950 shadow-inner" />
                </div>
              )}
            </div>
          );
        })}

        {/* Food Rendering */}
        <div
          className={`absolute rounded-full z-15 flex items-center justify-center animate-pulse ${
            food.type === 'special'
              ? 'bg-amber-400 shadow-[0_0_15px_#F59E0B]'
              : food.type === 'speed'
              ? 'bg-pink-500 shadow-[0_0_15px_#EC4899]'
              : 'bg-cyan-400 shadow-[0_0_12px_#00F0FF]'
          }`}
          style={{
            width: `${100 / GRID_SIZE - 1}%`,
            height: `${100 / GRID_SIZE - 1}%`,
            left: `${(food.x * 100) / GRID_SIZE + 0.5}%`,
            top: `${(food.y * 100) / GRID_SIZE + 0.5}%`,
          }}
        >
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>

        {/* Start / Idle Overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-3 z-30">
            <Sparkles className="w-8 h-8 text-emerald-400 mb-1 animate-bounce" />
            <h3 className="text-lg font-black font-orbitron text-white text-center">CYBER SNAKE</h3>
            <p className="text-[11px] text-slate-400 text-center mt-0.5 mb-2.5">
              Swipe anywhere on screen with instant zero-lag response
            </p>

            {/* Difficulty Selector */}
            <div className="flex items-center gap-1 mb-3 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['easy', 'medium', 'hard'] as SnakeDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setDifficulty(d);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[9px] font-orbitron font-bold uppercase transition-all cursor-pointer ${
                    difficulty === d
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-orbitron font-black text-xs rounded-xl tracking-wider flex items-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>START GAME</span>
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
            <Pause className="w-7 h-7 text-amber-400 mb-1" />
            <h3 className="text-base font-black font-orbitron text-white">PAUSED</h3>
            <button
              onClick={togglePause}
              className="mt-2.5 px-4 py-1.5 bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs rounded-xl cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            >
              RESUME
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 z-30">
            <ShieldAlert className="w-8 h-8 text-pink-500 mb-0.5" />
            <h3 className="text-lg font-black font-orbitron text-white">SYSTEM CRASH</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Final Score: <strong className="text-emerald-400 font-orbitron">{score}</strong></p>

            {isNewHighScore && (
              <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-[9px] font-orbitron font-bold text-amber-300 flex items-center gap-1 animate-pulse">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>NEW HIGH SCORE!</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={startGame}
                className="px-3.5 py-2 bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs rounded-xl flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>REPLAY</span>
              </button>

              <button
                onClick={onBackToHub}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-orbitron font-bold text-xs rounded-xl cursor-pointer"
              >
                HUB
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Large Board Swipe HUD or Cyber D-Pad */}
      {controlMode === 'swipe' ? (
        <div className="w-full flex items-center justify-between px-2 pt-1 pb-0.5 z-10">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setIsWallWrapping(!isWallWrapping);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-orbitron font-bold transition-all cursor-pointer ${
              isWallWrapping
                ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            WRAP: {isWallWrapping ? 'ON' : 'OFF'}
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800/80 text-[10px] font-orbitron text-slate-400 font-bold shadow-inner">
            <Hand className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold">SWIPE ANYWHERE</span>
          </div>

          <div className="flex items-center gap-1.5">
            {gameState === 'running' && (
              <button
                onClick={togglePause}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-orbitron text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Pause className="w-3 h-3 text-amber-400" />
                <span>PAUSE</span>
              </button>
            )}
            {gameState !== 'running' && (
              <button
                onClick={startGame}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-orbitron text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-sm"
              >
                <RotateCcw className="w-3 h-3 text-emerald-400" />
                <span>RESET</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full flex items-center justify-between px-1 pt-1 z-10">
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                playClickSound(soundEnabled);
                setIsWallWrapping(!isWallWrapping);
              }}
              className={`px-2 py-1 rounded-xl border text-[10px] font-orbitron font-bold transition-all cursor-pointer ${
                isWallWrapping
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(0,240,255,0.3)]'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              WRAP: {isWallWrapping ? 'ON' : 'OFF'}
            </button>

            {gameState === 'running' && (
              <button
                onClick={togglePause}
                className="px-2 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-orbitron text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Pause className="w-3 h-3 text-amber-400" />
                <span>PAUSE</span>
              </button>
            )}
          </div>

          {/* Tactile D-Pad / Split-Bar */}
          <div className="flex-1 flex justify-center">
            <CyberDPad
              onDirection={(dir: DPadDirection) => {
                if (gameState === 'idle') {
                  startGame();
                }
                switch (dir) {
                  case 'UP':
                    changeDirection({ x: 0, y: -1 });
                    break;
                  case 'DOWN':
                    changeDirection({ x: 0, y: 1 });
                    break;
                  case 'LEFT':
                    changeDirection({ x: -1, y: 0 });
                    break;
                  case 'RIGHT':
                    changeDirection({ x: 1, y: 0 });
                    break;
                }
              }}
              activeDirection={
                nextDirection.y === -1
                  ? 'UP'
                  : nextDirection.y === 1
                  ? 'DOWN'
                  : nextDirection.x === -1
                  ? 'LEFT'
                  : 'RIGHT'
              }
              soundEnabled={soundEnabled}
              theme="emerald"
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
