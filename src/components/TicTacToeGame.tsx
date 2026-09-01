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
import { Grid, ArrowLeft } from 'lucide-react';

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

  // Secondary modals
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const aiTimeoutRef = useRef<number | null>(null);

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
      const initialPlayer = activeConfig.startingPlayer;

      setBoard(Array(9).fill(null));
      setCurrentPlayer(initialPlayer);
      setWinResult({ winner: null, line: null });
      setIsWinnerModalOpen(false);
      setIsAiThinking(false);

      // If AI moves first
      if (activeConfig.mode.startsWith('ai') && initialPlayer === activeConfig.aiSymbol) {
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
    },
    [config]
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

  // Handle Human Move
  const handleCellClick = (index: number) => {
    if (board[index] !== null || winResult.winner !== null || isAiThinking) {
      return;
    }

    // In AI mode, prevent human from playing if it's currently AI's turn
    if (config.mode.startsWith('ai') && currentPlayer !== config.playerSymbol) {
      return;
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
    if (config.mode.startsWith('ai') && nextPlayer === config.aiSymbol) {
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

  return (
    <div className="flex-1 w-full flex flex-col justify-between relative overflow-hidden">
      {/* Top Arcade Hub Return Header */}
      <div className="w-full px-4 pt-2 flex items-center justify-between z-20">
        <button
          onClick={() => {
            playClickSound(config.soundEnabled);
            onBackToHub();
          }}
          className="px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ARCADE HUB</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-cyan-500/30 text-[10px] font-orbitron text-cyan-300 font-bold">
          <Grid className="w-3 h-3 text-cyan-400" />
          <span>TIC-TAC-TOE</span>
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

          {/* Celebration Winner Modal */}
          <WinnerModal
            isOpen={isWinnerModalOpen}
            winResult={winResult}
            config={config}
            stats={stats}
            onPlayAgain={() => resetGameRound()}
            onMainMenu={() => {
              setIsWinnerModalOpen(false);
              setScreen('menu');
            }}
            onOpenStats={() => {
              setIsWinnerModalOpen(false);
              setIsStatsModalOpen(true);
            }}
          />
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
