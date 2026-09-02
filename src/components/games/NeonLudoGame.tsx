import React, { useState, useRef, useCallback, useEffect } from 'react';
import { LudoColor, LudoPlayer, LudoPlayerType, LudoThemeMode, LudoToken } from '../../types/ludo';
import { DEFAULT_SETUP, buildPlayers, LudoSetupConfig } from '../../utils/ludoSetup';
import { LudoSetupScreen } from './ludo/LudoSetupScreen';
import { pickAIMove } from '../../utils/ludoAI';
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
import { ludoRoomManager, LudoSnapshot } from '../../utils/ludoRoomManager';
import { LudoOnlineModal, LudoOnlineStartInfo } from './ludo/LudoOnlineModal';

interface NeonLudoGameProps {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

// Initial player state, derived from a seat config. Default = 4 local humans.
const createInitialPlayers = (
  seats: Record<LudoColor, LudoPlayerType> = DEFAULT_SETUP.seats
): LudoPlayer[] => buildPlayers(seats);

type TurnState = 'waiting_roll' | 'rolling' | 'select_token' | 'animating' | 'round_done';

export const NeonLudoGame: React.FC<NeonLudoGameProps> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
}) => {
  const [theme, setTheme] = useState<LudoThemeMode>('cyber');
  const [gameStage, setGameStage] = useState<'setup' | 'online-lobby' | 'playing'>('setup');
  const [setupConfig, setSetupConfig] = useState<LudoSetupConfig>(DEFAULT_SETUP);
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

  // Online Multiplayer State (see ludoRoomManager — host-authoritative star topology)
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [mySeat, setMySeat] = useState<LudoColor | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const isOnline = onlineRole !== null;
  const isHost = onlineRole === 'host';

  const isAnimatingRef = useRef(false);

  const currentPlayer = players.find((p) => p.color === currentTurnColor) || players[0];
  const colorTheme = LUDO_COLOR_THEMES[currentTurnColor];

  // Whose input is this client allowed to give right now?
  const myTurn = !isOnline || currentTurnColor === mySeat;

  const buildSnapshot = useCallback(
    (): LudoSnapshot => ({
      players,
      currentTurnColor,
      turnState,
      diceValue,
      consecutiveSixes,
      selectableTokenIds,
      statusText: statusBanner.text,
      statusType: statusBanner.type,
      winnerColor: turnState === 'round_done' ? currentTurnColor : null,
    }),
    [players, currentTurnColor, turnState, diceValue, consecutiveSixes, selectableTokenIds, statusBanner]
  );

  // HOST: push the authoritative snapshot after every settled state change.
  useEffect(() => {
    if (!isHost) return;
    if (turnState === 'animating' || turnState === 'rolling') return;
    ludoRoomManager.pushState(buildSnapshot());
  }, [isHost, turnState, diceValue, currentTurnColor, selectableTokenIds, players, statusBanner, buildSnapshot]);

  // Tear down any room when leaving the Ludo screen entirely.
  useEffect(() => () => ludoRoomManager.cleanup(), []);

  // Room events (both host and client).
  useEffect(() => {
    if (!isOnline) return;
    const unsubLat = ludoRoomManager.onLatency(setLatency);
    const unsubMsg = ludoRoomManager.onMessage((msg) => {
      if (msg.type === 'STATE' && !isHost) {
        const s = msg.snapshot;
        setPlayers(s.players);
        setCurrentTurnColor(s.currentTurnColor);
        setTurnState(s.turnState as TurnState);
        setDiceValue(s.diceValue);
        setConsecutiveSixes(s.consecutiveSixes);
        setSelectableTokenIds(s.selectableTokenIds);
        setStatusBanner({ text: s.statusText, type: s.statusType as any });
      } else if (msg.type === 'INTENT' && isHost) {
        if (msg.seat !== currentTurnColor) return; // not their turn
        if (msg.action === 'roll') {
          handleRollDice(undefined, false);
        } else if (msg.action === 'move' && msg.tokenId != null) {
          const p = players.find((pl) => pl.color === msg.seat);
          const tok = p?.tokens.find((t) => t.id === msg.tokenId);
          if (tok && selectableTokenIds.includes(tok.id)) handleExecuteTokenMove(tok, diceValue ?? 0, false);
        }
      } else if (msg.type === 'HOST_LEFT') {
        setStatusBanner({ text: 'Host left — room closed.', type: 'warning' });
        setTimeout(() => onBackToHub(), 1400);
      } else if (msg.type === 'HELLO' && isHost && msg.name.startsWith('__left__:')) {
        const seat = msg.name.split(':')[1] as LudoColor;
        setPlayers((prev) => prev.map((pl) => (pl.color === seat ? { ...pl, type: 'none' as LudoPlayerType } : pl)));
        setStatusBanner({ text: `${LUDO_COLOR_THEMES[seat].name} left the match.`, type: 'warning' });
        if (currentTurnColor === seat) setTimeout(() => passTurnToNextPlayer('Player left.'), 600);
      }
    });
    return () => {
      unsubLat();
      unsubMsg();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, isHost, currentTurnColor, players, selectableTokenIds, diceValue]);

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

  // ── CPU (AI) auto-play ────────────────────────────────────────────────
  // Drives the two inputs a human would give (roll, then pick a token) for any
  // seat whose type is 'ai'. All game rules still run through the same handlers.
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
    if (gameStage !== 'playing') return;
    if (isOnline && !isHost) return; // clients never simulate; host drives any 'ai' seat

    const cpu = players.find((p) => p.color === currentTurnColor);
    if (!cpu || cpu.type !== 'ai') return;
    if (isAnimatingRef.current) return;

    if (turnState === 'waiting_roll') {
      aiTimerRef.current = setTimeout(() => handleRollDice(undefined, false), 750);
    } else if (turnState === 'select_token' && diceValue != null && selectableTokenIds.length > 0) {
      aiTimerRef.current = setTimeout(() => {
        const pickedId = pickAIMove(cpu, diceValue, players, setupConfig.difficulty);
        const token =
          cpu.tokens.find((t) => t.id === pickedId && selectableTokenIds.includes(t.id)) ??
          cpu.tokens.find((t) => selectableTokenIds.includes(t.id));
        if (token) handleExecuteTokenMove(token, diceValue, false);
      }, 650);
    }

    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
        aiTimerRef.current = null;
      }
    };
    // handlers are stable enough for this effect's transitions; re-run on state change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStage, currentTurnColor, turnState, diceValue, selectableTokenIds, players, setupConfig.difficulty]);

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
      void broadcast; // online sync is push-based via ludoRoomManager.pushState (host only)

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
    void broadcast; // online sync is push-based via ludoRoomManager.pushState (host only)

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

      playTokenHopSound(1, soundEnabled);
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
    void broadcast;
    playClickSound(soundEnabled);
    // Online clients cannot reset — only the host reopens the room.
    if (isOnline && !isHost) return;
    if (isHost) {
      ludoRoomManager.reopenLobby();
      setOnlineRole(null);
      setMySeat(null);
      setGameStage('online-lobby');
      return;
    }
    setPlayers(createInitialPlayers(setupConfig.seats));
    setCurrentTurnColor('red');
    setTurnState('waiting_roll');
    setDiceValue(null);
    setConsecutiveSixes(0);
    setSelectableTokenIds([]);
    setStatusBanner({
      text: 'Match Reset! Red Player: Roll the dice to start.',
      type: 'normal',
    });
  };

  const handleStartGame = (config: LudoSetupConfig) => {
    setSetupConfig(config);
    if (config.mode === 'online') {
      setGameStage('online-lobby');
      return;
    }
    setPlayers(createInitialPlayers(config.seats));
    setCurrentTurnColor('red');
    setTurnState('waiting_roll');
    setDiceValue(null);
    setConsecutiveSixes(0);
    setSelectableTokenIds([]);
    setStatusBanner({ text: 'Red Player Turn: Roll the Dice to start!', type: 'normal' });
    setGameStage('playing');
  };

  const handleOnlineEnterGame = (info: LudoOnlineStartInfo) => {
    const filled = new Set(info.seats.map((s) => s.color));
    const seats = (['red', 'green', 'yellow', 'blue'] as LudoColor[]).reduce((acc, color) => {
      acc[color] = !filled.has(color) ? 'none' : color === info.mySeat ? 'human' : 'online';
      return acc;
    }, {} as Record<LudoColor, LudoPlayerType>);

    const built = createInitialPlayers(seats).map((p) => {
      const s = info.seats.find((x) => x.color === p.color);
      return s ? { ...p, name: s.name } : p;
    });

    setOnlineRole(info.role);
    setMySeat(info.mySeat);
    setPlayers(built);
    setCurrentTurnColor('red');
    setTurnState('waiting_roll');
    setDiceValue(null);
    setConsecutiveSixes(0);
    setSelectableTokenIds([]);
    setStatusBanner({ text: 'Online match started! Red rolls first.', type: 'bonus' });
    setGameStage('playing');
  };

  const toggleTheme = () => {
    playClickSound(soundEnabled);
    setTheme((prev) => (prev === 'cyber' ? 'classic' : 'cyber'));
  };

  if (gameStage === 'setup') {
    return (
      <LudoSetupScreen
        onStart={handleStartGame}
        onBack={onBackToHub}
        onSound={() => playClickSound(soundEnabled)}
      />
    );
  }

  if (gameStage === 'online-lobby') {
    return (
      <LudoOnlineModal
        open
        playerCount={setupConfig.playerCount}
        onBack={() => {
          ludoRoomManager.cleanup();
          setGameStage('setup');
        }}
        onEnterGame={handleOnlineEnterGame}
      />
    );
  }

  return (
    <div className="h-full w-full max-h-screen flex flex-col justify-between relative overflow-hidden bg-slate-950 text-white select-none">
      {/* 1. TOP BAR */}
      <div className="w-full h-9 px-2 sm:px-3 flex items-center justify-between z-20 border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md shrink-0">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            ludoRoomManager.cleanup();
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

          {isOnline && (
            <span className="px-2 py-0.5 rounded-full border text-[9.5px] font-orbitron font-bold flex items-center gap-1 whitespace-nowrap bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <Radio className="w-3 h-3 text-emerald-300 animate-pulse" />
              <span>ONLINE · {latency}ms</span>
            </span>
          )}
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
          turnState={turnState === 'round_done' ? 'animating' : turnState}
          diceValue={diceValue}
          consecutiveSixes={consecutiveSixes}
          selectableTokenIds={selectableTokenIds}
          onTokenClick={(token) => {
            if (currentPlayer.type === 'ai' || !myTurn) return;
            if (turnState !== 'select_token' || !selectableTokenIds.includes(token.id) || !diceValue) return;
            if (isOnline && !isHost) {
              ludoRoomManager.sendIntent('move', token.id);
              return;
            }
            handleExecuteTokenMove(token, diceValue);
          }}
          onRollDice={() => {
            if (currentPlayer.type === 'ai' || !myTurn || turnState !== 'waiting_roll') return;
            if (isOnline && !isHost) {
              ludoRoomManager.sendIntent('roll');
              return;
            }
            handleRollDice();
          }}
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

        {/* Turn Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {(!isOnline || (isHost && currentPlayer.type !== 'human')) && (
            <button
              onClick={() => passTurnToNextPlayer('Manual Skip')}
              disabled={turnState === 'animating'}
              title="Skip Turn"
              className="px-1.5 py-1 rounded text-[9px] font-orbitron font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 cursor-pointer disabled:opacity-40 transition"
            >
              SKIP
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
