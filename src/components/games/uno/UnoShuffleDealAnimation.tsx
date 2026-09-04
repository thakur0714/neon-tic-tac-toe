import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Layers } from 'lucide-react';
import { UnoCard, UnoPlayer, UnoTablePosition } from '../../../types/uno';
import { UnoCardView } from './UnoCardView';
import {
  playUnoRiffleShuffleSound,
  playUnoCardDealSound,
  playUnoCardPlaySound,
  triggerHaptic,
} from '../../../utils/audio';

interface UnoShuffleDealAnimationProps {
  players: UnoPlayer[];
  initialTopCard: UnoCard;
  soundEnabled: boolean;
  cardsPerPlayer?: number;
  onComplete: () => void;
}

interface FlyingCardItem {
  id: number;
  recipient: UnoPlayer;
  pos: UnoTablePosition;
}

type ShuffleStage = 'cut' | 'riffle' | 'bridge' | 'square';

export const UnoShuffleDealAnimation: React.FC<UnoShuffleDealAnimationProps> = ({
  players,
  initialTopCard,
  soundEnabled,
  cardsPerPlayer = 7,
  onComplete,
}) => {
  const [phase, setPhase] = useState<'shuffling' | 'dealing' | 'lead-card'>('shuffling');
  const [shuffleStage, setShuffleStage] = useState<ShuffleStage>('cut');
  const [currentRecipient, setCurrentRecipient] = useState<UnoPlayer | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCardItem[]>([]);
  const [playerDealtCounts, setPlayerDealtCounts] = useState<Record<string, number>>({});

  // 1. Shuffling Phase: Authentic 3D Deck Cut, Riffle Weave & Cascade Bridge (2.85s total)
  useEffect(() => {
    playUnoRiffleShuffleSound(soundEnabled);
    triggerHaptic('medium');

    // Stage 1: Deck Cut in 3D (0ms - 650ms)
    setShuffleStage('cut');

    // Stage 2: 3D Riffle Interleaving (650ms - 1800ms)
    const riffleTimer = setTimeout(() => {
      setShuffleStage('riffle');
      triggerHaptic('light');
    }, 650);

    // Stage 3: 3D Cascade Rainbow Bridge (1800ms - 2450ms)
    const bridgeTimer = setTimeout(() => {
      setShuffleStage('bridge');
      triggerHaptic('medium');
    }, 1800);

    // Stage 4: Deck Square & Snap on Table (2450ms - 2850ms)
    const squareTimer = setTimeout(() => {
      setShuffleStage('square');
      triggerHaptic('success');
    }, 2450);

    // Transition to Dealing Phase
    const finishShuffleTimer = setTimeout(() => {
      setPhase('dealing');
    }, 2850);

    return () => {
      clearTimeout(riffleTimer);
      clearTimeout(bridgeTimer);
      clearTimeout(squareTimer);
      clearTimeout(finishShuffleTimer);
    };
  }, [soundEnabled]);

  // 2. Dealing Phase: Deliberate round-robin deal with smooth 360° rotating cards
  useEffect(() => {
    if (phase !== 'dealing' || players.length === 0) return;

    const totalCardsToDeal = players.length * cardsPerPlayer;
    let dealtIndex = 0;
    const intervalMs = cardsPerPlayer <= 3 ? 370 : cardsPerPlayer <= 5 ? 400 : 430;

    const dealInterval = setInterval(() => {
      if (dealtIndex >= totalCardsToDeal) {
        clearInterval(dealInterval);
        setCurrentRecipient(null);
        setPhase('lead-card');
        return;
      }

      const recipientIndex = dealtIndex % players.length;
      const recipient = players[recipientIndex];

      setCurrentRecipient(recipient);

      // Launch new 360° spinning card towards recipient
      const newCard: FlyingCardItem = {
        id: dealtIndex,
        recipient,
        pos: recipient.position || 'bottom',
      };
      setFlyingCards((prev) => [...prev.slice(-3), newCard]);

      setPlayerDealtCounts((prev) => ({
        ...prev,
        [recipient.id]: (prev[recipient.id] || 0) + 1,
      }));

      playUnoCardDealSound(soundEnabled);
      triggerHaptic('light');

      dealtIndex++;
    }, intervalMs);

    return () => clearInterval(dealInterval);
  }, [phase, players, soundEnabled, cardsPerPlayer]);

  // 3. Lead Card Flip Phase: Dramatic presentation of the opening discard card
  useEffect(() => {
    if (phase !== 'lead-card') return;

    playUnoCardPlaySound(soundEnabled);
    triggerHaptic('success');

    const finishTimer = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => clearTimeout(finishTimer);
  }, [phase, soundEnabled, onComplete]);

  // Target trajectory coordinates from center (0, 0)
  const getFlyTargetStyles = (pos?: UnoTablePosition) => {
    switch (pos) {
      case 'bottom':
        return { x: 0, y: 180, scale: 1.02 };
      case 'top':
        return { x: 0, y: -180, scale: 0.65 };
      case 'left':
        return { x: -155, y: -20, scale: 0.65 };
      case 'right':
        return { x: 155, y: -20, scale: 0.65 };
      default:
        return { x: 0, y: 180, scale: 1.02 };
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-between p-4 bg-slate-950/95 backdrop-blur-md select-none overflow-hidden">
      {/* Top Header with Status (Clean, no skip button) */}
      <div className="w-full flex items-center justify-between gap-2 z-50">
        <div className="flex items-center gap-2 text-cyan-400 min-w-0">
          <Sparkles className="w-4 h-4 animate-spin text-pink-400 shrink-0" style={{ animationDuration: '3s' }} />
          <span className="font-orbitron font-bold text-[10px] sm:text-sm tracking-wider whitespace-nowrap truncate">
            {phase === 'shuffling'
              ? shuffleStage === 'cut'
                ? 'CUTTING DECK IN 3D...'
                : shuffleStage === 'riffle'
                ? 'RIFFLE SHUFFLING CARDS...'
                : shuffleStage === 'bridge'
                ? 'CASCADE BRIDGE FLUTTER...'
                : 'SQUARING DECK...'
              : phase === 'dealing'
              ? `DEALING TO ${currentRecipient ? currentRecipient.name : 'PLAYERS'}...`
              : 'FIRST CARD REVEAL!'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-[9px] sm:text-[10px] font-orbitron text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)] whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <span>CYBER UNO DEALER</span>
        </div>
      </div>

      {/* Opponents Preview Badges (Top / Left / Right) */}
      <div className="w-full max-w-lg flex justify-around items-center pt-2">
        {players.map((p) => {
          const count = playerDealtCounts[p.id] || 0;
          const isCurrentTarget = currentRecipient?.id === p.id && phase === 'dealing';
          return (
            <div
              key={p.id}
              className={`px-3 py-2 rounded-xl border flex flex-col items-center transition-all duration-200 ${
                isCurrentTarget
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.5)] scale-110 ring-2 ring-cyan-400'
                  : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isCurrentTarget ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                  }`}
                />
                <span className="text-[11px] font-orbitron font-bold text-white">
                  {p.name}
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5">
                {count > 0 ? `${count} / ${cardsPerPlayer} cards` : 'Ready'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Center Cinematic 3D Stage */}
      <div
        className="relative w-80 h-72 flex items-center justify-center"
        style={{ perspective: 1200, transformStyle: 'preserve-3d' }}
      >
        {/* Table Neon Pulsing Ring */}
        <div className="absolute w-64 h-64 rounded-full border-2 border-cyan-500/30 bg-radial from-cyan-900/30 via-slate-950/40 to-transparent animate-pulse" />

        {/* Dynamic 3D Table Shadow */}
        <motion.div
          animate={{
            scaleX: shuffleStage === 'cut' ? 1.6 : shuffleStage === 'bridge' ? 1.4 : 1,
            scaleY: shuffleStage === 'bridge' ? 0.7 : 1,
            opacity: shuffleStage === 'bridge' ? 0.25 : 0.55,
          }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-16 w-36 h-12 rounded-[50%] bg-black/70 blur-md pointer-events-none"
        />

        {/* Phase 1: Real 3D Deck Cut, Riffle & Cascade Bridge Simulation */}
        {phase === 'shuffling' && (
          <div
            className="relative flex items-center justify-center w-full h-full"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* 1. Left Half Deck Stack */}
            <motion.div
              animate={
                shuffleStage === 'cut'
                  ? {
                      x: -78,
                      y: -12,
                      rotateY: 28,
                      rotateZ: -16,
                      rotateX: 12,
                      scale: 1.02,
                    }
                  : shuffleStage === 'riffle'
                  ? {
                      x: -46,
                      y: -4,
                      rotateY: 16,
                      rotateZ: -8,
                      rotateX: 24,
                      scale: 1,
                    }
                  : shuffleStage === 'bridge'
                  ? {
                      x: -18,
                      y: -34,
                      rotateY: 8,
                      rotateZ: -24,
                      rotateX: -36,
                      scale: 1.04,
                    }
                  : {
                      x: 0,
                      y: 0,
                      rotateY: 0,
                      rotateZ: 0,
                      rotateX: 0,
                      scale: 1,
                    }
              }
              transition={{
                duration: shuffleStage === 'bridge' ? 0.5 : shuffleStage === 'square' ? 0.35 : 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute z-10 transform-gpu will-change-transform"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Stack thickness layers for 3D realism */}
              <div className="relative">
                <div className="absolute -top-1.5 -left-1 w-15 h-22 rounded-xl bg-slate-950 border border-red-500/30 -rotate-2" />
                <div className="absolute -top-0.5 -left-0.5 w-15 h-22 rounded-xl bg-slate-900 border border-red-500/40 rotate-1" />
                <div className="w-15 h-22 rounded-xl bg-gradient-to-br from-red-600 via-red-700 to-red-950 border-2 border-red-400 shadow-2xl flex flex-col items-center justify-center text-white font-orbitron font-black text-xs relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                  <span className="text-sm tracking-wider">U</span>
                  <span className="text-sm tracking-wider">N</span>
                  <span className="text-sm tracking-wider">O</span>
                </div>
              </div>
            </motion.div>

            {/* 2. Right Half Deck Stack */}
            <motion.div
              animate={
                shuffleStage === 'cut'
                  ? {
                      x: 78,
                      y: -12,
                      rotateY: -28,
                      rotateZ: 16,
                      rotateX: 12,
                      scale: 1.02,
                    }
                  : shuffleStage === 'riffle'
                  ? {
                      x: 46,
                      y: -4,
                      rotateY: -16,
                      rotateZ: 8,
                      rotateX: 24,
                      scale: 1,
                    }
                  : shuffleStage === 'bridge'
                  ? {
                      x: 18,
                      y: -34,
                      rotateY: -8,
                      rotateZ: 24,
                      rotateX: -36,
                      scale: 1.04,
                    }
                  : {
                      x: 0,
                      y: 0,
                      rotateY: 0,
                      rotateZ: 0,
                      rotateX: 0,
                      scale: 1,
                    }
              }
              transition={{
                duration: shuffleStage === 'bridge' ? 0.5 : shuffleStage === 'square' ? 0.35 : 0.45,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="absolute z-10 transform-gpu will-change-transform"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* Stack thickness layers for 3D realism */}
              <div className="relative">
                <div className="absolute -top-1.5 -right-1 w-15 h-22 rounded-xl bg-slate-950 border border-cyan-500/30 rotate-2" />
                <div className="absolute -top-0.5 -right-0.5 w-15 h-22 rounded-xl bg-slate-900 border border-cyan-500/40 -rotate-1" />
                <div className="w-15 h-22 rounded-xl bg-gradient-to-br from-cyan-600 via-blue-700 to-indigo-950 border-2 border-cyan-400 shadow-2xl flex flex-col items-center justify-center text-white font-orbitron font-black text-xs relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                  <span className="text-xs">WILD</span>
                  <span className="text-sm text-cyan-200">8</span>
                </div>
              </div>
            </motion.div>

            {/* 3. Center Riffle Weaving Cards (Visible during 'riffle' and 'bridge') */}
            {(shuffleStage === 'riffle' || shuffleStage === 'bridge') && (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
                  const isLeft = idx % 2 === 0;
                  return (
                    <motion.div
                      key={idx}
                      initial={{
                        x: isLeft ? -55 : 55,
                        y: -8,
                        rotateY: isLeft ? 22 : -22,
                        rotateZ: isLeft ? -10 : 10,
                        rotateX: 20,
                        opacity: 0.8,
                        scale: 0.96,
                      }}
                      animate={
                        shuffleStage === 'riffle'
                          ? {
                              x: [(isLeft ? -55 : 55), (isLeft ? -8 : 8), 0],
                              y: [-8, -2, 0],
                              rotateY: [(isLeft ? 22 : -22), (isLeft ? 6 : -6), 0],
                              rotateZ: [(isLeft ? -10 : 10), (isLeft ? -2 : 2), 0],
                              rotateX: [20, 8, 0],
                              opacity: 1,
                              scale: 1,
                            }
                          : {
                              // In bridge mode, cards arch upwards in an authentic rainbow bridge
                              x: isLeft ? -4 : 4,
                              y: -30 + Math.abs(idx - 3.5) * 3,
                              rotateX: -32,
                              rotateY: isLeft ? 5 : -5,
                              rotateZ: (idx - 3.5) * 4,
                              scale: 1.02,
                              opacity: 1,
                            }
                      }
                      transition={{
                        duration: shuffleStage === 'bridge' ? 0.45 : 0.65,
                        delay: shuffleStage === 'riffle' ? idx * 0.075 : 0,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="absolute w-14 h-21 rounded-xl border border-cyan-400/50 bg-slate-900 shadow-xl flex items-center justify-center transform-gpu"
                      style={{
                        zIndex: 15 + idx,
                        transformStyle: 'preserve-3d',
                      }}
                    >
                      <div className="w-11 h-17 rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
                        <span className="font-orbitron text-[10px] font-bold text-cyan-300/80 -rotate-12">
                          {isLeft ? 'UNO' : '8'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* 4. Deck Square Impact Flash (Triggered during 'square' step) */}
            {shuffleStage === 'square' && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 1.4, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="absolute w-28 h-28 rounded-full border-2 border-cyan-400 bg-cyan-500/20 pointer-events-none"
              />
            )}
          </div>
        )}

        {/* Phase 2: Deliberate Card Swipe / Deal Animation with 360° Rotation */}
        {phase === 'dealing' && (
          <div className="relative flex items-center justify-center">
            {/* Center Master Deck on table */}
            <div className="relative">
              <div className="absolute top-1.5 left-1.5 w-14 h-21 rounded-xl bg-slate-950 border border-cyan-500/20 -rotate-3" />
              <div className="absolute top-0.5 left-0.5 w-14 h-21 rounded-xl bg-slate-900 border border-cyan-500/30 rotate-2" />
              <UnoCardView isFaceDown size="md" />
            </div>

            {/* Flying Cards in Motion: full 360° rotation with GPU acceleration */}
            <AnimatePresence>
              {flyingCards.map((card) => {
                const target = getFlyTargetStyles(card.pos);
                return (
                  <motion.div
                    key={card.id}
                    initial={{
                      x: 0,
                      y: 0,
                      scale: 0.85,
                      rotate: 0,
                      opacity: 1,
                    }}
                    animate={{
                      x: target.x,
                      y: target.y,
                      scale: [0.85, 1.2, target.scale],
                      rotate: [0, 180, 360],
                      opacity: [1, 1, 1, 0.95],
                    }}
                    transition={{
                      duration: 0.46,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    onAnimationComplete={() => {
                      setFlyingCards((prev) => prev.filter((c) => c.id !== card.id));
                    }}
                    className="absolute z-30 pointer-events-none transform-gpu will-change-transform"
                    style={{
                      transformStyle: 'preserve-3d',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    <div className="relative w-14 h-21 rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 border-2 border-cyan-400 shadow-[0_0_18px_rgba(6,182,212,0.7)] flex items-center justify-center">
                      <div className="w-11 h-17 rounded-lg border border-cyan-500/40 flex items-center justify-center bg-cyan-950/40 relative overflow-hidden">
                        <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent rotate-45 animate-pulse" />
                        <span className="font-orbitron font-black text-cyan-300 text-xs tracking-wider -rotate-12 shadow-sm">
                          UNO
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Phase 3: Lead Card Flip Animation */}
        {phase === 'lead-card' && (
          <motion.div
            initial={{ scale: 0.2, rotateY: 180, y: -50, opacity: 0 }}
            animate={{ scale: 1.15, rotateY: 0, y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
            className="flex flex-col items-center gap-2 z-30"
          >
            <UnoCardView card={initialTopCard} size="lg" />
            <div className="px-4 py-1.5 rounded-full bg-slate-900/95 border border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-center">
              <span className="font-orbitron font-black text-xs text-cyan-300 block">
                FIRST PLAY: {initialTopCard.color.toUpperCase()} {initialTopCard.value}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="w-full text-center pb-2">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-orbitron font-bold text-slate-200">
            {phase === 'shuffling'
              ? shuffleStage === 'cut'
                ? 'Cutting deck in 3D perspective...'
                : shuffleStage === 'riffle'
                ? 'Interleaving cards from both sides in 3D...'
                : shuffleStage === 'bridge'
                ? 'Cascade rainbow bridge waterfall...'
                : 'Deck squared flush on table!'
              : phase === 'dealing'
              ? `Dealing round: ${playerDealtCounts[players[0]?.id] || 0} / ${cardsPerPlayer} cards in your hand`
              : 'Opening discard placed! Round starting...'}
          </span>
        </div>
      </div>
    </div>
  );
};
