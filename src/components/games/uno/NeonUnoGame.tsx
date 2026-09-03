import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  RotateCw,
  RotateCcw,
  Sparkles,
  Trophy,
  AlertCircle,
  Zap,
  Radio,
  Users,
  Eye,
  EyeOff,
  Wifi,
  Shield,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  UnoCard,
  UnoCardColor,
  UnoDirection,
  UnoDifficulty,
  UnoPlayType,
  UnoPlayer,
  UnoTablePosition,
  UnoOnlineSnapshot,
  UnoRoomMessage,
} from '../../../types/uno';
import { generateUnoDeck, replenishDrawPile, shuffleCards } from '../../../utils/unoDeck';
import {
  isValidCardPlay,
  hasValidMoveInHand,
  getNextTurnIndex,
  isWildCard,
  calculateHandScore,
} from '../../../utils/unoRules';
import { decideAIMove } from '../../../utils/unoAI';
import { unoRoomManager } from '../../../utils/unoRoomManager';
import { UnoCardView } from './UnoCardView';
import { UnoColorPickerModal } from './UnoColorPickerModal';
import { UnoSetupScreen, UnoStartConfig } from './UnoSetupScreen';
import { UnoOnlineModal, UnoOnlineStartInfo } from './UnoOnlineModal';
import { UnoShuffleDealAnimation } from './UnoShuffleDealAnimation';
import {
  playClickSound,
  playUnoCardPlaySound,
  playUnoDrawSound,
  playUnoColorSwitchSound,
  playUnoAlertSound,
  playUnoPenaltySound,
  playWinSound,
  triggerHaptic,
} from '../../../utils/audio';

