import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SplashScreen } from './SplashScreen';
import { ModeSelection } from './ModeSelection';
import { ScoreBoard } from './ScoreBoard';
import { GameBoard } from './GameBoard';
import { WinnerModal } from './WinnerModal';
import { StatsModal } from './StatsModal';
import { RulesModal } from './RulesModal';
import { Board, GameConfig, GameStats, Player, WinResult } from '../types';
import { checkWinner, getBestMoveMinimax, getEasyAIMove, getMediumAIMove } from '../utils/ai';
import {
  playClickSound,
  playDrawSound,
  playMoveSound,
  playResetSound,
  playWinSound,
  triggerHaptic,
} from '../utils/audio';
import { fireWinnerConfetti } from '../utils/confetti';
import { peerManager } from '../utils/peerManager';
import { Grid, ArrowLeft, Radio, Wifi, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface TicTacToeGameProps {
  onBackToHub: () => void;
  config: GameConfig;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onToggleSound: () => void;
  stats: GameStats;
  onUpdateStats: (newStats: GameStats | ((prev: GameStats) => GameStats)) => void;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({
  onBackToHub,
  config,
  onUpdateConfig,
  onToggleSound,
  stats,
  onUpdateStats,
}) => {
  const [screen, setScreen] = useState<'splash' | 'menu' | 'game'>('menu');
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winResult, setWinResult] = useState<WinResult>({ winner: null, line: null });
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  // Online Multiplayer State
  const [isOnlineMultiplayer, setIsOnlineMultiplayer] = useState(false);
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [latency, setLatency] = useState(0);
  const [incomingEmote, setIncomingEmote] = useState<string | null>(null);
  const [isCoinFlipModalOpen, setIsCoinFlipModalOpen] = useState(false);
  const [playerCoinChoice, setPlayerCoinChoice] = useState<'head' | 'tail' | null>(null);
  const [coinFlipResult, setCoinFlipResult] = useState<Player | null>(null);
  const [isOpponentLeftModalOpen, setIsOpponentLeftModalOpen] = useState(false);

  // Secondary modals
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const aiTimeoutRef = useRef<number | null>(null);
  const rematchPendingRef = useRef(false);
  const coinFlipSentRef = useRef(false);

  // Check peerManager on mount or state changes
  useEffect(() => {
    const isConn = peerManager.isConnected();
    setIsOnlineMultiplayer(isConn);
    setOnlineRole(peerManager.getRole());

    if (isConn) {
      setScreen('game');
      // ✅ FIX: Switch mode to PvP when online multiplayer is active
      onUpdateConfig({ mode: 'pvp' });
      // ✅ Show coin flip modal for first turn decision
      if (!coinFlipSentRef.current) {
        setIsCoinFlipModalOpen(true);
        coinFlipSentRef.current = true;
      }
    }

    const unsubMsg = peerManager.onMessage((msg) => {
      if (msg.type === 'MOVE_TICTACTOE' && msg.index !== undefined && msg.player) {
        // Opponent made a move
        setBoard((prev) => {
          if (prev[msg.index!] !== null) return prev;
          const next = [...prev];
          next[msg.index!] = msg.player as Player;

          const res = checkWinner(next);
          if (res.winner !== null) {
            handleGameOver(res);
          } else {
            setCurrentPlayer(msg.player === 'X' ? 'O' : 'X');
          }
          return next;
        });

        playMoveSound(msg.player as Player, config.soundEnabled);
        triggerHaptic('light', config.hapticsEnabled);
      } else if (msg.type === 'FLIP_COIN_REQ') {
        // ✅ Opponent initiated coin flip
        setIsCoinFlipModalOpen(true);
      } else if (msg.type === 'FLIP_COIN_RESULT') {
        // ✅ Receive coin flip result
        setCoinFlipResult(msg.coinWinner || null);
        setPlayerCoinChoice(null);
      } else if (msg.type === 'REMATCH_REQ') {
        // Opponent wants to play again - auto-accept
        rematchPendingRef.current = true;
        peerManager.sendMessage({ type: 'REMATCH_ACCEPT' });
        resetGameRound();
      } else if (msg.type === 'REMATCH_ACCEPT') {
        // Opponent accepted our rematch request
        rematchPendingRef.current = false;
        resetGameRound();
      } else if (msg.type === 'OPPONENT_LEFT') {
        // ✅ Opponent left the room
        setIsOpponentLeftModalOpen(true);
      } else if (msg.type === 'EMOTE' && msg.emote) {
        setIncomingEmote(msg.emote);
        triggerHaptic('light', config.hapticsEnabled);
        setTimeout(() => setIncomingEmote(null), 2500);
      }
    });

    const unsubLat = peerManager.onLatency((ms) => {
      setLatency(ms);
    });

    const unsubStatus = peerManager.onStatus((status) => {
      if (status === 'disconnected') {
        setIsOpponentLeftModalOpen(true);
      }
    });

    return () => {
      unsubMsg();
      unsubLat();
      unsubStatus();
    };
  }, [config.soundEnabled, config.hapticsEnabled, onUpdateConfig]);

  // Cleanup pending AI moves on unmount or reset
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
    };
  }, []);

  // Reset or Start game round
  const resetGameRound = useCallback(
    (customConfig?: GameConfig) => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }

      playResetSound(config.soundEnabled);
      const activeConfig = customConfig || config;

      setBoard(Array(9).fill(null));
      setWinResult({ winner: null, line: null });
      setIsWinnerModalOpen(false);
      setIsAiThinking(false);

      // ✅ NEW: If online, use coin flip result or last winner for starting player
      if (peerManager.isConnected()) {
        if (coinFlipResult) {
          setCurrentPlayer(coinFlipResult);
        } else if (stats.lastWinner && stats.lastWinner !== 'draw') {
          // Always winner goes first in rematch
          setCurrentPlayer(stats.lastWinner as Player);
        } else {
          setCurrentPlayer('X');
        }
      } else {
        // AI mode: respect AI settings
        setCurrentPlayer('X');
        if (activeConfig.mode.startsWith('ai') && activeConfig.startingPlayer === activeConfig.aiSymbol) {
          setIsAiThinking(true);
          aiTimeoutRef.current = window.setTimeout(() => {
            let move = 4; // center
            if (activeConfig.mode === 'ai-easy') {
              move = Math.floor(Math.random() * 9);
            } else if (activeConfig.mode === 'ai-hard') {
              const openings = [0, 2, 4, 6, 8];
              move = openings[Math.floor(Math.random() * openings.length)];
            }

            const freshBoard: Board = Array(9).fill(null);
            freshBoard[move] = activeConfig.aiSymbol;
            setBoard(freshBoard);
            playMoveSound(activeConfig.aiSymbol, activeConfig.soundEnabled);
            triggerHaptic('light', activeConfig.hapticsEnabled);

            setCurrentPlayer(activeConfig.playerSymbol);
            setIsAiThinking(false);
          }, 500);
        }
      }
    },
    [config, stats.lastWinner, coinFlipResult]
  );

  // Handle game conclusion
  const handleGameOver = useCallback(
    (result: WinResult) => {
      setWinResult(result);

      onUpdateStats((prev) => {
        const isWinX = result.winner === 'X';
        const isWinO = result.winner === 'O';
        const isDraw = result.winner === 'draw';

        const newWinsX = isWinX ? prev.winsX + 1 : prev.winsX;
        const newWinsO = isWinO ? prev.winsO + 1 : prev.winsO;
        const newDraws = isDraw ? prev.draws + 1 : prev.draws;
        const newTotal = prev.totalGames + 1;

        let newStreak = prev.currentStreak;
        if (config.mode.startsWith('ai')) {
          if (result.winner === config.playerSymbol) {
            newStreak = prev.currentStreak + 1;
          } else if (result.winner === config.aiSymbol) {
            newStreak = 0;
          }
        } else {
          // PvP: streak continues if same winner
          if (result.winner !== 'draw') {
            newStreak = prev.lastWinner === result.winner ? prev.currentStreak + 1 : 1;
          }
        }

        const newBestStreak = Math.max(prev.bestStreak, newStreak);

        return {
          winsX: newWinsX,
          winsO: newWinsO,
          draws: newDraws,
          totalGames: newTotal,
          currentStreak: newStreak,
          bestStreak: newBestStreak,
          lastWinner: result.winner,
        };
      });

      if (result.winner === 'draw') {
        playDrawSound(config.soundEnabled);
        triggerHaptic('medium', config.hapticsEnabled);
      } else {
        playWinSound(config.soundEnabled);
        triggerHaptic('success', config.hapticsEnabled);
        fireWinnerConfetti();
      }

      // Allow 450ms for user to admire the winning strike line before modal opens
      setTimeout(() => {
        setIsWinnerModalOpen(true);
      }, 450);
    },
    [config, onUpdateStats]
  );

  // Handle Move (Local & Online P2P)
  const handleCellClick = (index: number) => {
    if (board[index] !== null || winResult.winner !== null || isAiThinking) {
      return;
    }

    // In Online P2P Mode: verify it's our assigned turn
    if (isOnlineMultiplayer) {
      const myToken: Player = onlineRole === 'client' ? 'O' : 'X';
      if (currentPlayer !== myToken) {
        // Not your turn!
        return;
      }

      // Send move to peer
      peerManager.sendMessage({
        type: 'MOVE_TICTACTOE',
        index,
        player: myToken,
      });
    } else {
      // In AI mode, prevent human from playing if it's currently AI's turn
      if (config.mode.startsWith('ai') && currentPlayer !== config.playerSymbol) {
        return;
      }
    }

    playMoveSound(currentPlayer, config.soundEnabled);
    triggerHaptic('light', config.hapticsEnabled);

    const newBoard = [...board];
    newBoard[index] = currentPlayer;
    setBoard(newBoard);

    const result = checkWinner(newBoard);

    if (result.winner !== null) {
      handleGameOver(result);
      return;
    }

    const nextPlayer: Player = currentPlayer === 'X' ? 'O' : 'X';
    setCurrentPlayer(nextPlayer);

    // AI Turn Trigger (Only in single-player AI mode)
    if (!isOnlineMultiplayer && config.mode.startsWith('ai') && nextPlayer === config.aiSymbol) {
      setIsAiThinking(true);

      aiTimeoutRef.current = window.setTimeout(() => {
        let aiMove = -1;

        if (config.mode === 'ai-easy') {
          aiMove = getEasyAIMove(newBoard);
        } else if (config.mode === 'ai-medium') {
          aiMove = getMediumAIMove(newBoard, config.aiSymbol);
        } else {
          // Hard Unbeatable Minimax
          aiMove = getBestMoveMinimax(newBoard, config.aiSymbol);
        }

        if (aiMove !== -1) {
          const aiBoard = [...newBoard];
          aiBoard[aiMove] = config.aiSymbol;
          setBoard(aiBoard);

          playMoveSound(config.aiSymbol, config.soundEnabled);
          triggerHaptic('light', config.hapticsEnabled);

          const aiResult = checkWinner(aiBoard);

          if (aiResult.winner !== null) {
            handleGameOver(aiResult);
          } else {
            setCurrentPlayer(config.playerSymbol);
          }
        }

        setIsAiThinking(false);
      }, 420);
    }
  };

  const handleSendEmote = (emote: string) => {
    playClickSound(config.soundEnabled);
    triggerHaptic('light', config.hapticsEnabled);
    peerManager.sendMessage({ type: 'EMOTE', emote });
    setIncomingEmote(`You: ${emote}`);
    setTimeout(() => setIncomingEmote(null), 2000);
  };

  const handlePlayAgain = () => {
    if (isOnlineMultiplayer) {
      // Send rematch request to peer
      rematchPendingRef.current = true;
      peerManager.sendMessage({ type: 'REMATCH_REQ' });
    }
    resetGameRound();
  };

  // ✅ NEW: Handle coin flip vote
  const handleCoinFlipVote = (choice: 'head' | 'tail') => {
    setPlayerCoinChoice(choice);
    playClickSound(config.soundEnabled);

    // Simulate coin flip
    const coinResult = Math.random() < 0.5 ? 'head' : 'tail';
    const winner = coinResult === choice ? (onlineRole === 'host' ? 'X' : 'O') : (onlineRole === 'host' ? 'O' : 'X');

    // Send result to peer
    peerManager.sendMessage({
      type: 'FLIP_COIN_RESULT',
      coinFlip: coinResult,
      coinWinner: winner,
    });

    setCoinFlipResult(winner);

    // Close modal after 2 seconds
    setTimeout(() => {
      setIsCoinFlipModalOpen(false);
      resetGameRound();
    }, 2000);
  };

  const handleResetStats = () => {
    onUpdateStats({
      winsX: 0,
      winsO: 0,
      draws: 0,
      totalGames: 0,
      currentStreak: 0,
      bestStreak: 0,
      lastWinner: null,
    });
  };

  const handleLeaveRoom = () => {
    playClickSound(config.soundEnabled);
    peerManager.cleanup();
    setIsOpponentLeftModalOpen(false);
    onBackToHub();
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-between relative overflow-hidden">
      {/* Top Arcade Hub Return Header */}
      <div className="w-full px-4 pt-2 flex items-center justify-between z-20">
        <button
          onClick={() => {
            playClickSound(config.soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 text-[11px] font-orbitron font-bold flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ARCADE HUB</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-[10px] font-orbitron text-cyan-300 font-bold">
          {isOnlineMultiplayer ? (
            <span className="flex items-center gap-1 text-emerald-400">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>ONLINE ({onlineRole === 'host' ? 'YOU: X' : 'YOU: O'})</span>
              {latency > 0 && <span className="text-[9px] text-slate-400 font-mono">· {latency}ms</span>}
            </span>
          ) : (
            <>
              <Grid className="w-3 h-3 text-cyan-400" />
              <span>TIC-TAC-TOE</span>
            </>
          )}
        </div>
      </div>

      {/* Screen 1: Splash */}
      {screen === 'splash' && (
        <SplashScreen
          onStart={() => setScreen('menu')}
          onOpenRules={() => setIsRulesModalOpen(true)}
          onOpenStats={() => setIsStatsModalOpen(true)}
          onToggleSound={onToggleSound}
          soundEnabled={config.soundEnabled}
        />
      )}

      {/* Screen 2: Mode Selection Menu */}
      {screen === 'menu' && (
        <ModeSelection
          config={config}
          onUpdateConfig={onUpdateConfig}
          onStartGame={() => {
            resetGameRound();
            setScreen('game');
          }}
          onBack={() => onBackToHub()}
          onOpenRules={() => setIsRulesModalOpen(true)}
          onOpenStats={() => setIsStatsModalOpen(true)}
          onToggleSound={onToggleSound}
        />
      )}

      {/* Screen 3: Game Screen & HUD */}
      {screen === 'game' && (
        <div className="flex-1 flex flex-col justify-between py-1 relative overflow-hidden">
          {/* Background cyber lighting */}
          <div className="absolute top-1/3 -left-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -right-16 w-44 h-44 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Scoreboard HUD */}
          <ScoreBoard
            config={config}
            stats={stats}
            currentPlayer={currentPlayer}
            isAiThinking={isAiThinking}
            onReset={() => resetGameRound()}
            onBackToMenu={() => setScreen('menu')}
            onToggleSound={onToggleSound}
            onOpenStats={() => setIsStatsModalOpen(true)}
            onOpenRules={() => setIsRulesModalOpen(true)}
          />

          {/* 3x3 Animated Neon Grid */}
          <GameBoard
            board={board}
            winResult={winResult}
            currentPlayer={currentPlayer}
            isAiThinking={isAiThinking}
            disabled={winResult.winner !== null}
            onCellClick={handleCellClick}
          />

          {/* Online Emotes & Opponent Toast */}
          {isOnlineMultiplayer && (
            <div className="w-full px-4 py-1.5 flex flex-col items-center gap-1.5 z-20">
              {incomingEmote && (
                <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-cyan-400 text-xs font-orbitron text-cyan-300 animate-bounce shadow-lg">
                  {incomingEmote}
                </div>
              )}
              <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800">
                <span className="text-[10px] text-slate-400 font-orbitron uppercase">React:</span>
                {['🔥', '👏', '⚡', '🤯', '😎', '💀'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleSendEmote(emoji)}
                    className="hover:scale-125 transition-transform text-sm cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Celebration Winner Modal */}
          <WinnerModal
            isOpen={isWinnerModalOpen}
            winResult={winResult}
            config={config}
            stats={stats}
            onPlayAgain={handlePlayAgain}
            onMainMenu={() => {
              setIsWinnerModalOpen(false);
              setScreen('menu');
            }}
            onOpenStats={() => {
              setIsWinnerModalOpen(false);
              setIsStatsModalOpen(true);
            }}
          />

          {/* ✅ Coin Flip Modal */}
          {isCoinFlipModalOpen && isOnlineMultiplayer && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm"
            >
              <motion.div
                animate={{ rotateY: playerCoinChoice ? [0, 360, 720] : 0 }}
                transition={{ duration: playerCoinChoice ? 1 : 0 }}
                className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-8 text-center max-w-sm shadow-2xl"
              >
                <h2 className="text-2xl font-bold font-orbitron text-cyan-400 mb-4">🪙 FLIP COIN</h2>
                <p className="text-sm text-slate-300 mb-6">Choose HEAD or TAIL to decide first turn!</p>

                {!playerCoinChoice ? (
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => handleCoinFlipVote('head')}
                      className="px-6 py-3 bg-cyan-500/20 border border-cyan-400 text-cyan-300 font-bold rounded-lg hover:bg-cyan-500/30 transition"
                    >
                      HEAD 👤
                    </button>
                    <button
                      onClick={() => handleCoinFlipVote('tail')}
                      className="px-6 py-3 bg-pink-500/20 border border-pink-400 text-pink-300 font-bold rounded-lg hover:bg-pink-500/30 transition"
                    >
                      TAIL 🪙
                    </button>
                  </div>
                ) : (
                  <div className="text-4xl mb-4">🪙</div>
                )}

                {coinFlipResult && (
                  <p className="text-lg font-bold text-emerald-400 mt-4">
                    {coinFlipResult === (onlineRole === 'host' ? 'X' : 'O') ? '🎉 You Won! First Turn' : '👤 Opponent First Turn'}
                  </p>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ✅ Opponent Left Modal */}
          {isOpponentLeftModalOpen && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm"
            >
              <motion.div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-8 text-center max-w-sm shadow-2xl">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold font-orbitron text-rose-400 mb-2">OPPONENT LEFT</h2>
                <p className="text-sm text-slate-300 mb-6">Your opponent has disconnected from the room.</p>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full px-6 py-3 bg-rose-500/20 border border-rose-400 text-rose-300 font-bold rounded-lg hover:bg-rose-500/30 transition"
                >
                  BACK TO ARCADE
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {/* Modals */}
      <StatsModal
        isOpen={isStatsModalOpen}
        stats={stats}
        soundEnabled={config.soundEnabled}
        onClose={() => setIsStatsModalOpen(false)}
        onResetStats={handleResetStats}
      />

      <RulesModal
        isOpen={isRulesModalOpen}
        soundEnabled={config.soundEnabled}
        onClose={() => setIsRulesModalOpen(false)}
      />
    </div>
  );
};
