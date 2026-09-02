import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LudoColor, LudoPlayer, LudoThemeMode, LudoToken } from '../../types/ludo';
import { LudoBoard } from './ludo/LudoBoard';
import {
  LUDO_COLOR_THEMES,
  COLOR_START_INDICES,
} from '../../utils/ludoConstants';
import {
  canTokenMove,
  getSelectableTokens,
  getAnimationSteps,
  getNextTurnColor,
  checkCapture,
  willTokenReachHome,
} from '../../utils/ludoRules';
import {
  ArrowLeft,
  Crown,
  RotateCcw,
  Volume2,
  VolumeX,
  Palette,
  Sparkles,
  Zap,
  AlertTriangle,
  User,
  Radio,
  Wifi,
  Users,
} from 'lucide-react';
import {
  playClickSound,
  playDiceRollSound,
  playTokenHopSound,
  playTokenUnlockSound,
  playTokenKillSound,
  playHomeEntrySound,
  playTripleSixCancelSound,
  playTurnAlertSound,
  triggerHaptic,
  playWinSound,
} from '../../utils/audio';
import { MultiplayerLobbyModal } from '../MultiplayerLobbyModal';
import { peerManager } from '../../utils/peerManager';
import { MultiplayerMessage, MultiplayerStatus } from '../../types';

