import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCcw,
  Users,
  Bot,
  Globe,
  Trophy,
  Award,
  Crown,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CarromAIDifficulty,
  CarromGameMode,
  CarromPiece,
  CarromPlayType,
  CarromPlayer,
  ShotIntent,
} from '../../../types/carrom';
import {
  BOARD_SIZE,
  canPlaceStrikerAt,
  createInitialPieces,
  createStriker,
  stepPhysics,
} from '../../../utils/carromPhysics';
import { calculateCarromAIShot } from '../../../utils/carromAI';
import { carromRoomManager } from '../../../utils/carromRoomManager';
import {
  playCarromClackSound,
  playCarromFoulSound,
  playCarromPocketSound,
  playCarromStrikeSound,
  playClickSound,
  playWinSound,
  triggerHaptic,
} from '../../../utils/audio';
import { triggerConfetti } from '../../../utils/confetti';
import { CarromBoard } from './CarromBoard';
import { CarromControls } from './CarromControls';
import { CarromOnlineModal } from './CarromOnlineModal';
import { CarromSetupScreen, CarromSetupConfig } from './CarromSetupScreen';

interface NeonCarromGameProps {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const NeonCarromGame: React.FC<NeonCarromGameProps> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
}) => {
  // Game Setup Stage ('setup' or 'playing')
  const [gameStage, setGameStage] = useState<'setup' | 'playing'>('setup');

  // Game Setup State
  const [playType, setPlayType] = useState<CarromPlayType>('vs-ai');
  const [gameMode, setGameMode] = useState<CarromGameMode>('disc-pool');
  const [aiDifficulty, setAiDifficulty] = useState<CarromAIDifficulty>('medium');
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Board & Pieces State
  const [pieces, setPieces] = useState<CarromPiece[]>(() => createInitialPieces());
  const [currentTurn, setCurrentTurn] = useState<'player1' | 'player2'>('player1');
  const [strikerSliderX, setStrikerSliderX] = useState(0.5);
  const [striker, setStriker] = useState<CarromPiece>(() => createStriker('player1', 0.5));

  // Aiming & Motion State
  const [aimAngle, setAimAngle] = useState(currentTurn === 'player1' ? -Math.PI / 2 : Math.PI / 2);
  const [aimPower, setAimPower] = useState(0.65);
  const [isAiming, setIsAiming] = useState(true);
  const [isMoving, setIsMoving] = useState(false);

  // Score & Status
  const [player1, setPlayer1] = useState<CarromPlayer>({
    id: 'p1',
    name: 'Player 1',
    assignedType: 'white',
    score: 0,
    isHost: true,
  });
  const [player2, setPlayer2] = useState<CarromPlayer>({
    id: 'p2',
    name: 'Smart Bot',
    assignedType: 'black',
    score: 0,
    isHost: false,
    isAI: true,
  });

  const [statusMessage, setStatusMessage] = useState<string>('Your Turn - Position striker & aim!');
  const [winner, setWinner] = useState<'player1' | 'player2' | null>(null);
  const [turnTimer, setTurnTimer] = useState(25);

  // Pocketed coins tracked in current shot
  const pocketedInCurrentShotRef = useRef<CarromPiece[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isSimulatingRef = useRef(false);

  // ── Sync Striker Baseline Position when slider changes ──────────
  useEffect(() => {
    if (!isMoving) {
      setStriker(createStriker(currentTurn, strikerSliderX));
    }
  }, [strikerSliderX, currentTurn, isMoving]);

  // Striker placement safety check
  const canPlaceHere = canPlaceStrikerAt(striker.x, striker.y, pieces);

  // ── Start from Mode Selection Screen ────────────────────────────
  const handleStartFromSetup = useCallback((config: CarromSetupConfig) => {
    setPlayType(config.playType);
    setGameMode(config.gameMode);
    setAiDifficulty(config.aiDifficulty);

    if (config.playType === 'online') {
      setIsOnlineModalOpen(true);
      return;
    }

    if (config.playType === 'vs-ai') {
      const userIsWhite = config.userPuck === 'white';
      setPlayer1({
        id: 'p1',
        name: userIsWhite ? 'You' : `Bot (${config.aiDifficulty.toUpperCase()})`,
        assignedType: 'white',
        score: 0,
        isHost: true,
        isAI: !userIsWhite,
      });
      setPlayer2({
        id: 'p2',
        name: userIsWhite ? `Bot (${config.aiDifficulty.toUpperCase()})` : 'You',
        assignedType: 'black',
        score: 0,
        isHost: false,
        isAI: userIsWhite,
      });
    } else {
      // Pass & Play (Local 2P)
      setPlayer1({
        id: 'p1',
        name: 'Player 1',
        assignedType: 'white',
        score: 0,
        isHost: true,
        isAI: false,
      });
      setPlayer2({
        id: 'p2',
        name: 'Player 2',
        assignedType: 'black',
        score: 0,
        isHost: false,
        isAI: false,
      });
    }

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isSimulatingRef.current = false;
    const newPieces = createInitialPieces();
    setPieces(newPieces);
    setCurrentTurn('player1');
    setStrikerSliderX(0.5);
    setStriker(createStriker('player1', 0.5));
    setAimAngle(-Math.PI / 2);
    setAimPower(0.65);
    setIsAiming(true);
    setIsMoving(false);
    setWinner(null);
    setStatusMessage('Match started! Strike when ready.');
    setTurnTimer(25);
    setGameStage('playing');
  }, []);

  // ── Initialize or Reset Board ────────────────────────────────────
  const handleResetGame = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    isSimulatingRef.current = false;
    const newPieces = createInitialPieces();
    setPieces(newPieces);
    setCurrentTurn('player1');
    setStrikerSliderX(0.5);
    setStriker(createStriker('player1', 0.5));
    setAimAngle(-Math.PI / 2);
    setAimPower(0.65);
    setIsAiming(true);
    setIsMoving(false);
    setWinner(null);
    setStatusMessage('New Game! Player 1 (White) begins.');
    setPlayer1((p) => ({ ...p, score: 0 }));
    setPlayer2((p) => ({ ...p, score: 0 }));
    setTurnTimer(25);
  }, []);

  // ── Online Room Listener Setup ───────────────────────────────────
  useEffect(() => {
    const unsubMsg = carromRoomManager.onMessage((msg) => {
      if (msg.type === 'STRIKE_ACTION') {
        // Opponent took a shot
        handleExecuteShot(msg.intent, false);
      } else if (msg.type === 'SYNC_STATE') {
        setWinner(msg.snapshot.winner);
        setStatusMessage(msg.snapshot.statusText);
      } else if (msg.type === 'REMATCH_REQ') {
        setStatusMessage('Opponent requested rematch!');
      }
    });

    return () => {
      unsubMsg();
    };
  }, []);

  // ── Execute Physics Strike ───────────────────────────────────────
  const handleExecuteShot = useCallback(
    (intent: ShotIntent, broadcast = true) => {
      if (isSimulatingRef.current) return;

      // Place striker exactly as commanded
      const initialStriker = createStriker(currentTurn, intent.strikerX);
      const impulse = 9.0 + intent.power * 22.0;
      initialStriker.vx = Math.cos(intent.angle) * impulse;
      initialStriker.vy = Math.sin(intent.angle) * impulse;

      setStriker(initialStriker);
      setIsMoving(true);
      setIsAiming(false);
      isSimulatingRef.current = true;
      pocketedInCurrentShotRef.current = [];

      playCarromStrikeSound(intent.power, soundEnabled);
      triggerHaptic('medium');

      // Send online broadcast if playing online
      if (broadcast && playType === 'online') {
        carromRoomManager.sendStrikeAction(intent);
      }

      // Physics Loop
      let currentStrikerState = { ...initialStriker };
      let currentPieces = [...pieces];

      const runPhysicsStep = () => {
        const { hasMovement, pocketedThisStep } = stepPhysics(
          currentPieces,
          currentStrikerState,
          (droppedPiece) => {
            playCarromPocketSound(droppedPiece.type === 'queen', soundEnabled);
            triggerHaptic('success');
            pocketedInCurrentShotRef.current.push(droppedPiece);
          }
        );

        if (pocketedThisStep.length > 0) {
          triggerHaptic('light');
        }

        // Random subtle clack audio on movement
        if (Math.random() < 0.04 && hasMovement) {
          playCarromClackSound(0.5, soundEnabled);
        }

        // Re-render
        setPieces([...currentPieces]);
        setStriker({ ...currentStrikerState });

        if (hasMovement) {
          animFrameRef.current = requestAnimationFrame(runPhysicsStep);
        } else {
          // Simulation Finished -> Evaluate Turn Outcome
          isSimulatingRef.current = false;
          setIsMoving(false);
          finishTurnEvaluation(currentPieces, currentStrikerState);
        }
      };

      animFrameRef.current = requestAnimationFrame(runPhysicsStep);
    },
    [currentTurn, pieces, soundEnabled, playType]
  );

  // ── Turn Resolution & Rule Evaluation ───────────────────────────
  const finishTurnEvaluation = (finalPieces: CarromPiece[], finalStriker: CarromPiece) => {
    const pocketed = pocketedInCurrentShotRef.current;
    const isP1 = currentTurn === 'player1';
    const myType = isP1 ? player1.assignedType : player2.assignedType;
    const oppType = isP1 ? player2.assignedType : player1.assignedType;

    let strikerPocketed = finalStriker.isPocketed;
    let myCoinsPocketed = pocketed.filter((p) => p.type === myType).length;
    let oppCoinsPocketed = pocketed.filter((p) => p.type === oppType).length;
    let queenPocketed = pocketed.some((p) => p.type === 'queen');

    // Update Scores
    if (gameMode === 'disc-pool') {
      if (myCoinsPocketed > 0) {
        if (isP1) setPlayer1((p) => ({ ...p, score: p.score + myCoinsPocketed }));
        else setPlayer2((p) => ({ ...p, score: p.score + myCoinsPocketed }));
      }
      if (oppCoinsPocketed > 0) {
        if (isP1) setPlayer2((p) => ({ ...p, score: p.score + oppCoinsPocketed }));
        else setPlayer1((p) => ({ ...p, score: p.score + oppCoinsPocketed }));
      }
      if (queenPocketed) {
        if (isP1) setPlayer1((p) => ({ ...p, score: p.score + 2 }));
        else setPlayer2((p) => ({ ...p, score: p.score + 2 }));
      }
    } else {
      // Classic Points: White = 20, Black = 10, Queen = 50
      let pointsEarned = 0;
      pocketed.forEach((p) => {
        if (p.type === 'white') pointsEarned += 20;
        if (p.type === 'black') pointsEarned += 10;
        if (p.type === 'queen') pointsEarned += 50;
      });
      if (isP1) setPlayer1((p) => ({ ...p, score: p.score + pointsEarned }));
      else setPlayer2((p) => ({ ...p, score: p.score + pointsEarned }));
    }

    // Check Win Condition
    const remainingWhite = finalPieces.filter((p) => p.type === 'white' && !p.isPocketed).length;
    const remainingBlack = finalPieces.filter((p) => p.type === 'black' && !p.isPocketed).length;

    let gameWon: 'player1' | 'player2' | null = null;
    if (gameMode === 'disc-pool') {
      if (remainingWhite === 0) gameWon = 'player1';
      else if (remainingBlack === 0) gameWon = 'player2';
    } else {
      // Classic mode ends when all pieces are cleared
      const remainingTotal = finalPieces.filter((p) => !p.isPocketed).length;
      if (remainingTotal === 0) {
        gameWon = player1.score >= player2.score ? 'player1' : 'player2';
      }
    }

    if (gameWon) {
      setWinner(gameWon);
      playWinSound(soundEnabled);
      triggerConfetti();
      setStatusMessage(`🏆 Match Won by ${gameWon === 'player1' ? player1.name : player2.name}!`);
      return;
    }

    // Handle Striker Foul (striker pocketed)
    if (strikerPocketed) {
      playCarromFoulSound(soundEnabled);
      setStatusMessage(`⚠️ Foul! Striker Pocketed by ${isP1 ? player1.name : player2.name}`);
      // Striker respawned at next player's baseline
    } else if (myCoinsPocketed > 0 || queenPocketed) {
      // Extra turn for successful pocket
      setStatusMessage(`🎯 Nice Pocket! ${isP1 ? player1.name : player2.name} earns an EXTRA TURN!`);
      setIsAiming(true);
      setStrikerSliderX(0.5);
      setStriker(createStriker(currentTurn, 0.5));
      return;
    } else {
      setStatusMessage(`${isP1 ? player2.name : player1.name}'s turn to strike.`);
    }

    // Pass turn to opponent
    const nextTurn = isP1 ? 'player2' : 'player1';
    setCurrentTurn(nextTurn);
    setIsAiming(true);
    setStrikerSliderX(0.5);
    setStriker(createStriker(nextTurn, 0.5));
    setAimAngle(nextTurn === 'player1' ? -Math.PI / 2 : Math.PI / 2);
    setTurnTimer(25);
  };

  // ── AI Bot Trigger ───────────────────────────────────────────────
  useEffect(() => {
    if (playType !== 'vs-ai' || isMoving || winner || gameStage !== 'playing') return;
    const activePlayer = currentTurn === 'player1' ? player1 : player2;
    if (!activePlayer.isAI) return;

    setStatusMessage(`${activePlayer.name} is aiming…`);
    const timer = setTimeout(() => {
      const shot = calculateCarromAIShot(pieces, activePlayer.assignedType, aiDifficulty);
      setStrikerSliderX(shot.strikerX);
      setAimAngle(shot.angle);
      setAimPower(shot.power);

      setTimeout(() => {
        handleExecuteShot(shot, false);
      }, 500);
    }, 750);

    return () => clearTimeout(timer);
  }, [currentTurn, playType, isMoving, winner, pieces, player1, player2, aiDifficulty, gameStage, handleExecuteShot]);

  // Turn Countdown Timer
  useEffect(() => {
    if (isMoving || winner || gameStage !== 'playing') return;
    const interval = setInterval(() => {
      setTurnTimer((t) => {
        if (t <= 1) {
          // Time-out: Auto pass turn
          setCurrentTurn((prev) => (prev === 'player1' ? 'player2' : 'player1'));
          setStatusMessage('Time out! Turn passed.');
          return 25;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isMoving, winner, currentTurn, gameStage]);

  // Is it my turn to play?
  const activePlayer = currentTurn === 'player1' ? player1 : player2;
  const isMyTurn =
    playType === 'pass-and-play'
      ? true
      : playType === 'online'
      ? (carromRoomManager.getMySeat() || 'player1') === currentTurn
      : !activePlayer.isAI;

  if (gameStage === 'setup') {
    return (
      <div className="h-full w-full max-w-[430px] mx-auto bg-slate-950 flex flex-col relative select-none">
        <CarromSetupScreen
          onStart={handleStartFromSetup}
          onBack={onBackToHub}
          onOpenRules={() => setShowRulesModal(true)}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          onSound={() => playClickSound(soundEnabled)}
        />

        {/* Rules Modal */}
        {showRulesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-cyan-500/30 p-5 text-slate-200 flex flex-col gap-3 shadow-[0_0_30px_rgba(6,182,212,0.25)]">
              <h3 className="text-base font-black text-cyan-400 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Carrom Pool Rules
              </h3>
              <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
                <li>
                  <strong>Striker Placement:</strong> Slide striker across your baseline. It must not overlap any coin on board.
                </li>
                <li>
                  <strong>Aim & Power:</strong> Touch and drag striker backwards (slingshot) or use the bottom power meter to strike!
                </li>
                <li>
                  <strong>Disc Pool Mode:</strong> Pocket all 9 of your assigned coins (White vs Black) to win.
                </li>
                <li>
                  <strong>Extra Turn:</strong> Pocketing your coin or the Queen awards an instant extra strike.
                </li>
                <li>
                  <strong>Foul Penalty:</strong> If striker enters a pocket, a foul is called and turn is passed.
                </li>
              </ul>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase mt-2 cursor-pointer transition-colors"
              >
                Got it!
              </button>
            </div>
          </div>
        )}

        {/* Online Multiplayer Room Modal */}
        <CarromOnlineModal
          isOpen={isOnlineModalOpen}
          onClose={() => setIsOnlineModalOpen(false)}
          onGameStarted={() => {
            setPlayType('online');
            handleResetGame();
            setGameStage('playing');
          }}
          gameMode={gameMode}
          onModeChange={setGameMode}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-[430px] mx-auto bg-slate-950 text-slate-100 select-none">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onBackToHub}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Hub</span>
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound(soundEnabled);
              setGameStage('setup');
            }}
            className="px-2 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-cyan-400 text-[11px] font-orbitron font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Change Game Mode"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Mode</span>
          </button>
        </div>

        {/* Current Mode Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[10px] font-orbitron font-bold">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-slate-300">
            {playType === 'vs-ai'
              ? `vs AI (${aiDifficulty.toUpperCase()})`
              : playType === 'pass-and-play'
              ? 'Pass & Play'
              : 'Online Room'}
          </span>
        </div>

        {/* Quick Tools */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Rules"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleResetGame}
            className="p-1.5 rounded-xl text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="Restart Match"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scoreboard & Turn HUD */}
      <div className="px-3 py-2 grid grid-cols-12 gap-2 items-center bg-slate-900/40">
        {/* Player 1 Card (Bottom Baseline / White) */}
        <div
          className={`col-span-5 flex items-center gap-2 p-2 rounded-2xl border transition-all ${
            currentTurn === 'player1'
              ? 'bg-cyan-950/40 border-cyan-400/60 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/50 border-slate-800 opacity-70'
          }`}
        >
          <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-amber-300 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[10px] font-black text-slate-900">W</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 truncate">{player1.name}</span>
              <span className="text-sm font-black text-cyan-400">{player1.score}</span>
            </div>
            <span className="text-[9px] text-slate-400 block">White Coins</span>
          </div>
        </div>

        {/* Turn Indicator & Countdown */}
        <div className="col-span-2 flex flex-col items-center justify-center">
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            TURN
          </span>
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-black border ${
              turnTimer <= 5
                ? 'bg-rose-950/80 border-rose-500 text-rose-400 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            {turnTimer}s
          </div>
        </div>

        {/* Player 2 / AI Card (Top Baseline / Black) */}
        <div
          className={`col-span-5 flex items-center gap-2 p-2 rounded-2xl border transition-all ${
            currentTurn === 'player2'
              ? 'bg-rose-950/40 border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
              : 'bg-slate-900/50 border-slate-800 opacity-70'
          }`}
        >
          <div className="min-w-0 flex-1 text-right">
            <div className="flex items-center justify-between flex-row-reverse">
              <span className="text-xs font-bold text-slate-200 truncate">{player2.name}</span>
              <span className="text-sm font-black text-rose-400">{player2.score}</span>
            </div>
            <span className="text-[9px] text-slate-400 block">Black Coins</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-slate-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[10px] font-black text-slate-200">B</span>
          </div>
        </div>
      </div>

      {/* 3. Event / Status Message */}
      <div className="px-3 py-1 bg-slate-900/80 border-y border-slate-800/80 text-center">
        <span className="text-xs font-medium text-amber-300/90 tracking-wide">
          {statusMessage}
        </span>
      </div>

      {/* 4. Center Carrom Board Canvas */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <CarromBoard
          pieces={pieces}
          striker={striker}
          currentTurn={currentTurn}
          isAiming={isAiming}
          isMoving={isMoving}
          aimAngle={aimAngle}
          aimPower={aimPower}
          isMyTurn={isMyTurn}
          onAimChange={(angle, power) => {
            setAimAngle(angle);
            setAimPower(power);
          }}
          onFireShot={handleExecuteShot}
          strikerSliderX={strikerSliderX}
          onSliderChange={setStrikerSliderX}
          soundEnabled={soundEnabled}
        />
      </div>

      {/* 5. Bottom Controls Bar */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/95">
        <CarromControls
          strikerSliderX={strikerSliderX}
          onSliderChange={setStrikerSliderX}
          aimAngle={aimAngle}
          onAngleChange={setAimAngle}
          aimPower={aimPower}
          onPowerChange={setAimPower}
          onFireShot={handleExecuteShot}
          disabled={isMoving || !!winner}
          isMyTurn={isMyTurn}
          canPlaceHere={canPlaceHere}
        />
      </div>

      {/* 6. Online Multiplayer Room Modal */}
      <CarromOnlineModal
        isOpen={isOnlineModalOpen}
        onClose={() => setIsOnlineModalOpen(false)}
        onGameStarted={() => {
          setPlayType('online');
          handleResetGame();
        }}
        gameMode={gameMode}
        onModeChange={setGameMode}
      />

      {/* 7. Winner Victory Modal */}
      {winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 p-6 text-center shadow-[0_0_50px_rgba(245,158,11,0.3)] flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)] animate-bounce">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
                VICTORY!
              </h3>
              <p className="text-sm font-bold text-slate-200 mt-1">
                {winner === 'player1' ? player1.name : player2.name} Wins the Match!
              </p>
            </div>

            <div className="flex items-center gap-6 py-2 px-4 rounded-2xl bg-slate-800/60 border border-slate-700">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">P1 Score</span>
                <span className="text-base font-black text-cyan-400">{player1.score}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block font-semibold">P2 Score</span>
                <span className="text-base font-black text-rose-400">{player2.score}</span>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleResetGame}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                Rematch
              </button>
              <button
                type="button"
                onClick={() => setGameStage('setup')}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
              >
                Mode
              </button>
              <button
                type="button"
                onClick={onBackToHub}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider active:scale-95 transition-all cursor-pointer"
              >
                Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Rules & How to Play Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-cyan-500/30 p-5 text-slate-200 flex flex-col gap-3">
            <h3 className="text-base font-black text-cyan-400 flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              Carrom Pool Rules
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
              <li>
                <strong>Striker Placement:</strong> Slide striker across your baseline. It must not overlap any coin on board.
              </li>
              <li>
                <strong>Aim & Power:</strong> Touch and drag striker backwards (slingshot) or use the bottom power meter to strike!
              </li>
              <li>
                <strong>Disc Pool Mode:</strong> Player 1 is White, Player 2 is Black. Pocket all your assigned coins to win.
              </li>
              <li>
                <strong>Extra Turn:</strong> Pocketing your coin or the Queen awards an instant extra strike.
              </li>
              <li>
                <strong>Foul Penalty:</strong> If striker enters a pocket, a foul is called and turn is passed.
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs uppercase mt-2 cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
