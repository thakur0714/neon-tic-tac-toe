import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Bot,
  Users,
  Sparkles,
  Radio,
  Wifi,
} from 'lucide-react';
import { Connect4Cell, Connect4Player, Connect4Stats } from '../../types';
import {
  playClickSound,
  playDropSound,
  playWinSound,
  triggerHaptic,
} from '../../utils/audio';
import { fireWinnerConfetti } from '../../utils/confetti';
import { peerManager } from '../../utils/peerManager';

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
  const [board, setBoard] = useState<Connect4Cell[][]>(() => createEmptyBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Connect4Player>('P1'); // P1: Cyan, P2: Pink
  const [isAiMode, setIsAiMode] = useState(true);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winner, setWinner] = useState<Connect4Player | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);

  // Online Multiplayer State
  const [isOnline, setIsOnline] = useState(false);
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [latency, setLatency] = useState(0);

  function createEmptyBoard(): Connect4Cell[][] {
    return Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(null));
  }

  // Subscribe to peerManager messages
  useEffect(() => {
    const isConn = peerManager.isConnected();
    setIsOnline(isConn);
    setOnlineRole(peerManager.getRole());

    const unsubMsg = peerManager.onMessage((msg) => {
      if (msg.type === 'MOVE_CONNECT4' && msg.index !== undefined && msg.player) {
        // Remote chip drop
        const col = msg.index;
        const player = msg.player as Connect4Player;

        setBoard((prev) => {
          const row = getLowestEmptyRow(col, prev);
          if (row === -1) return prev;

          playDropSound(soundEnabled);
          triggerHaptic('light');

          const newBoard = prev.map((r) => [...r]);
          newBoard[row][col] = player;

          const res = checkVictory(newBoard);
          if (res.winner !== null) {
            setWinningCells(res.cells);
            handleGameEnd(res.winner);
          } else {
            setCurrentPlayer(player === 'P1' ? 'P2' : 'P1');
          }
          return newBoard;
        });
      } else if (msg.type === 'REMATCH_REQ' || msg.type === 'REMATCH_ACCEPT') {
        resetGame();
      }
    });

    const unsubLat = peerManager.onLatency((ms) => {
      setLatency(ms);
    });

    return () => {
      unsubMsg();
      unsubLat();
    };
  }, [soundEnabled]);

  const resetGame = () => {
    playClickSound(soundEnabled);
    triggerHaptic('medium');
    setBoard(createEmptyBoard());
    setCurrentPlayer('P1');
    setWinner(null);
    setWinningCells([]);
    setIsAiThinking(false);

    if (peerManager.isConnected()) {
      peerManager.sendMessage({ type: 'REMATCH_ACCEPT' });
    }
  };

  const getLowestEmptyRow = (col: number, currentBoard: Connect4Cell[][]): number => {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!currentBoard[r][col]) return r;
    }
    return -1;
  };

  const checkVictory = (
    currentBoard: Connect4Cell[][]
  ): { winner: Connect4Player | 'draw' | null; cells: [number, number][] } => {
    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = currentBoard[r][c];
        if (
          val &&
          val === currentBoard[r][c + 1] &&
          val === currentBoard[r][c + 2] &&
          val === currentBoard[r][c + 3]
        ) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r, c + 1],
              [r, c + 2],
              [r, c + 3],
            ],
          };
        }
      }
    }

    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        const val = currentBoard[r][c];
        if (
          val &&
          val === currentBoard[r + 1][c] &&
          val === currentBoard[r + 2][c] &&
          val === currentBoard[r + 3][c]
        ) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r + 1, c],
              [r + 2, c],
              [r + 3, c],
            ],
          };
        }
      }
    }

    // Diagonal Up-Right
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = currentBoard[r][c];
        if (
          val &&
          val === currentBoard[r - 1][c + 1] &&
          val === currentBoard[r - 2][c + 2] &&
          val === currentBoard[r - 3][c + 3]
        ) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r - 1, c + 1],
              [r - 2, c + 2],
              [r - 3, c + 3],
            ],
          };
        }
      }
    }

    // Diagonal Down-Right
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        const val = currentBoard[r][c];
        if (
          val &&
          val === currentBoard[r + 1][c + 1] &&
          val === currentBoard[r + 2][c + 2] &&
          val === currentBoard[r + 3][c + 3]
        ) {
          return {
            winner: val,
            cells: [
              [r, c],
              [r + 1, c + 1],
              [r + 2, c + 2],
              [r + 3, c + 3],
            ],
          };
        }
      }
    }

    // Check full / draw
    const isFull = currentBoard.every((row) => row.every((cell) => cell !== null));
    if (isFull) {
      return { winner: 'draw', cells: [] };
    }

    return { winner: null, cells: [] };
  };

  const handleGameEnd = useCallback(
    (win: Connect4Player | 'draw') => {
      setWinner(win);
      if (win !== 'draw') {
        playWinSound(soundEnabled);
        fireWinnerConfetti();
      }

      onUpdateStats((prev) => ({
        winsP1: win === 'P1' ? prev.winsP1 + 1 : prev.winsP1,
        winsP2: win === 'P2' ? prev.winsP2 + 1 : prev.winsP2,
        draws: win === 'draw' ? prev.draws + 1 : prev.draws,
        totalGames: prev.totalGames + 1,
      }));
    },
    [onUpdateStats, soundEnabled]
  );

  const dropChip = useCallback(
    (col: number) => {
      if (winner !== null || isAiThinking) return;

      // In Online P2P Mode: verify it's our turn
      if (isOnline) {
        const myPlayer: Connect4Player = onlineRole === 'client' ? 'P2' : 'P1';
        if (currentPlayer !== myPlayer) {
          return; // Not your turn
        }

        peerManager.sendMessage({
          type: 'MOVE_CONNECT4',
          index: col,
          player: myPlayer,
        });
      }

      const row = getLowestEmptyRow(col, board);
      if (row === -1) return; // Column is full

      playDropSound(soundEnabled);
      triggerHaptic('light');

      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = currentPlayer;
      setBoard(newBoard);

      const result = checkVictory(newBoard);
      if (result.winner !== null) {
        setWinningCells(result.cells);
        handleGameEnd(result.winner);
        return;
      }

      const nextP: Connect4Player = currentPlayer === 'P1' ? 'P2' : 'P1';
      setCurrentPlayer(nextP);

      // AI Move turn
      if (!isOnline && isAiMode && nextP === 'P2') {
        setIsAiThinking(true);
        setTimeout(() => {
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
    [board, currentPlayer, isAiMode, isAiThinking, winner, soundEnabled, handleGameEnd, isOnline, onlineRole]
  );

  return (
    <div className="h-full max-h-full flex-1 flex flex-col justify-between p-2 sm:p-3 relative overflow-hidden bg-slate-950">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 -left-16 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navigation */}
      <div className="shrink-0 w-full flex items-center justify-between z-10">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-pink-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>HUB</span>
        </button>

        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 border border-emerald-500/40 text-[10px] font-orbitron text-emerald-400 font-bold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>ONLINE ({onlineRole === 'host' ? 'YOU: CYAN' : 'YOU: PINK'})</span>
              {latency > 0 && <span className="text-[9px] text-slate-400 font-mono">· {latency}ms</span>}
            </div>
          ) : (
            <button
              onClick={() => {
                playClickSound(soundEnabled);
                setIsAiMode(!isAiMode);
                resetGame();
              }}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-orbitron text-slate-300 font-bold cursor-pointer"
            >
              {isAiMode ? <Bot className="w-3 h-3 text-pink-400" /> : <Users className="w-3 h-3 text-cyan-400" />}
              <span>{isAiMode ? 'VS BOT' : '2 PLAYER'}</span>
            </button>
          )}

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
      <div className="shrink-0 grid grid-cols-3 gap-1.5 w-full my-0.5 z-10">
        <div
          className={`p-1.5 rounded-xl border flex flex-col items-center transition-all ${
            currentPlayer === 'P1' && !winner
              ? 'bg-slate-900/90 border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.3)]'
              : 'bg-slate-900/50 border-slate-800/80 opacity-80'
          }`}
        >
          <span className="text-[9px] font-bold text-cyan-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {isAiMode ? 'YOU' : 'P1'}
          </span>
          <span className="text-lg font-black font-orbitron text-cyan-400 leading-tight">
            {stats.winsP1}
          </span>
        </div>

        <div className="p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center">
          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">DRAWS</span>
          <span className="text-lg font-black font-orbitron text-amber-400 leading-tight">
            {stats.draws}
          </span>
        </div>

        <div
          className={`p-1.5 rounded-xl border flex flex-col items-center transition-all ${
            currentPlayer === 'P2' && !winner
              ? 'bg-slate-900/90 border-pink-500 shadow-[0_0_12px_rgba(255,0,127,0.3)]'
              : 'bg-slate-900/50 border-slate-800/80 opacity-80'
          }`}
        >
          <span className="text-[9px] font-bold text-pink-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            {isAiMode ? 'BOT' : 'P2'}
          </span>
          <span className="text-lg font-black font-orbitron text-pink-400 leading-tight">
            {stats.winsP2}
          </span>
        </div>
      </div>

      {/* Turn Indicator */}
      <div className="w-full flex justify-center z-10">
        <div
          className={`px-2.5 py-0.5 rounded-full text-[9px] font-orbitron font-bold flex items-center gap-1 border ${
            currentPlayer === 'P1'
              ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
              : 'bg-pink-950/80 border-pink-500/50 text-pink-300'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${currentPlayer === 'P1' ? 'bg-cyan-400' : 'bg-pink-500'} animate-pulse`} />
          <span>
            {isAiThinking
              ? 'AI THINKING...'
              : `${currentPlayer === 'P1' ? 'CYAN' : 'PINK'}'S TURN`}
          </span>
        </div>
      </div>

      {/* 7x6 Connect 4 Grid (Scaled for Zero Mobile Scrolling & Large Touch Targets) */}
      <div className="w-full max-w-[min(340px,46vh)] mx-auto bg-slate-900/90 p-2 rounded-2xl border-2 border-slate-800 shadow-[0_0_25px_rgba(0,0,0,0.5)] z-10 shrink-0">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: COLS }).map((_, c) => (
            <button
              key={c}
              onClick={() => dropChip(c)}
              disabled={winner !== null || isAiThinking}
              className="flex flex-col gap-1 p-0.5 rounded-xl hover:bg-slate-800/70 transition-all cursor-pointer group"
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
                      <div className="w-2 h-2 rounded-full bg-white/40 shadow-inner" />
                    )}
                  </div>
                );
              })}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Controls & Winner Alert */}
      <div className="w-full flex items-center justify-between px-2 pt-1 z-10">
        <button
          onClick={resetGame}
          className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 font-orbitron font-bold text-[11px] flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET</span>
        </button>

        {winner && (
          <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-black font-orbitron text-[11px] flex items-center gap-1 shadow-[0_0_15px_rgba(0,240,255,0.4)]">
            <Sparkles className="w-3 h-3" />
            <span>{winner === 'draw' ? 'STALEMATE!' : `${winner === 'P1' ? 'CYAN' : 'PINK'} WINS!`}</span>
          </div>
        )}
      </div>
    </div>
  );
};