interface NeonLudoGameProps {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

// Initial default state for 4 players with exact integer cell coordinates for yard nests
const createInitialPlayers = (): LudoPlayer[] => [
  {
    color: 'red',
    name: 'Red (P1)',
    type: 'human',
    avatar: '🔴',
    tokensHome: 0,
    rank: null,
    tokens: [
      { id: 0, color: 'red', step: -1, position: { r: 1, c: 1 }, isHome: false, isInYard: true },
      { id: 1, color: 'red', step: -1, position: { r: 1, c: 4 }, isHome: false, isInYard: true },
      { id: 2, color: 'red', step: -1, position: { r: 4, c: 1 }, isHome: false, isInYard: true },
      { id: 3, color: 'red', step: -1, position: { r: 4, c: 4 }, isHome: false, isInYard: true },
    ],
  },
  {
    color: 'green',
    name: 'Green (P2)',
    type: 'human',
    avatar: '🟢',
    tokensHome: 0,
    rank: null,
    tokens: [
      { id: 0, color: 'green', step: -1, position: { r: 1, c: 10 }, isHome: false, isInYard: true },
      { id: 1, color: 'green', step: -1, position: { r: 1, c: 13 }, isHome: false, isInYard: true },
      { id: 2, color: 'green', step: -1, position: { r: 4, c: 10 }, isHome: false, isInYard: true },
      { id: 3, color: 'green', step: -1, position: { r: 4, c: 13 }, isHome: false, isInYard: true },
    ],
  },
  {
    color: 'yellow',
    name: 'Yellow (P3)',
    type: 'human',
    avatar: '🟡',
    tokensHome: 0,
    rank: null,
    tokens: [
      { id: 0, color: 'yellow', step: -1, position: { r: 10, c: 10 }, isHome: false, isInYard: true },
      { id: 1, color: 'yellow', step: -1, position: { r: 10, c: 13 }, isHome: false, isInYard: true },
      { id: 2, color: 'yellow', step: -1, position: { r: 13, c: 10 }, isHome: false, isInYard: true },
      { id: 3, color: 'yellow', step: -1, position: { r: 13, c: 13 }, isHome: false, isInYard: true },
    ],
  },
  {
    color: 'blue',
    name: 'Blue (P4)',
    type: 'human',
    avatar: '🔵',
    tokensHome: 0,
    rank: null,
    tokens: [
      { id: 0, color: 'blue', step: -1, position: { r: 10, c: 1 }, isHome: false, isInYard: true },
      { id: 1, color: 'blue', step: -1, position: { r: 10, c: 4 }, isHome: false, isInYard: true },
      { id: 2, color: 'blue', step: -1, position: { r: 13, c: 1 }, isHome: false, isInYard: true },
      { id: 3, color: 'blue', step: -1, position: { r: 13, c: 4 }, isHome: false, isInYard: true },
    ],
  },
];

type TurnState = 'waiting_roll' | 'rolling' | 'select_token' | 'animating' | 'round_done';

export const NeonLudoGame: React.FC<NeonLudoGameProps> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
}) => {
  const [theme, setTheme] = useState<LudoThemeMode>('cyber');
  const [players, setPlayers] = useState<LudoPlayer[]>(createInitialPlayers);
  const [currentTurnColor, setCurrentTurnColor] = useState<LudoColor>('red');
  const [turnState, setTurnState] = useState<TurnState>('waiting_roll');
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [consecutiveSixes, setConsecutiveSixes] = useState<number>(0);
  const [selectableTokenIds, setSelectableTokenIds] = useState<number[]>([]);
  const [statusBanner, setStatusBanner] = useState<{
    text: string;
    type: 'normal' | 'bonus' | 'kill' | 'warning' | 'home';
  }>({
    text: 'Red Player Turn: Roll the Dice to start!',
    type: 'normal',
  });

  // Online Multiplayer State
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<MultiplayerStatus>(peerManager.getStatus());
  const [latency, setLatency] = useState<number>(0);

  const isAnimatingRef = useRef(false);

  const currentPlayer = players.find((p) => p.color === currentTurnColor) || players[0];
  const colorTheme = LUDO_COLOR_THEMES[currentTurnColor];

  // Subscribe to peerManager events for Live Online Ludo Duel
  useEffect(() => {
    const unsubStatus = peerManager.onStatus((st) => {
      setOnlineStatus(st);
      if (st === 'connected') {
        const role = peerManager.getRole();
        setStatusBanner({
          text: `Online Opponent Connected! You are ${role === 'host' ? 'Host (Red)' : 'Guest (Green)'}.`,
          type: 'bonus',
        });
      }
    });

    const unsubLatency = peerManager.onLatency((ms) => {
      setLatency(ms);
    });

    const unsubMsg = peerManager.onMessage((msg: MultiplayerMessage) => {
      if (msg.type === 'LUDO_ROLL' && msg.diceValue !== undefined) {
        handleRollDice(msg.diceValue, false);
      } else if (msg.type === 'LUDO_MOVE' && msg.tokenId !== undefined && msg.diceValue !== undefined) {
        const p = players.find((pl) => pl.color === (msg.color || currentTurnColor));
        const tok = p?.tokens.find((t) => t.id === msg.tokenId);
        if (tok) {
          handleExecuteTokenMove(tok, msg.diceValue, false);
        }
      } else if (msg.type === 'LUDO_REMATCH') {
        handleResetMatch(false);
      }
    });

    return () => {
      unsubStatus();
      unsubLatency();
      unsubMsg();
    };
  }, [players, currentTurnColor]);

  // Helper to switch turn to next player
  const passTurnToNextPlayer = useCallback(
    (reason?: string) => {
      setConsecutiveSixes(0);
      setDiceValue(null);
      setSelectableTokenIds([]);
      setTurnState('waiting_roll');

      const nextCol = getNextTurnColor(currentTurnColor, players);
      setCurrentTurnColor(nextCol);
      playTurnAlertSound(true, soundEnabled);

      const nextTheme = LUDO_COLOR_THEMES[nextCol];
      setStatusBanner({
        text: reason
          ? `${reason} Now ${nextTheme.name}'s turn!`
          : `${nextTheme.name}'s turn! Roll the dice.`,
        type: 'normal',
      });
    },
    [currentTurnColor, players, soundEnabled]
  );

  // Main Dice Roll Handler
  const handleRollDice = (forcedValue?: number, broadcast: boolean = true) => {
    if (turnState !== 'waiting_roll' || isAnimatingRef.current) return;

    setTurnState('rolling');
    playDiceRollSound(soundEnabled);
    triggerHaptic('light');

    // Simulate 3D dice roll duration
    setTimeout(() => {
      const rolledNumber = forcedValue !== undefined ? forcedValue : Math.floor(Math.random() * 6) + 1;
      setDiceValue(rolledNumber);

      if (broadcast && peerManager.isConnected()) {
        peerManager.sendMessage({
          type: 'LUDO_ROLL',
          diceValue: rolledNumber,
          color: currentTurnColor,
        });
      }

      // Handle 3 consecutive 6s penalty
      if (rolledNumber === 6) {
        const nextSixCount = consecutiveSixes + 1;
        setConsecutiveSixes(nextSixCount);

        if (nextSixCount >= 3) {
          playTripleSixCancelSound(soundEnabled);
          triggerHaptic('heavy');
          setStatusBanner({
            text: `⚠️ TRIPLE 6 PENALTY! 3 sixes in a row cancels turn for ${colorTheme.name}.`,
            type: 'warning',
          });
          setTimeout(() => {
            passTurnToNextPlayer('Triple 6 penalty!');
          }, 1200);
          return;
        }
      } else {
        setConsecutiveSixes(0);
      }

      // Check which tokens can move
      const movableTokens = getSelectableTokens(currentPlayer, rolledNumber);

      if (movableTokens.length === 0) {
        // No moves possible
        setStatusBanner({
          text: `Rolled ${rolledNumber}. No legal moves available for ${colorTheme.name}.`,
          type: 'normal',
        });
        setTimeout(() => {
          passTurnToNextPlayer();
        }, 1000);
      } else if (movableTokens.length === 1) {
        // Auto-move single eligible token
        setSelectableTokenIds([movableTokens[0].id]);
        setTurnState('select_token');
        setStatusBanner({
          text: `Rolled ${rolledNumber}! Auto-moving the only available token...`,
          type: 'normal',
        });
        setTimeout(() => {
          handleExecuteTokenMove(movableTokens[0], rolledNumber, broadcast);
        }, 300);
      } else {
        // Multiple choices: player must tap glowing token
        setSelectableTokenIds(movableTokens.map((t) => t.id));
        setTurnState('select_token');
        setStatusBanner({
          text: `Rolled ${rolledNumber}! Select one of your ${movableTokens.length} highlighted tokens to move.`,
          type: 'normal',
        });
        triggerHaptic('medium');
      }
    }, 450);
  };

  // Move Token Execution with Smooth Hop Animation & Capture Check
  const handleExecuteTokenMove = async (token: LudoToken, roll: number, broadcast: boolean = true) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    setTurnState('animating');
    setSelectableTokenIds([]);

    if (broadcast && peerManager.isConnected()) {
      peerManager.sendMessage({
        type: 'LUDO_MOVE',
        tokenId: token.id,
        diceValue: roll,
        color: token.color,
      });
    }

    const initialStep = token.step;

    // 1. If unlocking from Yard (step -1 to step 0)
    if (initialStep === -1 && roll === 6) {
      playTokenUnlockSound(soundEnabled);
      triggerHaptic('medium');

      setPlayers((prev) =>
        prev.map((pl) =>
          pl.color === token.color
            ? {
                ...pl,
                tokens: pl.tokens.map((t) =>
                  t.id === token.id
                    ? {
                        ...t,
                        step: 0,
                        isInYard: false,
                        isHome: false,
                      }
                    : t
                ),
              }
            : pl
        )
      );

      // Check capture on starting tile
      const startIndex = COLOR_START_INDICES[token.color];
      const victims = checkCapture(startIndex, token.color, players);
      let capturedBonus = false;

      if (victims.length > 0) {
        playTokenKillSound(soundEnabled);
        triggerHaptic('heavy');
        capturedBonus = true;
        setPlayers((prev) =>
          prev.map((pl) => {
            const victim = victims.find((v) => v.color === pl.color);
            if (!victim) return pl;
            return {
              ...pl,
              tokens: pl.tokens.map((t) =>
                t.id === victim.tokenId
                  ? {
                      ...t,
                      step: -1,
                      isInYard: true,
                      isHome: false,
                    }
                  : t
              ),
            };
          })
        );
      }

      setStatusBanner({
        text: `🚀 Token unlocked to Start! ${colorTheme.name} gets a BONUS ROLL for rolling 6!`,
        type: 'bonus',
      });

      isAnimatingRef.current = false;
      setTurnState('waiting_roll');
      return;
    }

    // 2. Normal Step-by-step Movement along track
    const animationPath = getAnimationSteps(initialStep, roll);
    const finalStep = animationPath[animationPath.length - 1];

    for (let i = 0; i < animationPath.length; i++) {
      const stepVal = animationPath[i];
      setPlayers((prev) =>
        prev.map((pl) =>
          pl.color === token.color
            ? {
                ...pl,
                tokens: pl.tokens.map((t) =>
                  t.id === token.id ? { ...t, step: stepVal } : t
                ),
              }
            : pl
        )
      );

      playTokenHopSound(soundEnabled);
      await new Promise((res) => setTimeout(res, 95));
    }

    // 3. Check Post-Move Events
    const reachedHomeBonus = willTokenReachHome(initialStep, roll);
    let captureBonus = false;

    if (reachedHomeBonus) {
      // Reached Center Home (Victory point)
      playHomeEntrySound(soundEnabled);
      triggerHaptic('success');
      setPlayers((prev) =>
        prev.map((pl) =>
          pl.color === token.color
            ? {
                ...pl,
                tokensHome: pl.tokensHome + 1,
                tokens: pl.tokens.map((t) =>
                  t.id === token.id ? { ...t, step: 56, isHome: true } : t
                ),
              }
            : pl
        )
      );
      setStatusBanner({
        text: `🌟 TOKEN HOME! ${colorTheme.name} scores 1 token! BONUS ROLL awarded!`,
        type: 'home',
      });
    } else {
      // Check capture on final track tile
      const capturedVictims = checkCapture(finalStep, token.color, players);
      if (capturedVictims.length > 0) {
        playTokenKillSound(soundEnabled);
        triggerHaptic('heavy');
        captureBonus = true;

        setStatusBanner({
          text: `💥 CAPTURE! ${colorTheme.name} sent ${capturedVictims.length} opponent token(s) back to base! BONUS ROLL!`,
          type: 'kill',
        });

        setPlayers((prev) =>
          prev.map((pl) => {
            const victim = capturedVictims.find((v) => v.color === pl.color);
            if (!victim) return pl;
            return {
              ...pl,
              tokens: pl.tokens.map((t) =>
                t.id === victim.tokenId
                  ? {
                      ...t,
                      step: -1,
                      isInYard: true,
                      isHome: false,
                    }
                  : t
              ),
            };
          })
        );
      }
    }

    // 4. Check Match Win (all 4 tokens home)
    const updatedHomeCount =
      token.color === currentPlayer.color && finalStep === 56
        ? currentPlayer.tokensHome + 1
        : currentPlayer.tokensHome;

    if (updatedHomeCount >= 4) {
      playWinSound(soundEnabled);
      triggerHaptic('success');
      setStatusBanner({
        text: `🏆 VICTORY! ${colorTheme.name.toUpperCase()} HAS WON THE MATCH!`,
        type: 'home',
      });
      setTurnState('round_done');
      isAnimatingRef.current = false;
      return;
    }

    // 5. Decide Extra Turn or Next Player
    const isSixBonus = roll === 6;
    const hasBonusTurn = isSixBonus || captureBonus || reachedHomeBonus;

    isAnimatingRef.current = false;

    if (hasBonusTurn) {
      setTurnState('waiting_roll');
      let bonusReason = 'Rolled a 6!';
      if (captureBonus) bonusReason = 'Opponent Token Captured!';
      if (reachedHomeBonus) bonusReason = 'Token Reached Home!';

      setStatusBanner({
        text: `⚡ BONUS TURN! (${bonusReason}) Roll again!`,
        type: 'bonus',
      });
      playTurnAlertSound(true, soundEnabled);
    } else {
      setTimeout(() => {
        passTurnToNextPlayer();
      }, 300);
    }
  };

  const handleResetMatch = (broadcast: boolean = true) => {
    playClickSound(soundEnabled);
    setPlayers(createInitialPlayers());
    setCurrentTurnColor('red');
    setTurnState('waiting_roll');
    setDiceValue(null);
    setConsecutiveSixes(0);
    setSelectableTokenIds([]);
    setStatusBanner({
      text: 'Match Reset! Red Player: Roll the dice to start.',
      type: 'normal',
    });

    if (broadcast && peerManager.isConnected()) {
      peerManager.sendMessage({
        type: 'LUDO_REMATCH',
      });
    }
  };

  const toggleTheme = () => {
    playClickSound(soundEnabled);
    setTheme((prev) => (prev === 'cyber' ? 'classic' : 'cyber'));
  };

  return (
    <div className="h-full w-full max-h-screen flex flex-col justify-between relative overflow-hidden bg-slate-950 text-white select-none">
      {/* 1. TOP BAR */}
      <div className="w-full h-9 px-2 sm:px-3 flex items-center justify-between z-20 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md shrink-0">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 text-[10px] font-orbitron font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>HUB</span>
        </button>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-amber-500/40 text-[10px] font-orbitron text-amber-300 font-bold shadow-[0_0_10px_rgba(245,158,11,0.2)]">
            <Crown className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>NEON LUDO KING</span>
          </div>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setShowMultiplayerModal(true);
            }}
            className={`px-2 py-0.5 rounded-full border text-[9.5px] font-orbitron font-bold flex items-center gap-1 cursor-pointer transition whitespace-nowrap ${
              onlineStatus === 'connected'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                : 'bg-gradient-to-r from-cyan-500/20 to-pink-500/20 border-cyan-400/60 text-cyan-300 hover:text-white'
            }`}
          >
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span>{onlineStatus === 'connected' ? `ONLINE (${latency}ms)` : 'ONLINE DUEL'}</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => handleResetMatch(true)}
            title="Reset Game"
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-red-400 cursor-pointer transition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={toggleTheme}
            title="Toggle Visual Theme"
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-amber-400 cursor-pointer transition"
          >
            <Palette className="w-3 h-3" />
          </button>
          <button
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
            className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 cursor-pointer transition"
          >
            {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 2. CENTER MAXIMIZED LUDO BOARD */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0 overflow-hidden px-1 py-1">
        <LudoBoard
          players={players}
          currentTurnColor={currentTurnColor}
          turnState={turnState}
          diceValue={diceValue}
          consecutiveSixes={consecutiveSixes}
          selectableTokenIds={selectableTokenIds}
          onTokenClick={(token) => {
            if (turnState === 'select_token' && selectableTokenIds.includes(token.id) && diceValue) {
              handleExecuteTokenMove(token, diceValue);
            }
          }}
          onRollDice={() => handleRollDice()}
          theme={theme}
        />
      </div>

      {/* 5. GAMEPLAY TICKER & STATUS CONTROLLER */}
      <div className="w-full px-2.5 py-1.5 bg-slate-900/95 border-t border-slate-800 z-20 flex items-center justify-between gap-2 shrink-0">
        {/* Real-time Status Alert Banner */}
        <div
          className={`flex-1 px-2.5 py-1 rounded-lg border text-[10px] font-semibold flex items-center justify-between shadow-inner transition-all overflow-hidden ${
            statusBanner.type === 'bonus'
              ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
              : statusBanner.type === 'warning'
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
              : statusBanner.type === 'home'
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-slate-950/90 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {statusBanner.type === 'bonus' && <Zap className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-bounce" />}
            {statusBanner.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            {statusBanner.type === 'home' && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
            {statusBanner.type === 'normal' && <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
            <span className="truncate">{statusBanner.text}</span>
          </div>
          <span
            className="text-[9px] font-orbitron font-bold px-1.5 py-0.2 rounded uppercase tracking-wider shrink-0 ml-1.5"
            style={{
              backgroundColor: colorTheme.neonDarkBg,
              color: colorTheme.neonColor,
            }}
          >
            {currentTurnColor}
          </span>
        </div>

        {/* Quick Test Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleRollDice(6)}
            disabled={turnState !== 'waiting_roll'}
            title="Force Roll 6 (Test Unlock / Bonus Turn)"
            className="px-1.5 py-1 rounded text-[9px] font-orbitron font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 cursor-pointer disabled:opacity-40 transition"
          >
            🎲 6
          </button>
          <button
            onClick={() => handleRollDice(1)}
            disabled={turnState !== 'waiting_roll'}
            title="Force Roll 1"
            className="px-1.5 py-1 rounded text-[9px] font-orbitron font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer disabled:opacity-40 transition"
          >
            🎲 1
          </button>
          <button
            onClick={() => passTurnToNextPlayer('Manual Skip')}
            disabled={turnState === 'animating'}
            title="Skip Turn"
            className="px-1.5 py-1 rounded text-[9px] font-orbitron font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40 transition"
          >
            SKIP
          </button>
        </div>
      </div>

      {/* ONLINE MULTIPLAYER LOBBY MODAL */}
      <MultiplayerLobbyModal
        isOpen={showMultiplayerModal}
        onClose={() => setShowMultiplayerModal(false)}
        initialGameType="ludo"
        onStartGame={() => {
          setShowMultiplayerModal(false);
          handleResetMatch(false);
        }}
      />
    </div>
  );
};
