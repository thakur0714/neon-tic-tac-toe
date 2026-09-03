import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SplashScreen } from './SplashScreen';
import { ModeSelection } from './ModeSelection';
import { TicTacToeOnlineModal } from './TicTacToeOnlineModal';
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
  playCoinSpinSound,
  playCoinDingSound,
  playTurnAlertSound,
  triggerHaptic,
} from '../utils/audio';
import { fireWinnerConfetti } from '../utils/confetti';
import { peerManager } from '../utils/peerManager';
import {
  Grid,
  ArrowLeft,
  Radio,
  AlertCircle,
  Zap,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [screen, setScreen] = useState<'splash' | 'menu' | 'online-lobby' | 'game'>('menu');
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState<Player>('X');
  const [roundStartingPlayer, setRoundStartingPlayer] = useState<Player>('X');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [winResult, setWinResult] = useState<WinResult>({ winner: null, line: null });
  const [isWinnerModalOpen, setIsWinnerModalOpen] = useState(false);

  // Online Multiplayer State
  const [isOnlineMultiplayer, setIsOnlineMultiplayer] = useState(false);
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [latency, setLatency] = useState(0);
  const [incomingEmote, setIncomingEmote] = useState<string | null>(null);
  const [isOpponentLeftModalOpen, setIsOpponentLeftModalOpen] = useState(false);

  // Synchronized Coin Toss State
  const [isCoinFlipModalOpen, setIsCoinFlipModalOpen] = useState(false);
  const [coinTossPhase, setCoinTossPhase] = useState<'choose' | 'spinning' | 'landed'>('choose');
  const [firstPicker, setFirstPicker] = useState<'me' | 'opponent' | null>(null);
  const [myCoinChoice, setMyCoinChoice] = useState<'head' | 'tail' | null>(null);
  const [opponentCoinChoice, setOpponentCoinChoice] = useState<'head' | 'tail' | null>(null);
  const [coinOutcome, setCoinOutcome] = useState<'head' | 'tail' | null>(null);
  const [coinTossWinner, setCoinTossWinner] = useState<Player | null>(null);

  // Rematch sync state
  const [isRematchRequestedByMe, setIsRematchRequestedByMe] = useState(false);
  const [isRematchRequestedByOpponent, setIsRematchRequestedByOpponent] = useState(false);

  // Round Turn Flash Banner Notification
  const [turnAnnouncement, setTurnAnnouncement] = useState<{
    round: number;
    starter: Player;
    isMyTurn: boolean;
  } | null>(null);

  // Secondary modals
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const aiTimeoutRef = useRef<number | null>(null);
  const tossTimeoutRef = useRef<number | null>(null);
  const tossFinishTimeoutRef = useRef<number | null>(null);
  const turnBannerTimeoutRef = useRef<number | null>(null);
  const coinFlipInitiatedRef = useRef(false);

  const myToken: Player = onlineRole === 'client' ? 'O' : 'X';
  const opponentToken: Player = myToken === 'X' ? 'O' : 'X';
  const isMyCurrentTurn = isOnlineMultiplayer
    ? currentPlayer === myToken
    : config.mode.startsWith('ai')
    ? currentPlayer === config.playerSymbol
    : true;

  // Flash Turn Banner at round start
  const flashTurnBanner = useCallback(
    (roundNum: number, starter: Player) => {
      const isMine = isOnlineMultiplayer
        ? starter === myToken
        : config.mode.startsWith('ai')
        ? starter === config.playerSymbol
        : true;

      setTurnAnnouncement({
        round: roundNum,
        starter,
        isMyTurn: isMine,
      });

      playTurnAlertSound(isMine, config.soundEnabled);
      triggerHaptic(isMine ? 'success' : 'light', config.hapticsEnabled);

      if (turnBannerTimeoutRef.current) {
        clearTimeout(turnBannerTimeoutRef.current);
      }
      turnBannerTimeoutRef.current = window.setTimeout(() => {
        setTurnAnnouncement(null);
      }, 2600);
    },
    [isOnlineMultiplayer, myToken, config.mode, config.playerSymbol, config.soundEnabled, config.hapticsEnabled]
  );

  // Calculate who should start next round
  const calculateNextStarter = useCallback(
    (lastWinResult: WinResult, currentStarter: Player): Player => {
      if (lastWinResult.winner && lastWinResult.winner !== 'draw') {
        // Standard rule: Winner starts first next round
        return lastWinResult.winner as Player;
      }
      // If draw: Alternate starting player
      return currentStarter === 'X' ? 'O' : 'X';
    },
    []
  );

  const nextStartingPlayer = calculateNextStarter(winResult, roundStartingPlayer);

  // Reset or Start game round
  const startNewRound = useCallback(
    (startingPlayerToSet: Player, roundNum: number) => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }

      playResetSound(config.soundEnabled);

      setBoard(Array(9).fill(null));
      setWinResult({ winner: null, line: null });
      setIsWinnerModalOpen(false);
      setIsAiThinking(false);
      setIsRematchRequestedByMe(false);
      setIsRematchRequestedByOpponent(false);

      setRoundStartingPlayer(startingPlayerToSet);
      setCurrentPlayer(startingPlayerToSet);

      flashTurnBanner(roundNum, startingPlayerToSet);

      // Single-player AI: If AI starts first
      if (
        !peerManager.isConnected() &&
        config.mode.startsWith('ai') &&
        startingPlayerToSet === config.aiSymbol
      ) {
        setIsAiThinking(true);
        aiTimeoutRef.current = window.setTimeout(() => {
          let move = 4; // center
          if (config.mode === 'ai-easy') {
            move = Math.floor(Math.random() * 9);
          } else if (config.mode === 'ai-hard') {
            const openings = [0, 2, 4, 6, 8];
            move = openings[Math.floor(Math.random() * openings.length)];
          }

          const freshBoard: Board = Array(9).fill(null);
          freshBoard[move] = config.aiSymbol;
          setBoard(freshBoard);
          playMoveSound(config.aiSymbol, config.soundEnabled);
          triggerHaptic('light', config.hapticsEnabled);

          setCurrentPlayer(config.playerSymbol);
          setIsAiThinking(false);
        }, 500);
      }
    },
    [config, flashTurnBanner]
  );

  // Initialize Online Multiplayer & Peer Listeners
  useEffect(() => {
    const isConn = peerManager.isConnected();
    setIsOnlineMultiplayer(isConn);
    const role = peerManager.getRole();
    setOnlineRole(role);

    if (isConn) {
      setScreen('game');
      onUpdateConfig({ mode: 'pvp' });

      // Open coin toss modal if not initiated
      if (!coinFlipInitiatedRef.current) {
        setIsCoinFlipModalOpen(true);
        setCoinTossPhase('choose');
        coinFlipInitiatedRef.current = true;
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
      } else if (msg.type === 'FLIP_COIN_CHOICE') {
        // Opponent picked HEAD or TAIL first!
        const oppChoice = msg.playerChoice || 'head';
        const myAssignedChoice: 'head' | 'tail' = oppChoice === 'head' ? 'tail' : 'head';
        const outcome = msg.coinFlip || (Math.random() < 0.5 ? 'head' : 'tail');
        const winner = msg.coinWinner || 'X';

        setOpponentCoinChoice(oppChoice);
        setMyCoinChoice(myAssignedChoice);
        setFirstPicker('opponent');
        setCoinTossPhase('spinning');
        setIsCoinFlipModalOpen(true);
        playCoinSpinSound(config.soundEnabled);
        triggerHaptic('medium', config.hapticsEnabled);

        // Synchronize landing
        if (tossTimeoutRef.current) clearTimeout(tossTimeoutRef.current);
        tossTimeoutRef.current = window.setTimeout(() => {
          setCoinOutcome(outcome);
          setCoinTossWinner(winner);
          setCoinTossPhase('landed');

          const roleToken: Player = peerManager.getRole() === 'client' ? 'O' : 'X';
          playCoinDingSound(winner === roleToken, config.soundEnabled);
          triggerHaptic(winner === roleToken ? 'success' : 'medium', config.hapticsEnabled);

          if (tossFinishTimeoutRef.current) clearTimeout(tossFinishTimeoutRef.current);
          tossFinishTimeoutRef.current = window.setTimeout(() => {
            setIsCoinFlipModalOpen(false);
            startNewRound(winner, 1);
          }, 1800);
        }, 1800);
      } else if (msg.type === 'REMATCH_REQ') {
        // Opponent wants rematch
        setIsRematchRequestedByOpponent(true);
        triggerHaptic('light', config.hapticsEnabled);
      } else if (msg.type === 'REMATCH_ACCEPT') {
        // Opponent accepted our rematch request
        setIsRematchRequestedByMe(false);
        setIsRematchRequestedByOpponent(false);
        const nextStarter = msg.startingPlayer || 'X';
        const roundNum = msg.roundNumber || stats.totalGames + 1;
        startNewRound(nextStarter, roundNum);
      } else if (msg.type === 'REMATCH_CANCEL') {
        setIsRematchRequestedByOpponent(false);
      } else if (msg.type === 'OPPONENT_LEFT') {
        setIsRematchRequestedByMe(false);
        setIsRematchRequestedByOpponent(false);
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
  }, [config.soundEnabled, config.hapticsEnabled, onUpdateConfig, startNewRound, stats.totalGames]);

  // Notify opponent if the tab is closed / refreshed
  useEffect(() => {
    if (!isOnlineMultiplayer) return;
    const handleUnload = () => peerManager.leaveRoom();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [isOnlineMultiplayer]);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) clearTimeout(aiTimeoutRef.current);
      if (tossTimeoutRef.current) clearTimeout(tossTimeoutRef.current);
      if (tossFinishTimeoutRef.current) clearTimeout(tossFinishTimeoutRef.current);
      if (turnBannerTimeoutRef.current) clearTimeout(turnBannerTimeoutRef.current);
    };
  }, []);

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

      // Allow 450ms for user to see the winning line before modal opens
      setTimeout(() => {
        setIsWinnerModalOpen(true);
      }, 450);
    },
    [config, onUpdateStats]
  );

  // Handle User Coin Toss Choice (Head / Tail)
  const handleUserChooseCoin = (choice: 'head' | 'tail') => {
    if (coinTossPhase !== 'choose') return;

    playClickSound(config.soundEnabled);
    triggerHaptic('medium', config.hapticsEnabled);

    const otherChoice: 'head' | 'tail' = choice === 'head' ? 'tail' : 'head';
    setMyCoinChoice(choice);
    setOpponentCoinChoice(otherChoice);
    setFirstPicker('me');
    setCoinTossPhase('spinning');
    playCoinSpinSound(config.soundEnabled);

    // Calculate synchronized coin result
    const outcome: 'head' | 'tail' = Math.random() < 0.5 ? 'head' : 'tail';
    const isHost = onlineRole === 'host';
    const myTok: Player = isHost ? 'X' : 'O';
    const oppTok: Player = isHost ? 'O' : 'X';
    const tossWinner: Player = outcome === choice ? myTok : oppTok;

    // Send selection and outcome to peer
    peerManager.sendMessage({
      type: 'FLIP_COIN_CHOICE',
      playerChoice: choice,
      chosenByRole: onlineRole,
      coinFlip: outcome,
      coinWinner: tossWinner,
    });

    // Animate spin and land
    if (tossTimeoutRef.current) clearTimeout(tossTimeoutRef.current);
    tossTimeoutRef.current = window.setTimeout(() => {
      setCoinOutcome(outcome);
      setCoinTossWinner(tossWinner);
      setCoinTossPhase('landed');

      playCoinDingSound(tossWinner === myTok, config.soundEnabled);
      triggerHaptic(tossWinner === myTok ? 'success' : 'medium', config.hapticsEnabled);

      if (tossFinishTimeoutRef.current) clearTimeout(tossFinishTimeoutRef.current);
      tossFinishTimeoutRef.current = window.setTimeout(() => {
        setIsCoinFlipModalOpen(false);
        startNewRound(tossWinner, 1);
      }, 1800);
    }, 1800);
  };

  // Handle Cell Click (Local & Online P2P)
  const handleCellClick = (index: number) => {
    if (board[index] !== null || winResult.winner !== null || isAiThinking) {
      return;
    }

    // Online P2P: check turn
    if (isOnlineMultiplayer) {
      if (currentPlayer !== myToken) {
        return;
      }

      peerManager.sendMessage({
        type: 'MOVE_TICTACTOE',
        index,
        player: myToken,
      });
    } else {
      // AI mode: check turn
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

    // AI Turn Trigger
    if (!isOnlineMultiplayer && config.mode.startsWith('ai') && nextPlayer === config.aiSymbol) {
      setIsAiThinking(true);

      aiTimeoutRef.current = window.setTimeout(() => {
        let aiMove = -1;

        if (config.mode === 'ai-easy') {
          aiMove = getEasyAIMove(newBoard);
        } else if (config.mode === 'ai-medium') {
          aiMove = getMediumAIMove(newBoard, config.aiSymbol);
        } else {
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

  // Handle Emote
  const handleSendEmote = (emote: string) => {
    playClickSound(config.soundEnabled);
    triggerHaptic('light', config.hapticsEnabled);
    peerManager.sendMessage({ type: 'EMOTE', emote });
    setIncomingEmote(`You: ${emote}`);
    setTimeout(() => setIncomingEmote(null), 2000);
  };

  // Handle Play Again / Rematch Click
  const handlePlayAgain = () => {
    const nextStarter = calculateNextStarter(winResult, roundStartingPlayer);
    const nextRoundNum = stats.totalGames + 1;

    if (isOnlineMultiplayer) {
      if (isRematchRequestedByOpponent) {
        // Opponent had already requested, so this click accepts the rematch!
        peerManager.sendMessage({
          type: 'REMATCH_ACCEPT',
          startingPlayer: nextStarter,
          roundNumber: nextRoundNum,
        });
        startNewRound(nextStarter, nextRoundNum);
      } else {
        // We are the first to request rematch
        setIsRematchRequestedByMe(true);
        peerManager.sendMessage({
          type: 'REMATCH_REQ',
          startingPlayer: nextStarter,
        });
      }
    } else {
      // Local / AI
      startNewRound(nextStarter, nextRoundNum);
    }
  };

  const handleCancelRematch = () => {
    setIsRematchRequestedByMe(false);
    if (isOnlineMultiplayer) {
      peerManager.sendMessage({ type: 'REMATCH_CANCEL' });
    }
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

  // Called by the in-game online lobby once a P2P link is established.
  const handleOnlineConnected = () => {
    setIsOnlineMultiplayer(true);
    setOnlineRole(peerManager.getRole());
    onUpdateConfig({ mode: 'pvp' });
    setScreen('game');
    if (!coinFlipInitiatedRef.current) {
      setIsCoinFlipModalOpen(true);
      setCoinTossPhase('choose');
      coinFlipInitiatedRef.current = true;
    }
  };

  const handleLeaveRoom = () => {
    playClickSound(config.soundEnabled);
    if (isOnlineMultiplayer) {
      peerManager.leaveRoom();
    } else {
      peerManager.cleanup();
    }
    setIsOpponentLeftModalOpen(false);
    onBackToHub();
  };

  return (
    <div className="flex-1 w-full flex flex-col justify-between relative overflow-hidden">
      {/* Top Header */}
      <div className="w-full px-4 pt-2 flex items-center justify-between z-20">
        <button
          onClick={handleLeaveRoom}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 text-[11px] font-orbitron font-bold flex items-center gap-1 cursor-pointer"
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
            startNewRound(config.startingPlayer, 1);
            setScreen('game');
          }}
          onStartOnline={() => setScreen('online-lobby')}
          onBack={() => onBackToHub()}
          onOpenRules={() => setIsRulesModalOpen(true)}
          onOpenStats={() => setIsStatsModalOpen(true)}
          onToggleSound={onToggleSound}
        />
      )}

      {/* Screen 2.5: Online Lobby (create / join room) */}
      {screen === 'online-lobby' && (
        <TicTacToeOnlineModal
          onBack={() => setScreen('menu')}
          onConnected={handleOnlineConnected}
        />
      )}

      {/* Screen 3: Game Screen & HUD */}
      {screen === 'game' && (
        <div className="flex-1 flex flex-col justify-between py-1 relative overflow-hidden">
          {/* Cyber lighting */}
          <div className="absolute top-1/3 -left-16 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 -right-16 w-44 h-44 bg-pink-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Scoreboard HUD */}
          <ScoreBoard
            config={config}
            stats={stats}
            currentPlayer={currentPlayer}
            isAiThinking={isAiThinking}
            onReset={() => startNewRound(roundStartingPlayer, stats.totalGames + 1)}
            onBackToMenu={() => setScreen('menu')}
            onToggleSound={onToggleSound}
            onOpenStats={() => setIsStatsModalOpen(true)}
            onOpenRules={() => setIsRulesModalOpen(true)}
            isOnlineMultiplayer={isOnlineMultiplayer}
            onlineRole={onlineRole}
          />

          {/* ⚡ Dynamic Turn Notification Flash Banner */}
          <AnimatePresence>
            {turnAnnouncement && (
              <motion.div
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full px-4 flex justify-center z-30 pointer-events-none mt-1"
              >
                <div
                  className={`px-4 py-1.5 rounded-full border flex items-center gap-2 shadow-xl backdrop-blur-md ${
                    turnAnnouncement.isMyTurn
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]'
                      : 'bg-slate-950/90 border-slate-700 text-slate-300 shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                  }`}
                >
                  <Zap
                    className={`w-3.5 h-3.5 ${
                      turnAnnouncement.isMyTurn ? 'text-emerald-400 fill-emerald-400 animate-pulse' : 'text-amber-400'
                    }`}
                  />
                  <span className="text-[11px] font-orbitron font-black tracking-wider">
                    {turnAnnouncement.isMyTurn
                      ? `ROUND ${turnAnnouncement.round}: YOUR TURN (${turnAnnouncement.starter})`
                      : `ROUND ${turnAnnouncement.round}: OPPONENT'S TURN (${turnAnnouncement.starter})`}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3x3 Animated Neon Grid */}
          <GameBoard
            board={board}
            winResult={winResult}
            currentPlayer={currentPlayer}
            isAiThinking={isAiThinking}
            disabled={winResult.winner !== null}
            onCellClick={handleCellClick}
            isMyTurn={isMyCurrentTurn}
            isOnlineMultiplayer={isOnlineMultiplayer}
          />

          {/* Online Emotes & React */}
          {isOnlineMultiplayer && (
            <div className="w-full px-4 py-1 flex flex-col items-center gap-1.5 z-20">
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

          {/* Celebration Winner Modal with Next Turn Preview */}
          <WinnerModal
            isOpen={isWinnerModalOpen}
            winResult={winResult}
            config={config}
            stats={stats}
            onPlayAgain={handlePlayAgain}
            onCancelRematch={handleCancelRematch}
            onMainMenu={() => {
              setIsWinnerModalOpen(false);
              setScreen('menu');
            }}
            onOpenStats={() => {
              setIsWinnerModalOpen(false);
              setIsStatsModalOpen(true);
            }}
            isOnlineMultiplayer={isOnlineMultiplayer}
            onlineRole={onlineRole}
            isRematchRequestedByMe={isRematchRequestedByMe}
            isRematchRequestedByOpponent={isRematchRequestedByOpponent}
            nextStartingPlayer={nextStartingPlayer}
          />

          {/* 🪙 Synchronized Online Coin Toss Modal */}
          {isCoinFlipModalOpen && isOnlineMultiplayer && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md"
            >
              <div className="bg-slate-900/95 border border-cyan-500/50 rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full shadow-2xl relative overflow-hidden">
                {/* Glow backdrop */}
                <div className="absolute -top-16 inset-x-0 h-28 bg-cyan-400 blur-3xl opacity-20 pointer-events-none" />

                <h2 className="text-2xl font-black font-orbitron tracking-wide text-cyan-400 mb-1">
                  🪙 TOSS FOR 1ST MOVE
                </h2>
                <p className="text-xs text-slate-300 mb-5">
                  {coinTossPhase === 'choose'
                    ? 'First player to pick gets their choice, other gets the remaining side!'
                    : firstPicker === 'me'
                    ? `You chose ${myCoinChoice?.toUpperCase()}! Opponent is ${opponentCoinChoice?.toUpperCase()}`
                    : `Opponent picked ${opponentCoinChoice?.toUpperCase()}! You are ${myCoinChoice?.toUpperCase()}`}
                </p>

                {/* 3D Spinning Coin Visual */}
                <div className="my-5 flex justify-center items-center h-28 perspective-1000">
                  <motion.div
                    animate={
                      coinTossPhase === 'spinning'
                        ? {
                            rotateY: [0, 1800],
                            scale: [1, 1.25, 1],
                          }
                        : {
                            rotateY: coinOutcome === 'tail' ? 180 : 0,
                            scale: 1,
                          }
                    }
                    transition={{
                      duration: coinTossPhase === 'spinning' ? 1.8 : 0.4,
                      ease: 'easeInOut',
                    }}
                    className="w-24 h-24 rounded-full border-4 border-amber-400 bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 shadow-[0_0_30px_rgba(251,191,36,0.6)] flex items-center justify-center text-slate-950 font-black font-orbitron select-none relative"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">
                        {coinTossPhase === 'landed'
                          ? coinOutcome === 'head'
                            ? '👤'
                            : '👑'
                          : '🪙'}
                      </span>
                      <span className="text-xs font-black tracking-wider text-slate-900">
                        {coinTossPhase === 'landed'
                          ? coinOutcome?.toUpperCase()
                          : 'TOSS'}
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Status Badges or Choice Buttons */}
                {coinTossPhase === 'choose' ? (
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] font-orbitron font-bold text-slate-400 uppercase tracking-wider">
                      Tap Your Call Now:
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleUserChooseCoin('head')}
                        className="py-3 px-4 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border-2 border-cyan-400 text-cyan-300 font-black font-orbitron text-xs flex flex-col items-center gap-1 shadow-lg cursor-pointer"
                      >
                        <span className="text-xl">👤</span>
                        <span>HEAD</span>
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleUserChooseCoin('tail')}
                        className="py-3 px-4 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border-2 border-pink-400 text-pink-300 font-black font-orbitron text-xs flex flex-col items-center gap-1 shadow-lg cursor-pointer"
                      >
                        <span className="text-xl">👑</span>
                        <span>TAIL</span>
                      </motion.button>
                    </div>
                  </div>
                ) : coinTossPhase === 'spinning' ? (
                  <div className="py-2.5 px-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center gap-2 text-xs font-orbitron text-amber-300 font-bold animate-pulse">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>COIN IS FLIPPING IN THE AIR...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 animate-fadeIn">
                    <div className="py-2 px-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-orbitron font-bold text-slate-300 flex items-center justify-between">
                      <span>LANDED ON:</span>
                      <span className="text-amber-400 text-sm font-black">
                        {coinOutcome?.toUpperCase()}
                      </span>
                    </div>

                    <div
                      className={`py-2.5 px-4 rounded-xl border font-orbitron font-black text-xs flex items-center justify-center gap-2 ${
                        coinTossWinner === myToken
                          ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                          : 'bg-slate-950/80 border-slate-700 text-slate-400'
                      }`}
                    >
                      {coinTossWinner === myToken ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>🎉 YOU WON TOSS! YOU GO FIRST ({myToken})</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span>OPPONENT WON TOSS! OPPONENT GOES FIRST ({opponentToken})</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Opponent Left Modal */}
          {isOpponentLeftModalOpen && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm"
            >
              <motion.div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 text-center max-w-sm w-full shadow-2xl">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold font-orbitron text-rose-400 mb-1">OPPONENT LEFT</h2>
                <p className="text-xs text-slate-300 mb-5">Your opponent disconnected from the match.</p>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full py-3 bg-rose-500/20 border border-rose-400 text-rose-300 font-bold rounded-xl hover:bg-rose-500/30 transition text-xs font-orbitron cursor-pointer"
                >
                  BACK TO ARCADE
                </button>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {/* Stats and Rules Modals */}
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
