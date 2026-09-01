import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Flame,
  Zap,
  Play,
  Pause,
  Sparkles,
  ShieldAlert,
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
import { CyberDPad, DPadDirection } from '../CyberDPad';

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

  const [gameState, setGameState] = useState<'idle' | 'running' | 'paused' | 'gameover'>('idle');
  const [isNewHighScore, setIsNewHighScore] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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

  const togglePause = () => {
    if (gameState === 'running') {
      playClickSound(soundEnabled);
      setGameState('paused');
    } else if (gameState === 'paused') {
      playClickSound(soundEnabled);
      setGameState('running');
    }
  };

  // Change direction with reverse-check
  const changeDirection = useCallback(
    (newDir: Point) => {
      // Prevent 180-degree immediate reversal into own body
      if (direction.x + newDir.x === 0 && direction.y + newDir.y === 0) {
        return;
      }
      setNextDirection(newDir);
    },
    [direction]
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

    if (Math.abs(deltaX) < 15 && Math.abs(deltaY) < 15) return; // Too short

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (deltaX > 0) changeDirection({ x: 1, y: 0 });
      else changeDirection({ x: -1, y: 0 });
    } else {
      // Vertical swipe
      if (deltaY > 0) changeDirection({ x: 0, y: 1 });
      else changeDirection({ x: 0, y: -1 });
    }
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
            // Hit wall
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
          // Remove tail if didn't eat
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
    gameState,
    nextDirection,
    difficulty,
    isWallWrapping,
    food,
    score,
    multiplier,
    spawnFood,
    soundEnabled,
  ]);

  // Handle Game Over
  const handleGameOver = (finalLength: number, finalScore: number) => {
    playCrashSound(soundEnabled);
    triggerHaptic('heavy');
    setGameState('gameover');

    const isNewBest = finalScore > stats.highScore;
    if (isNewBest && finalScore > 0) {
      setIsNewHighScore(true);
      playWinSound(soundEnabled);
      fireWinnerConfetti();
    }

    onUpdateStats((prev) => ({
      highScore: Math.max(prev.highScore, finalScore),
      totalGames: prev.totalGames + 1,
      highestLength: Math.max(prev.highestLength, finalLength),
      totalApples: prev.totalApples + applesEaten,
    }));
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-3.5 relative overflow-hidden bg-slate-950">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -left-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <div className="w-full flex items-center justify-between z-10 pb-1">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ARCADE HUB</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-orbitron text-emerald-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10B981]" />
            <span>CYBER SNAKE</span>
          </div>

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

      {/* HUD Scoreboard */}
      <div className="grid grid-cols-3 gap-2 w-full my-1 z-10">
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">SCORE</span>
          <span className="text-xl font-black font-orbitron text-emerald-400 mt-0.5">
            {score}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
            <Trophy className="w-2.5 h-2.5" />
            BEST
          </span>
          <span className="text-xl font-black font-orbitron text-amber-300 mt-0.5">
            {stats.highScore}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">LENGTH</span>
          <span className="text-xl font-black font-orbitron text-cyan-400 mt-0.5">
            {snake.length}
          </span>
        </div>
      </div>

      {/* Main Snake Canvas/Grid Area */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-full aspect-square max-w-[340px] mx-auto relative bg-slate-950/90 rounded-2xl border-2 border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.25)] overflow-hidden flex items-center justify-center select-none"
      >
        {/* Subtle Cyber Grid Background */}
        <div className="absolute inset-0 grid grid-cols-16 grid-rows-16 pointer-events-none opacity-25">
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
            <div key={i} className="border-[0.5px] border-emerald-500/20" />
          ))}
        </div>

        {/* Snake Body Rendering */}
        {snake.map((segment, idx) => {
          const isHead = idx === 0;
          return (
            <motion.div
              key={`${segment.x}-${segment.y}-${idx}`}
              className={`absolute rounded-sm transition-all duration-75 ${
                isHead
                  ? 'bg-emerald-400 shadow-[0_0_12px_#10B981] z-20 border border-white'
                  : 'bg-emerald-500/80 border border-emerald-400/40 z-10'
              }`}
              style={{
                width: `${100 / GRID_SIZE}%`,
                height: `${100 / GRID_SIZE}%`,
                left: `${(segment.x * 100) / GRID_SIZE}%`,
                top: `${(segment.y * 100) / GRID_SIZE}%`,
                borderRadius: isHead ? '6px' : '3px',
                opacity: Math.max(0.4, 1 - (idx / snake.length) * 0.6),
              }}
            >
              {isHead && (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-950 shadow-inner" />
                </div>
              )}
            </motion.div>
          );
        })}

        {/* Food Rendering */}
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className={`absolute rounded-full z-15 flex items-center justify-center ${
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
          <div className="w-1.5 h-1.5 bg-white rounded-full" />
        </motion.div>

        {/* Start / Idle Overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-30">
            <Sparkles className="w-10 h-10 text-emerald-400 mb-2 animate-bounce" />
            <h3 className="text-xl font-black font-orbitron text-white text-center">CYBER SNAKE</h3>
            <p className="text-xs text-slate-400 text-center mt-1 mb-4">
              Swipe or tap D-Pad to collect glowing energy cores
            </p>

            {/* Difficulty Selector */}
            <div className="flex items-center gap-1.5 mb-4 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['easy', 'medium', 'hard'] as SnakeDifficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setDifficulty(d);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-orbitron font-bold uppercase transition-all ${
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
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-orbitron font-black text-sm rounded-xl tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>START GAME</span>
            </button>
          </div>
        )}

        {/* Paused Overlay */}
        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-30">
            <Pause className="w-8 h-8 text-amber-400 mb-2" />
            <h3 className="text-lg font-black font-orbitron text-white">PAUSED</h3>
            <button
              onClick={togglePause}
              className="mt-3 px-5 py-2 bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs rounded-xl cursor-pointer"
            >
              RESUME
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-30">
            <ShieldAlert className="w-10 h-10 text-pink-500 mb-1" />
            <h3 className="text-xl font-black font-orbitron text-white">SYSTEM CRASH</h3>
            <p className="text-xs text-slate-400 mt-0.5">Final Score: <strong className="text-emerald-400 font-orbitron">{score}</strong></p>

            {isNewHighScore && (
              <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/50 text-[10px] font-orbitron font-bold text-amber-300 flex items-center gap-1 animate-pulse">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>NEW HIGH SCORE!</span>
              </div>
            )}

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={startGame}
                className="px-4 py-2.5 bg-emerald-500 text-slate-950 font-orbitron font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>REPLAY</span>
              </button>

              <button
                onClick={onBackToHub}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-orbitron font-bold text-xs rounded-xl cursor-pointer"
              >
                HUB
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cyber Virtual D-Pad for Mobile Touch Precision */}
      <div className="w-full flex items-center justify-between px-2 pt-1 z-10">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setIsWallWrapping(!isWallWrapping);
            }}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-orbitron font-bold transition-all cursor-pointer ${
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
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-orbitron text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>PAUSE</span>
            </button>
          )}
        </div>

        {/* Unified Cyber Cross D-Pad with Slide/Touch Precision */}
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
          size="md"
        />
      </div>
    </div>
  );
};
