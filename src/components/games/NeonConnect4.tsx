import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Bot,
  Trophy,
  Sparkles,
  Play,
  Check,
} from 'lucide-react';
import { Connect4Board, Connect4Cell, Connect4Player, Connect4Stats } from '../../types';
import {
  playClickSound,
  playDrawSound,
  playDropSound,
  playWinSound,
  triggerHaptic,
} from '../../utils/audio';
import { fireWinnerConfetti } from '../../utils/confetti';

interface NeonConnect4Props {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  stats: Connect4Stats;
  onUpdateStats: (newStats: Connect4Stats | ((prev: Connect4Stats) => Connect4Stats)) => void;
}

const ROWS = 6;
const COLS = 7;

export const NeonConnect4: React.FC<NeonConnect4Props> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
  stats,
  onUpdateStats,
}) => {
  const [board, setBoard] = useState<Connect4Board>(() =>
    Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Connect4Player>('P1');
  const [isAiMode, setIsAiMode] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<Connect4Player | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);

  // Check victory condition
  const checkVictory = (currentBoard: Connect4Board): { winner: Connect4Player | 'draw' | null; cells: [number, number][] } => {
    // Check horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = currentBoard[r][c];
        if (p && p === currentBoard[r][c + 1] && p === currentBoard[r][c + 2] && p === currentBoard[r][c + 3]) {
          return { winner: p, cells: [[r, c], [r, c + 1], [r, c + 2], [r, c + 3]] };
        }
      }
    }

    // Check vertical
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c < COLS; c++) {
        const p = currentBoard[r][c];
        if (p && p === currentBoard[r + 1][c] && p === currentBoard[r + 2][c] && p === currentBoard[r + 3][c]) {
          return { winner: p, cells: [[r, c], [r + 1, c], [r + 2, c], [r + 3, c]] };
        }
      }
    }

    // Check diagonal (down-right)
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = currentBoard[r][c];
        if (p && p === currentBoard[r + 1][c + 1] && p === currentBoard[r + 2][c + 2] && p === currentBoard[r + 3][c + 3]) {
          return { winner: p, cells: [[r, c], [r + 1, c + 1], [r + 2, c + 2], [r + 3, c + 3]] };
        }
      }
    }

    // Check diagonal (up-right)
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const p = currentBoard[r][c];
        if (p && p === currentBoard[r - 1][c + 1] && p === currentBoard[r - 2][c + 2] && p === currentBoard[r - 3][c + 3]) {
          return { winner: p, cells: [[r, c], [r - 1, c + 1], [r - 2, c + 2], [r - 3, c + 3]] };
        }
      }
    }

    // Check Draw
    const isFull = currentBoard.every((row) => row.every((cell) => cell !== null));
    if (isFull) return { winner: 'draw', cells: [] };

    return { winner: null, cells: [] };
  };

  // Find lowest available row in column
  const getLowestEmptyRow = (col: number, currentBoard: Connect4Board): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!currentBoard[r][col]) return r;
    }
    return -1;
  };

  // Reset board
  const resetGame = () => {
    playClickSound(soundEnabled);
    triggerHaptic('light');
    setBoard(
      Array(ROWS)
        .fill(null)
        .map(() => Array(COLS).fill(null))
    );
    setCurrentPlayer('P1');
    setWinner(null);
    setWinningCells([]);
    setIsAiThinking(false);
  };

  // Handle Game End
  const handleGameEnd = useCallback(
    (winResult: Connect4Player | 'draw') => {
      setWinner(winResult);
      if (winResult === 'draw') {
        playDrawSound(soundEnabled);
        triggerHaptic('medium');
      } else {
        playWinSound(soundEnabled);
        triggerHaptic('success');
        fireWinnerConfetti();
      }

      onUpdateStats((prev) => ({
        winsP1: winResult === 'P1' ? prev.winsP1 + 1 : prev.winsP1,
        winsP2: winResult === 'P2' ? prev.winsP2 + 1 : prev.winsP2,
        draws: winResult === 'draw' ? prev.draws + 1 : prev.draws,
        totalGames: prev.totalGames + 1,
      }));
    },
    [soundEnabled, onUpdateStats]
  );

  // Drop Chip Handler
  const dropChip = useCallback(
    (col: number) => {
      if (winner !== null || isAiThinking) return;

      const targetRow = getLowestEmptyRow(col, board);
      if (targetRow === -1) return; // Column full

      playDropSound(soundEnabled);
      triggerHaptic('light');

      const newBoard = board.map((r) => [...r]);
      newBoard[targetRow][col] = currentPlayer;
      setBoard(newBoard);

      const result = checkVictory(newBoard);
      if (result.winner !== null) {
        setWinningCells(result.cells);
        handleGameEnd(result.winner);
        return;
      }

      const nextPlayer: Connect4Player = currentPlayer === 'P1' ? 'P2' : 'P1';
      setCurrentPlayer(nextPlayer);

      // AI Move Trigger
      if (isAiMode && nextPlayer === 'P2') {
        setIsAiThinking(true);

        setTimeout(() => {
          // AI Logic:
          // 1. Check if AI can win next move
          // 2. Check if opponent can win next move & block
          // 3. Prefer center columns
          let chosenCol = -1;

          for (let c = 0; c < COLS; c++) {
            const r = getLowestEmptyRow(c, newBoard);
            if (r !== -1) {
              const testBoard = newBoard.map((row) => [...row]);
              testBoard[r][c] = 'P2';
              if (checkVictory(testBoard).winner === 'P2') {
                chosenCol = c;
                break;
              }
            }
          }

          if (chosenCol === -1) {
            for (let c = 0; c < COLS; c++) {
              const r = getLowestEmptyRow(c, newBoard);
              if (r !== -1) {
                const testBoard = newBoard.map((row) => [...row]);
                testBoard[r][c] = 'P1';
                if (checkVictory(testBoard).winner === 'P1') {
                  chosenCol = c;
                  break;
                }
              }
            }
          }

          if (chosenCol === -1) {
            const priorityCols = [3, 2, 4, 1, 5, 0, 6];
            for (const c of priorityCols) {
              if (getLowestEmptyRow(c, newBoard) !== -1) {
                chosenCol = c;
                break;
              }
            }
          }

          if (chosenCol !== -1) {
            const aiRow = getLowestEmptyRow(chosenCol, newBoard);
            const aiBoard = newBoard.map((row) => [...row]);
            aiBoard[aiRow][chosenCol] = 'P2';
            setBoard(aiBoard);

            playDropSound(soundEnabled);
            triggerHaptic('light');

            const aiResult = checkVictory(aiBoard);
            if (aiResult.winner !== null) {
              setWinningCells(aiResult.cells);
              handleGameEnd(aiResult.winner);
            } else {
              setCurrentPlayer('P1');
            }
          }

          setIsAiThinking(false);
        }, 450);
      }
    },
    [board, currentPlayer, isAiMode, isAiThinking, winner, soundEnabled, handleGameEnd]
  );

  return (
    <div className="flex-1 flex flex-col justify-between p-3.5 relative overflow-hidden bg-slate-950">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -left-16 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <div className="w-full flex items-center justify-between z-10 pb-1">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-pink-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ARCADE HUB</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setIsAiMode(!isAiMode);
              resetGame();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-orbitron text-slate-300 font-bold"
          >
            {isAiMode ? <Bot className="w-3 h-3 text-pink-400" /> : <Users className="w-3 h-3 text-cyan-400" />}
            <span>{isAiMode ? 'VS AI' : 'PASS & PLAY'}</span>
          </button>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="p-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-pink-400 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-pink-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Top HUD Scoreboard */}
      <div className="grid grid-cols-3 gap-2 w-full my-1 z-10">
        <div
          className={`p-2 rounded-xl border flex flex-col items-center transition-all ${
            currentPlayer === 'P1' && !winner
              ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              : 'bg-slate-900/50 border-slate-800/80 opacity-80'
          }`}
        >
          <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            {isAiMode ? 'YOU' : 'PLAYER 1'}
          </span>
          <span className="text-xl font-black font-orbitron text-cyan-400 mt-0.5">
            {stats.winsP1}
          </span>
        </div>

        <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center">
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">DRAWS</span>
          <span className="text-xl font-black font-orbitron text-amber-400 mt-0.5">
            {stats.draws}
          </span>
        </div>

        <div
          className={`p-2 rounded-xl border flex flex-col items-center transition-all ${
            currentPlayer === 'P2' && !winner
              ? 'bg-slate-900/90 border-pink-500 shadow-[0_0_12px_rgba(255,0,127,0.3)]'
              : 'bg-slate-900/50 border-slate-800/80 opacity-80'
          }`}
        >
          <span className="text-[10px] font-bold text-pink-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-500" />
            {isAiMode ? 'BOT' : 'PLAYER 2'}
          </span>
          <span className="text-xl font-black font-orbitron text-pink-400 mt-0.5">
            {stats.winsP2}
          </span>
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="w-full flex justify-center z-10 mb-1">
        <div
          className={`px-3 py-1 rounded-full text-[10px] font-orbitron font-bold flex items-center gap-1.5 border ${
            currentPlayer === 'P1'
              ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
              : 'bg-pink-950/80 border-pink-500/50 text-pink-300'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${currentPlayer === 'P1' ? 'bg-cyan-400' : 'bg-pink-500'} animate-pulse`} />
          <span>
            {isAiThinking
              ? 'AI IS THINKING...'
              : `${currentPlayer === 'P1' ? 'CYAN' : 'PINK'}'S TURN`}
          </span>
        </div>
      </div>

      {/* 7x6 Connect 4 Grid */}
      <div className="w-full max-w-[340px] mx-auto bg-slate-900/90 p-3 rounded-2xl border-2 border-slate-800 shadow-[0_0_25px_rgba(0,0,0,0.5)] z-10">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              onClick={() => dropChip(c)}
              disabled={winner !== null || isAiThinking}
              className="flex flex-col gap-1.5 p-1 rounded-xl hover:bg-slate-800/70 transition-all cursor-pointer group"
              aria-label={`Column ${c + 1}`}
            >
              {Array.from({ length: ROWS }).map((_, r) => {
                const cell = board[r][c];
                const isWinning = winningCells.some(([wr, wc]) => wr === r && wc === c);

                return (
                  <div
                    key={`${r}-${c}`}
                    className={`w-full aspect-square rounded-full flex items-center justify-center transition-all duration-300 border ${
                      cell === 'P1'
                        ? `bg-cyan-400 border-cyan-300 ${
                            isWinning
                              ? 'shadow-[0_0_18px_#00F0FF] scale-110 border-white animate-pulse'
                              : 'shadow-[0_0_10px_rgba(0,240,255,0.6)]'
                          }`
                        : cell === 'P2'
                        ? `bg-pink-500 border-pink-300 ${
                            isWinning
                              ? 'shadow-[0_0_18px_#FF007F] scale-110 border-white animate-pulse'
                              : 'shadow-[0_0_10px_rgba(255,0,127,0.6)]'
                          }`
                        : 'bg-slate-950 border-slate-800 group-hover:border-slate-700'
                    }`}
                  >
                    {cell && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white/40 shadow-inner" />
                    )}
                  </div>
                );
              })}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Controls & Winner Alert */}
      <div className="w-full flex items-center justify-between px-2 pt-2 z-10">
        <button
          onClick={resetGame}
          className="px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 font-orbitron font-bold text-xs flex items-center gap-1.5 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>RESET</span>
        </button>

        {winner && (
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-black font-orbitron text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{winner === 'draw' ? 'STALEMATE!' : `${winner === 'P1' ? 'CYAN' : 'PINK'} WINS!`}</span>
          </div>
        )}
      </div>
    </div>
  );
};