interface NeonUnoGameProps {
  onBackToHub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const COLOR_PILL: Record<UnoCardColor, { bg: string; border: string; text: string; label: string }> = {
  red: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', label: 'RED' },
  blue: { bg: 'bg-cyan-500/20', border: 'border-cyan-400', text: 'text-cyan-300', label: 'BLUE' },
  green: { bg: 'bg-emerald-500/20', border: 'border-emerald-400', text: 'text-emerald-300', label: 'GREEN' },
  yellow: { bg: 'bg-amber-500/20', border: 'border-amber-400', text: 'text-amber-300', label: 'YELLOW' },
  wild: { bg: 'bg-purple-500/20', border: 'border-purple-400', text: 'text-purple-300', label: 'WILD' },
};

const SEAT_COLORS = ['cyan', 'pink', 'amber', 'emerald'];

export const NeonUnoGame: React.FC<NeonUnoGameProps> = ({
  onBackToHub,
  soundEnabled,
  onToggleSound,
}) => {
  // Navigation & Mode
  const [isInSetup, setIsInSetup] = useState<boolean>(true);
  const [playType, setPlayType] = useState<UnoPlayType>('vs-ai');
  const [isOnlineModalOpen, setIsOnlineModalOpen] = useState<boolean>(false);
  const [cardEightWild, setCardEightWild] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<UnoDifficulty>('pro');
  const [privacyVeilEnabled, setPrivacyVeilEnabled] = useState<boolean>(true);
  const [showPrivacyVeil, setShowPrivacyVeil] = useState<boolean>(false);
  const [isShufflingDealing, setIsShufflingDealing] = useState<boolean>(false);

  // Online Multiplayer State
  const [onlineRole, setOnlineRole] = useState<'host' | 'client' | null>(null);
  const [myOnlineSeatIndex, setMyOnlineSeatIndex] = useState<number>(0);
  const [onlineSnapshot, setOnlineSnapshot] = useState<UnoOnlineSnapshot | null>(null);
  const [onlineLatency, setOnlineLatency] = useState<number>(0);

  // Core Game State (Host / Local)
  const [players, setPlayers] = useState<UnoPlayer[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [direction, setDirection] = useState<UnoDirection>(1);
  const [drawPile, setDrawPile] = useState<UnoCard[]>([]);
  const [discardPile, setDiscardPile] = useState<UnoCard[]>([]);
  const [activeColor, setActiveColor] = useState<UnoCardColor>('red');
  const [gameStatus, setGameStatus] = useState<'playing' | 'color-picking' | 'game-over'>('playing');
  const [winner, setWinner] = useState<UnoPlayer | null>(null);

  // Interaction State
  const [pendingCardForColor, setPendingCardForColor] = useState<UnoCard | null>(null);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState<boolean>(false);
  const [actionNotification, setActionNotification] = useState<string>('Match color or number!');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  // Dynamic Hand container width for zero-shift, perfectly fitted responsive fanning
  const handContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(360);

  useEffect(() => {
    if (!handContainerRef.current) return;
    const updateWidth = () => {
      if (handContainerRef.current) {
        setContainerWidth(handContainerRef.current.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(handContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Prevent multiple AI concurrent timers
  const aiTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer and room on unmount
  useEffect(() => {
    return () => {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
      unoRoomManager.cleanup();
    };
  }, []);

  // Subscribe to latency updates when online
  useEffect(() => {
    if (playType !== 'online') return;
    const unsub = unoRoomManager.onLatency((lat) => setOnlineLatency(lat));
    return () => unsub();
  }, [playType]);

  // Top discard card reference
  const topCard =
    playType === 'online' && onlineRole === 'client'
      ? onlineSnapshot?.topCard || null
      : discardPile.length > 0
      ? discardPile[discardPile.length - 1]
      : null;

  const currentDisplayColor =
    playType === 'online' && onlineRole === 'client'
      ? onlineSnapshot?.activeColor || 'red'
      : activeColor;

  const currentDisplayTurnIndex =
    playType === 'online' && onlineRole === 'client'
      ? onlineSnapshot?.currentTurnIndex || 0
      : currentTurnIndex;

  const currentDisplayDirection =
    playType === 'online' && onlineRole === 'client'
      ? onlineSnapshot?.direction || 1
      : direction;

  const activePlayer = players[currentTurnIndex];

  // Whether it is currently this client's or local human's turn
  const isHumanTurn =
    playType === 'online'
      ? onlineRole === 'host'
        ? currentTurnIndex === 0 && gameStatus === 'playing' && !isShufflingDealing
        : !!onlineSnapshot?.isMyTurn && onlineSnapshot.gameStatus === 'playing'
      : playType === 'pass-and-play'
      ? gameStatus === 'playing' && !isShufflingDealing && !showPrivacyVeil
      : activePlayer?.type === 'human' && gameStatus === 'playing' && !isShufflingDealing;

  /**
   * Broadcast Host state snapshot to all connected online peers
   */
  const broadcastHostSnapshot = useCallback(
    (
      newPlayers: UnoPlayer[],
      curTurn: number,
      curDir: UnoDirection,
      topC: UnoCard | null,
      actCol: UnoCardColor,
      status: 'playing' | 'color-picking' | 'game-over',
      win: UnoPlayer | null,
      msg: string,
      curDrawPile: UnoCard[]
    ) => {
      if (playType !== 'online' || onlineRole !== 'host') return;

      const playerSummaries = newPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand.length,
        avatarColor: p.avatarColor,
        position: p.position,
        hasCalledUno: !!p.hasCalledUno,
      }));

      // Send personalized snapshot to each client
      for (let i = 1; i < newPlayers.length; i++) {
        const clientSnapshot: UnoOnlineSnapshot = {
          players: playerSummaries,
          myHand: newPlayers[i].hand,
          currentTurnIndex: curTurn,
          direction: curDir,
          drawPileCount: curDrawPile.length,
          topCard: topC,
          activeColor: actCol,
          gameStatus: status,
          winnerName: win ? win.name : null,
          lastActionMessage: msg,
          isMyTurn: curTurn === i,
        };
        unoRoomManager.hostSendToSeat(i, { type: 'STATE', snapshot: clientSnapshot });
      }
    },
    [playType, onlineRole]
  );

  /**
   * Finalize a play after color choice (or immediately for regular cards)
   */
  const commitCardPlay = useCallback(
    (playerIndex: number, card: UnoCard, chosenColor?: UnoCardColor) => {
      playUnoCardPlaySound(soundEnabled);
      triggerHaptic('light');

      let updatedPlayers: UnoPlayer[] = [];
      let finalWinner: UnoPlayer | null = null;
      let nextStatus: 'playing' | 'color-picking' | 'game-over' = 'playing';
      let notification = '';

      const currentP = players[playerIndex];
      if (!currentP) return;

      const newHand = currentP.hand.filter((c) => c.id !== card.id);
      updatedPlayers = players.map((p, idx) =>
        idx === playerIndex ? { ...p, hand: newHand } : p
      );

      // Check win condition
      if (newHand.length === 0) {
        finalWinner = currentP;
        nextStatus = 'game-over';
        setWinner(currentP);
        setGameStatus('game-over');
        playWinSound(soundEnabled);
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
        notification = `🎉 ${currentP.name} WINS THE DUEL!`;
        setActionNotification(notification);
        setPlayers(updatedPlayers);
        broadcastHostSnapshot(
          updatedPlayers,
          playerIndex,
          direction,
          card,
          chosenColor || (card.color === 'wild' ? 'red' : card.color),
          'game-over',
          currentP,
          notification,
          drawPile
        );
        return;
      }

      // 1 card left alert
      if (newHand.length === 1) {
        playUnoAlertSound(soundEnabled);
        notification = `⚡ ${currentP.name} has UNO! (1 card remaining)`;
      }

      // Update discard pile
      const newDiscardPile = [...discardPile, card];
      setDiscardPile(newDiscardPile);

      // Update active color
      const newColor: UnoCardColor =
        chosenColor || (card.color === 'wild' ? 'red' : card.color);
      setActiveColor(newColor);
      if (chosenColor) {
        playUnoColorSwitchSound(soundEnabled);
      }

      // Determine Action Card Effects
      let nextStep = 1;
      let newDirection = direction;
      let penaltyDrawCount = 0;
      const totalP = players.length;

      if (card.value === 'reverse') {
        if (totalP === 2) {
          nextStep = 2; // In 2 player, reverse acts as skip
          notification = `${currentP.name} played REVERSE! Turn skipped.`;
        } else {
          newDirection = (direction === 1 ? -1 : 1) as UnoDirection;
          setDirection(newDirection);
          notification = `${currentP.name} REVERSED play direction!`;
        }
      } else if (card.value === 'skip') {
        nextStep = 2;
        playUnoPenaltySound(soundEnabled);
        notification = `${currentP.name} played SKIP! Next player missed turn.`;
      } else if (card.value === 'draw2') {
        penaltyDrawCount = 2;
        nextStep = 2;
        playUnoPenaltySound(soundEnabled);
        notification = `${currentP.name} played +2 DRAW!`;
      } else if (card.value === 'wild4') {
        penaltyDrawCount = 4;
        nextStep = 2;
        playUnoPenaltySound(soundEnabled);
        notification = `${currentP.name} played +4 WILD! Color is ${newColor.toUpperCase()}`;
      } else if (isWildCard(card)) {
        notification = `${currentP.name} changed color to ${newColor.toUpperCase()}!`;
      }

      // Advance turn to next eligible player
      const nextIndex = getNextTurnIndex(playerIndex, newDirection, totalP, nextStep);

      // Handle penalty draws (+2 or +4)
      let currentDraw = [...drawPile];
      if (penaltyDrawCount > 0) {
        const victimIndex = getNextTurnIndex(playerIndex, newDirection, totalP, 1);
        let currentDiscard = [...newDiscardPile];
        if (currentDraw.length < penaltyDrawCount) {
          const replenished = replenishDrawPile(currentDraw, currentDiscard);
          currentDraw = replenished.drawPile;
          setDiscardPile(replenished.discardPile);
        }

        const drawnCards = currentDraw.splice(0, penaltyDrawCount);
        setDrawPile(currentDraw);

        updatedPlayers = updatedPlayers.map((p, idx) =>
          idx === victimIndex ? { ...p, hand: [...p.hand, ...drawnCards] } : p
        );
      }

      setPlayers(updatedPlayers);
      setHasDrawnThisTurn(false);
      setCurrentTurnIndex(nextIndex);
      setActionNotification(notification);

      // Pass & Play privacy screen handoff
      if (playType === 'pass-and-play' && privacyVeilEnabled && nextStatus !== 'game-over') {
        setShowPrivacyVeil(true);
      }

      // Host updates all peers
      broadcastHostSnapshot(
        updatedPlayers,
        nextIndex,
        newDirection,
        card,
        newColor,
        nextStatus,
        finalWinner,
        notification,
        currentDraw
      );
    },
    [
      players,
      discardPile,
      direction,
      drawPile,
      soundEnabled,
      playType,
      privacyVeilEnabled,
      broadcastHostSnapshot,
    ]
  );

  /**
   * Start a new Game with selected configuration (vs-ai or pass-and-play)
   */
  const handleStartGame = (config: UnoStartConfig) => {
    setPlayType(config.playType);
    setCardEightWild(config.cardEightWild);
    setDifficulty(config.difficulty);
    setPrivacyVeilEnabled(config.privacyVeil);
    setOnlineRole(null);

    const playerCount = config.playerCount;
    const fullDeck = shuffleCards(generateUnoDeck());

    const positions: UnoTablePosition[] =
      playerCount === 2
        ? ['bottom', 'top']
        : playerCount === 3
        ? ['bottom', 'left', 'top']
        : ['bottom', 'left', 'top', 'right'];

    const newPlayers: UnoPlayer[] = [];
    for (let p = 0; p < playerCount; p++) {
      const hand = fullDeck.splice(0, 7);
      const isAI = config.playType === 'vs-ai' && p > 0;
      newPlayers.push({
        id: `player-${p}`,
        name:
          config.playType === 'pass-and-play'
            ? config.playerNames[p] || `Player ${p + 1}`
            : p === 0
            ? 'YOU'
            : `BOT ${p}`,
        type: isAI ? 'ai' : 'human',
        hand,
        avatarColor: SEAT_COLORS[p % SEAT_COLORS.length],
        position: positions[p],
        hasCalledUno: false,
      });
    }

    let startCardIndex = fullDeck.findIndex(
      (c) => c.color !== 'wild' && typeof c.value === 'number'
    );
    if (startCardIndex === -1) startCardIndex = 0;
    const initialTopCard = fullDeck.splice(startCardIndex, 1)[0];

    setPlayers(newPlayers);
    setDrawPile(fullDeck);
    setDiscardPile([initialTopCard]);
    setActiveColor(initialTopCard.color);
    setCurrentTurnIndex(0);
    setDirection(1);
    setGameStatus('playing');
    setWinner(null);
    setHasDrawnThisTurn(false);
    setActionNotification(
      `Game started! ${initialTopCard.color.toUpperCase()} ${initialTopCard.value} leads.`
    );
    setIsInSetup(false);
    setShowPrivacyVeil(false);
    setIsShufflingDealing(true);
  };

  /**
   * Start an Online Match once Host starts or Client connects
   */
  const handleStartOnlineMatch = (info: UnoOnlineStartInfo) => {
    setPlayType('online');
    setOnlineRole(info.role);
    setMyOnlineSeatIndex(info.mySeatIndex);
    setCardEightWild(info.cardEightWild);
    setIsInSetup(false);

    if (info.role === 'host') {
      const fullDeck = shuffleCards(generateUnoDeck());
      const playerCount = info.playerCount;
      const positions: UnoTablePosition[] =
        playerCount === 2
          ? ['bottom', 'top']
          : playerCount === 3
          ? ['bottom', 'left', 'top']
          : ['bottom', 'left', 'top', 'right'];

      const newPlayers: UnoPlayer[] = [];
      for (let p = 0; p < playerCount; p++) {
        const hand = fullDeck.splice(0, 7);
        const seatInfo = info.players.find((s) => s.index === p);
        newPlayers.push({
          id: `online-seat-${p}`,
          name: seatInfo ? seatInfo.name : p === 0 ? 'Host' : `Player ${p + 1}`,
          type: 'human',
          hand,
          avatarColor: SEAT_COLORS[p % SEAT_COLORS.length],
          position: positions[p],
          hasCalledUno: false,
        });
      }

      let startCardIndex = fullDeck.findIndex(
        (c) => c.color !== 'wild' && typeof c.value === 'number'
      );
      if (startCardIndex === -1) startCardIndex = 0;
      const initialTopCard = fullDeck.splice(startCardIndex, 1)[0];

      setPlayers(newPlayers);
      setDrawPile(fullDeck);
      setDiscardPile([initialTopCard]);
      setActiveColor(initialTopCard.color);
      setCurrentTurnIndex(0);
      setDirection(1);
      setGameStatus('playing');
      setWinner(null);
      setHasDrawnThisTurn(false);
      setActionNotification('Online Match Live! Good luck!');
      setIsShufflingDealing(true);

      // Push initial snapshot
      setTimeout(() => {
        broadcastHostSnapshot(
          newPlayers,
          0,
          1,
          initialTopCard,
          initialTopCard.color,
          'playing',
          null,
          'Match started!',
          fullDeck
        );
      }, 200);
    }
  };

  /**
   * Listen to Online Peer Messages (Client receives snapshot, Host receives intents)
   */
  useEffect(() => {
    if (playType !== 'online') return;

    const unsub = unoRoomManager.onMessage((msg: UnoRoomMessage) => {
      // Client receives STATE snapshot
      if (msg.type === 'STATE' && onlineRole === 'client') {
        setOnlineSnapshot(msg.snapshot);
        if (msg.snapshot.gameStatus === 'game-over' && msg.snapshot.winnerName) {
          playWinSound(soundEnabled);
          confetti({ particleCount: 100, spread: 70 });
        }
        return;
      }

      // Host receives INTENT from client
      if (msg.type === 'INTENT' && onlineRole === 'host') {
        const seat = msg.seatIndex;
        if (msg.action === 'play' && msg.cardId) {
          const p = players[seat];
          if (!p) return;
          const targetCard = p.hand.find((c) => c.id === msg.cardId);
          if (targetCard) {
            commitCardPlay(seat, targetCard, msg.chosenColor);
          }
        } else if (msg.action === 'draw') {
          // Client draws
          let currentDraw = [...drawPile];
          let currentDiscard = [...discardPile];
          if (currentDraw.length === 0) {
            const rep = replenishDrawPile(currentDraw, currentDiscard);
            currentDraw = rep.drawPile;
            currentDiscard = rep.discardPile;
            setDiscardPile(currentDiscard);
          }
          const drawn = currentDraw.shift();
          if (drawn) {
            setDrawPile(currentDraw);
            const updated = players.map((p, idx) =>
              idx === seat ? { ...p, hand: [...p.hand, drawn] } : p
            );
            setPlayers(updated);
            broadcastHostSnapshot(
              updated,
              currentTurnIndex,
              direction,
              topCard,
              activeColor,
              gameStatus,
              winner,
              `${players[seat]?.name} drew a card.`,
              currentDraw
            );
          }
        } else if (msg.action === 'call_uno') {
          playUnoAlertSound(soundEnabled);
          const notif = `📣 ${players[seat]?.name} CALLED UNO!`;
          setActionNotification(notif);
          broadcastHostSnapshot(
            players,
            currentTurnIndex,
            direction,
            topCard,
            activeColor,
            gameStatus,
            winner,
            notif,
            drawPile
          );
        }
      }
    });

    return () => unsub();
  }, [
    playType,
    onlineRole,
    players,
    drawPile,
    discardPile,
    currentTurnIndex,
    direction,
    topCard,
    activeColor,
    gameStatus,
    winner,
    soundEnabled,
    commitCardPlay,
    broadcastHostSnapshot,
  ]);

  /**
   * Human Player plays a card from hand
   */
  const handleHumanPlayCard = (card: UnoCard) => {
    if (!isHumanTurn) return;

    if (!isValidCardPlay(card, topCard, currentDisplayColor)) {
      triggerHaptic('medium');
      setActionNotification('❌ Invalid card! Must match color, number, or be a Wild / Card 8.');
      return;
    }

    // Wild or Card 8 prompt color picker modal
    if (isWildCard(card)) {
      setPendingCardForColor(card);
      setGameStatus('color-picking');
      return;
    }

    if (playType === 'online' && onlineRole === 'client') {
      unoRoomManager.sendIntent({ action: 'play', cardId: card.id });
    } else {
      commitCardPlay(currentTurnIndex, card);
    }
  };

  /**
   * Color selected from color picker modal
   */
  const handleColorSelected = (chosenColor: UnoCardColor) => {
    if (!pendingCardForColor) return;
    const card = pendingCardForColor;
    setPendingCardForColor(null);
    setGameStatus('playing');

    if (playType === 'online' && onlineRole === 'client') {
      unoRoomManager.sendIntent({ action: 'play', cardId: card.id, chosenColor });
    } else {
      commitCardPlay(currentTurnIndex, card, chosenColor);
    }
  };

  /**
   * Draw a card from draw pile
   */
  const handleDrawCard = () => {
    if (!isHumanTurn) return;

    playUnoDrawSound(soundEnabled);
    triggerHaptic('light');

    if (playType === 'online' && onlineRole === 'client') {
      unoRoomManager.sendIntent({ action: 'draw' });
      return;
    }

    let currentDraw = [...drawPile];
    let currentDiscard = [...discardPile];

    if (currentDraw.length === 0) {
      const replenished = replenishDrawPile(currentDraw, currentDiscard);
      currentDraw = replenished.drawPile;
      currentDiscard = replenished.discardPile;
      setDiscardPile(currentDiscard);
    }

    const drawnCard = currentDraw.shift();
    if (!drawnCard) return;

    setDrawPile(currentDraw);
    const updated = players.map((p, idx) =>
      idx === currentTurnIndex ? { ...p, hand: [...p.hand, drawnCard] } : p
    );
    setPlayers(updated);
    setHasDrawnThisTurn(true);

    if (isValidCardPlay(drawnCard, topCard, activeColor)) {
      setActionNotification(`Drawn card (${drawnCard.color} ${drawnCard.value}) is playable!`);
    } else {
      setActionNotification('Card drawn. Tap Pass or draw again.');
    }

    if (playType === 'online' && onlineRole === 'host') {
      broadcastHostSnapshot(
        updated,
        currentTurnIndex,
        direction,
        topCard,
        activeColor,
        gameStatus,
        winner,
        `${players[currentTurnIndex]?.name} drew a card.`,
        currentDraw
      );
    }
  };

  /**
   * Pass turn after drawing
   */
  const handlePassTurn = () => {
    if (!isHumanTurn || !hasDrawnThisTurn) return;
    playClickSound(soundEnabled);
    setHasDrawnThisTurn(false);
    const nextIndex = getNextTurnIndex(currentTurnIndex, direction, players.length, 1);
    setCurrentTurnIndex(nextIndex);
    setActionNotification(`${players[currentTurnIndex]?.name} passed turn.`);

    if (playType === 'pass-and-play' && privacyVeilEnabled) {
      setShowPrivacyVeil(true);
    }

    if (playType === 'online' && onlineRole === 'host') {
      broadcastHostSnapshot(
        players,
        nextIndex,
        direction,
        topCard,
        activeColor,
        gameStatus,
        winner,
        `${players[currentTurnIndex]?.name} passed turn.`,
        drawPile
      );
    }
  };

  /**
   * Call UNO button
   */
  const handleCallUno = () => {
    playUnoAlertSound(soundEnabled);
    triggerHaptic('success');
    if (playType === 'online' && onlineRole === 'client') {
      unoRoomManager.sendIntent({ action: 'call_uno' });
    } else {
      setActionNotification(`📣 ${players[currentTurnIndex]?.name || 'YOU'} CALLED UNO! (Protected)`);
    }
  };

  /**
   * AI Turns Execution Loop (vs-ai mode only)
   */
  useEffect(() => {
    if (
      playType !== 'vs-ai' ||
      gameStatus !== 'playing' ||
      isInSetup ||
      isShufflingDealing ||
      players.length === 0
    )
      return;

    const currentPlayer = players[currentTurnIndex];
    if (!currentPlayer || currentPlayer.type !== 'ai') return;

    aiTurnTimeoutRef.current = setTimeout(
      () => {
        const nextVictimIdx = getNextTurnIndex(currentTurnIndex, direction, players.length, 1);
        const nextPlayerHandCount = players[nextVictimIdx]?.hand.length;

        const decision = decideAIMove(
          currentPlayer.hand,
          topCard,
          activeColor,
          nextPlayerHandCount,
          difficulty
        );

        if (decision.action === 'play' && decision.card) {
          commitCardPlay(currentTurnIndex, decision.card, decision.chosenColor);
        } else {
          // AI Draws
          playUnoDrawSound(soundEnabled);
          let currentDraw = [...drawPile];
          let currentDiscard = [...discardPile];

          if (currentDraw.length === 0) {
            const replenished = replenishDrawPile(currentDraw, currentDiscard);
            currentDraw = replenished.drawPile;
            currentDiscard = replenished.discardPile;
            setDiscardPile(currentDiscard);
          }

          const drawn = currentDraw.shift();
          if (drawn) {
            setDrawPile(currentDraw);
            if (isValidCardPlay(drawn, topCard, activeColor)) {
              const aiChosenColor = isWildCard(drawn) ? 'red' : undefined;
              setPlayers((prev) =>
                prev.map((p, idx) =>
                  idx === currentTurnIndex ? { ...p, hand: [...p.hand, drawn] } : p
                )
              );
              setTimeout(() => {
                commitCardPlay(currentTurnIndex, drawn, aiChosenColor);
              }, 300);
            } else {
              setPlayers((prev) =>
                prev.map((p, idx) =>
                  idx === currentTurnIndex ? { ...p, hand: [...p.hand, drawn] } : p
                )
              );
              setActionNotification(`${currentPlayer.name} drew a card and passed.`);
              const nextIdx = getNextTurnIndex(currentTurnIndex, direction, players.length, 1);
              setCurrentTurnIndex(nextIdx);
            }
          }
        }
      },
      difficulty === 'master' ? 550 : 700
    );

    return () => {
      if (aiTurnTimeoutRef.current) clearTimeout(aiTurnTimeoutRef.current);
    };
  }, [
    playType,
    currentTurnIndex,
    gameStatus,
    players,
    topCard,
    activeColor,
    direction,
    drawPile,
    discardPile,
    commitCardPlay,
    soundEnabled,
    isInSetup,
    isShufflingDealing,
    difficulty,
  ]);

  // If in setup mode, render setup screen
  if (isInSetup) {
    return (
      <>
        <UnoSetupScreen
          onStartGame={handleStartGame}
          onOpenOnlineModal={() => setIsOnlineModalOpen(true)}
          onBackToHub={onBackToHub}
          soundEnabled={soundEnabled}
        />
        <UnoOnlineModal
          isOpen={isOnlineModalOpen}
          onClose={() => setIsOnlineModalOpen(false)}
          onGameStarted={handleStartOnlineMatch}
          cardEightWild={cardEightWild}
          soundEnabled={soundEnabled}
        />
      </>
    );
  }

  // Active Hand depending on mode:
  // - vs-ai: human player (index 0)
  // - pass-and-play: currentTurnIndex player
  // - online: client's own hand from snapshot, or host's index 0
  const myHand: UnoCard[] =
    playType === 'online'
      ? onlineRole === 'client'
        ? onlineSnapshot?.myHand || []
        : players[0]?.hand || []
      : playType === 'pass-and-play'
      ? players[currentTurnIndex]?.hand || []
      : players[0]?.hand || [];

  const humanCanPlayAny = hasValidMoveInHand(myHand, topCard, currentDisplayColor);

  // Player positions for rendering opponents
  let displayOpponents: Array<{
    id: string;
    name: string;
    cardCount: number;
    avatarColor: string;
    position: UnoTablePosition;
    isActive: boolean;
  }> = [];

  if (playType === 'online' && onlineRole === 'client' && onlineSnapshot) {
    displayOpponents = onlineSnapshot.players
      .filter((_, idx) => idx !== myOnlineSeatIndex)
      .map((p, idx) => ({
        id: p.id,
        name: p.name,
        cardCount: p.cardCount,
        avatarColor: p.avatarColor,
        position: (idx === 0 ? 'top' : idx === 1 ? 'left' : 'right') as UnoTablePosition,
        isActive: onlineSnapshot.currentTurnIndex === idx,
      }));
  } else if (playType === 'pass-and-play') {
    displayOpponents = players
      .filter((_, idx) => idx !== currentTurnIndex)
      .map((p, idx) => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand.length,
        avatarColor: p.avatarColor,
        position: (idx === 0 ? 'top' : idx === 1 ? 'left' : 'right') as UnoTablePosition,
        isActive: false,
      }));
  } else {
    displayOpponents = players
      .slice(1)
      .map((p) => ({
        id: p.id,
        name: p.name,
        cardCount: p.hand.length,
        avatarColor: p.avatarColor,
        position: p.position,
        isActive: activePlayer?.id === p.id,
      }));
  }

  const topOpponent = displayOpponents.find((p) => p.position === 'top');
  const leftOpponent = displayOpponents.find((p) => p.position === 'left');
  const rightOpponent = displayOpponents.find((p) => p.position === 'right');

  // Bottom active player label
  const bottomPlayerName =
    playType === 'online'
      ? onlineRole === 'client'
        ? onlineSnapshot?.players[myOnlineSeatIndex]?.name || 'YOU'
        : players[0]?.name || 'HOST'
      : playType === 'pass-and-play'
      ? players[currentTurnIndex]?.name || 'PLAYER 1'
      : 'YOU';

  return (
    <div className="w-full h-full flex flex-col justify-between p-2 sm:p-3 bg-slate-950 text-white select-none overflow-hidden relative font-sans">
      {/* Cinematic Deck Shuffle & Dealing Animation Overlay */}
      <AnimatePresence>
        {isShufflingDealing && topCard && (
          <UnoShuffleDealAnimation
            players={players}
            initialTopCard={topCard}
            soundEnabled={soundEnabled}
            onComplete={() => {
              setIsShufflingDealing(false);
              playUnoCardPlaySound(soundEnabled);
            }}
          />
        )}
      </AnimatePresence>

      {/* Pass & Play Privacy Veil Overlay */}
      <AnimatePresence>
        {showPrivacyVeil && playType === 'pass-and-play' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md"
          >
            <div className="max-w-xs w-full text-center space-y-4 p-6 rounded-3xl bg-slate-900 border border-emerald-500/50 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400 mx-auto flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Users className="w-7 h-7" />
              </div>

              <div>
                <p className="text-xs font-orbitron font-bold text-slate-400 tracking-wider">
                  PASS DEVICE TO
                </p>
                <h3 className="text-xl font-black font-orbitron text-emerald-300 mt-1">
                  {players[currentTurnIndex]?.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Your cards are concealed. Hand the device over!
                </p>
              </div>

              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  setShowPrivacyVeil(false);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-orbitron font-black text-xs tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                I'M {players[currentTurnIndex]?.name.toUpperCase()} · REVEAL HAND
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header Bar */}
      <header className="shrink-0 flex items-center justify-between pb-1 border-b border-slate-800/80 z-20">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            unoRoomManager.cleanup();
            setIsInSetup(true);
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-orbitron cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>SETUP</span>
        </button>

        {/* Center: Direction & Active Color Indicator */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
            {currentDisplayDirection === 1 ? (
              <>
                <RotateCw
                  className="w-3 h-3 text-cyan-400 animate-spin"
                  style={{ animationDuration: '6s' }}
                />
                <span>CW</span>
              </>
            ) : (
              <>
                <RotateCcw
                  className="w-3 h-3 text-pink-400 animate-spin"
                  style={{ animationDuration: '6s' }}
                />
                <span>CCW</span>
              </>
            )}
          </div>

          <div
            className={`px-2.5 py-0.5 rounded-full border text-[10px] font-orbitron font-black flex items-center gap-1 shadow-sm ${
              COLOR_PILL[currentDisplayColor]?.bg || 'bg-cyan-500/20'
            } ${COLOR_PILL[currentDisplayColor]?.border || 'border-cyan-400'} ${
              COLOR_PILL[currentDisplayColor]?.text || 'text-cyan-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current shadow-[0_0_6px_currentColor]" />
            <span>COLOR: {currentDisplayColor.toUpperCase()}</span>
          </div>

          {playType === 'online' ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <Wifi className="w-2.5 h-2.5 text-purple-400" />
              <span>{onlineLatency > 0 ? `${onlineLatency}ms` : 'PEER'}</span>
            </span>
          ) : playType === 'pass-and-play' ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Users className="w-2.5 h-2.5 text-emerald-400" />
              <span>PASS</span>
            </span>
          ) : (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
              {difficulty}
            </span>
          )}
        </div>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 flex items-center justify-center cursor-pointer"
          title="Toggle Sound"
        >
          {soundEnabled ? (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
        </button>
      </header>

      {/* 2. Top Opponent */}
      <div className="shrink-0 flex items-center justify-center py-0.5 z-10">
        {topOpponent && (
          <div
            className={`p-1.5 rounded-xl border transition-all flex items-center gap-2 ${
              topOpponent.isActive
                ? 'bg-pink-950/50 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.4)] scale-105 ring-2 ring-pink-400'
                : 'bg-slate-900/70 border-slate-800 opacity-90'
            }`}
          >
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    topOpponent.isActive ? 'bg-pink-400 animate-ping' : 'bg-slate-500'
                  }`}
                />
                <span className="text-[11px] font-orbitron font-bold text-white">
                  {topOpponent.name}
                </span>
                {topOpponent.isActive && (
                  <span className="text-[9px] font-mono px-1 rounded bg-pink-500/20 text-pink-300 font-bold border border-pink-500/40">
                    THINKING
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {topOpponent.cardCount} cards left
              </span>
            </div>

            {/* Fan of card backs */}
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(topOpponent.cardCount, 8) }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-6 rounded bg-slate-950 border border-pink-500/50 shadow-sm rotate-2"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Middle Arena: Left Player, Table Center (Draw & Discard), Right Player */}
      <div className="flex-1 flex items-center justify-between px-1 relative my-auto z-10">
        {/* Left Opponent (if 3 or 4 players) */}
        <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center">
          {leftOpponent && (
            <div
              className={`p-1.5 rounded-xl border text-center transition-all ${
                leftOpponent.isActive
                  ? 'bg-amber-950/50 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)] ring-1 ring-amber-400'
                  : 'bg-slate-900/70 border-slate-800 opacity-90'
              }`}
            >
              <span className="text-[10px] font-orbitron font-bold text-amber-300 block truncate">
                {leftOpponent.name}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {leftOpponent.cardCount} cards
              </span>
              <div className="flex justify-center -space-x-2 mt-1">
                {Array.from({ length: Math.min(leftOpponent.cardCount, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-5 rounded bg-slate-950 border border-amber-500/40"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Table Arena (Draw Pile & Discard Pile) */}
        <div className="flex flex-col items-center justify-center gap-1.5 my-auto">
          {/* Action Notification Toast Banner */}
          <div className="px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono text-cyan-300 max-w-xs text-center shadow-lg backdrop-blur-sm truncate">
            {actionNotification}
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-6">
            {/* Draw Pile Deck */}
            <div
              onClick={handleDrawCard}
              className={`relative flex flex-col items-center justify-center cursor-pointer transition-transform group active:scale-95 ${
                isHumanTurn ? 'hover:scale-105' : 'opacity-85'
              }`}
              title={isHumanTurn ? 'Tap to Draw Card' : 'Wait for your turn'}
            >
              <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950 border-2 border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.3)] flex flex-col items-center justify-center relative overflow-hidden group-hover:border-purple-400">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15),transparent)]" />
                <span className="font-orbitron font-black text-xs text-purple-300 tracking-wider">
                  UNO
                </span>
                <span className="text-[9px] font-mono text-purple-400 mt-1">DRAW</span>
              </div>
              {/* Stack effect */}
              <div className="absolute -bottom-1 -right-1 w-14 h-20 sm:w-16 sm:h-24 rounded-xl border border-purple-500/30 -z-10 bg-slate-950" />
              <div className="absolute -bottom-2 -right-2 w-14 h-20 sm:w-16 sm:h-24 rounded-xl border border-purple-500/20 -z-20 bg-slate-950" />
            </div>

            {/* Discard Pile (Top Played Card) */}
            <div className="relative flex flex-col items-center justify-center">
              {topCard ? (
                <div className="scale-100 sm:scale-110">
                  <UnoCardView card={topCard} disabled />
                </div>
              ) : (
                <div className="w-14 h-20 sm:w-16 sm:h-24 rounded-xl border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-600 text-xs">
                  EMPTY
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Opponent (if 4 players) */}
        <div className="w-16 sm:w-20 shrink-0 flex flex-col items-center">
          {rightOpponent && (
            <div
              className={`p-1.5 rounded-xl border text-center transition-all ${
                rightOpponent.isActive
                  ? 'bg-emerald-950/50 border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                  : 'bg-slate-900/70 border-slate-800 opacity-90'
              }`}
            >
              <span className="text-[10px] font-orbitron font-bold text-emerald-300 block truncate">
                {rightOpponent.name}
              </span>
              <span className="text-[9px] text-slate-400 font-mono">
                {rightOpponent.cardCount} cards
              </span>
              <div className="flex justify-center -space-x-2 mt-1">
                {Array.from({ length: Math.min(rightOpponent.cardCount, 4) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-5 rounded bg-slate-950 border border-emerald-500/40"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Player Controls & Hand */}
      <footer className="shrink-0 flex flex-col items-center z-20 pt-1 border-t border-slate-800/80">
        {/* Bottom Turn Info & Action Controls */}
        <div className="w-full flex items-center justify-between px-2 pb-1.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isHumanTurn ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-700'
              }`}
            />
            <div className="text-left">
              <span className="text-xs font-orbitron font-black tracking-wide text-cyan-300">
                {bottomPlayerName}
              </span>
              <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                ({myHand.length} cards)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Draw & Pass Button (if drew a card) */}
            {hasDrawnThisTurn && isHumanTurn && (
              <button
                onClick={handlePassTurn}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-orbitron font-bold cursor-pointer transition-colors"
              >
                PASS TURN
              </button>
            )}

            {/* UNO Call Button */}
            <button
              onClick={handleCallUno}
              disabled={!isHumanTurn}
              className={`px-3 py-1 rounded-xl font-orbitron font-black text-xs tracking-wider border cursor-pointer transition-all ${
                myHand.length <= 2
                  ? 'bg-gradient-to-r from-red-600 to-amber-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
              }`}
            >
              UNO!
            </button>
          </div>
        </div>

        {/* Dynamic Fanned Hand: Zero layout shift */}
        <div
          ref={handContainerRef}
          className="w-full h-24 sm:h-28 relative flex items-center justify-center overflow-visible"
        >
          {myHand.length > 0 ? (
            (() => {
              const cardCount = myHand.length;
              const cardW = 56;
              const maxDeckSpan = Math.max(containerWidth - 70, 220);
              let step = 38;

              if (cardCount > 1) {
                const totalReq = (cardCount - 1) * step + cardW;
                if (totalReq > maxDeckSpan) {
                  step = (maxDeckSpan - cardW) / (cardCount - 1);
                }
              }

              const totalW = (cardCount - 1) * step + cardW;
              const startX = (containerWidth - totalW) / 2;

              return myHand.map((card, i) => {
                const isHovered = hoveredCardId === card.id;
                const isPlayable = isHumanTurn && isValidCardPlay(card, topCard, currentDisplayColor);
                const leftPos = startX + i * step;

                return (
                  <div
                    key={card.id}
                    onMouseEnter={() => setHoveredCardId(card.id)}
                    onMouseLeave={() => setHoveredCardId(null)}
                    style={{
                      position: 'absolute',
                      left: `${leftPos}px`,
                      bottom: isHovered ? '12px' : '0px',
                      zIndex: isHovered ? 50 : i,
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.15s cubic-bezier(0.2, 0, 0, 1)',
                    }}
                  >
                    <UnoCardView
                      card={card}
                      onClick={() => handleHumanPlayCard(card)}
                      isPlayable={isPlayable}
                      disabled={!isHumanTurn}
                    />
                  </div>
                );
              });
            })()
          ) : (
            <div className="text-xs font-orbitron text-slate-600">NO CARDS IN HAND</div>
          )}
        </div>
      </footer>

      {/* Color Picker Modal for Wild & Card 8 */}
      {gameStatus === 'color-picking' && (
        <UnoColorPickerModal
          onSelectColor={handleColorSelected}
          onCancel={() => {
            setPendingCardForColor(null);
            setGameStatus('playing');
          }}
        />
      )}

      {/* Game Over Victory / Loss Modal */}
      {gameStatus === 'game-over' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-xs w-full text-center space-y-4 p-6 rounded-3xl bg-slate-900 border border-purple-500/50 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400 mx-auto flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <p className="text-xs font-orbitron font-bold text-amber-400 tracking-wider">
                MATCH COMPLETE
              </p>
              <h3 className="text-lg font-black font-orbitron text-white mt-1">
                {winner ? `${winner.name.toUpperCase()} WINS!` : 'VICTORY!'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {winner?.type === 'human'
                  ? 'Outstanding plays and cyber victory!'
                  : 'Better luck next hand duellist!'}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  if (playType === 'online') {
                    unoRoomManager.cleanup();
                  }
                  setIsInSetup(true);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500 text-slate-950 font-orbitron font-black text-xs tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-98 transition-all cursor-pointer"
              >
                BACK TO LOBBY / SETUP
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
