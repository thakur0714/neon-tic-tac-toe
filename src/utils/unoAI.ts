import { UnoCard, UnoCardColor, UnoDifficulty } from '../types/uno';
import { isValidCardPlay, isWildCard } from './unoRules';

const PRIMARY_COLORS: UnoCardColor[] = ['red', 'blue', 'green', 'yellow'];

export interface AIDecision {
  action: 'play' | 'draw';
  card?: UnoCard;
  chosenColor?: UnoCardColor;
}

/**
 * Determines the best color for AI to choose when playing a Wild card.
 * Selects the color that the AI has the most of in hand.
 */
export function getAIBestColorChoice(hand: UnoCard[], playedCardId?: string): UnoCardColor {
  const counts: Record<UnoCardColor, number> = {
    red: 0,
    blue: 0,
    green: 0,
    yellow: 0,
    wild: 0,
  };

  for (const card of hand) {
    if (card.id !== playedCardId && card.color !== 'wild') {
      counts[card.color] = (counts[card.color] || 0) + 1;
    }
  }

  let bestColor: UnoCardColor = 'red';
  let maxCount = -1;

  for (const color of PRIMARY_COLORS) {
    if (counts[color] > maxCount) {
      maxCount = counts[color];
      bestColor = color;
    }
  }

  return bestColor;
}

/**
 * AI decision algorithm supporting Rookie, Pro, and Cyber Master difficulties.
 * Fast, lightweight, non-blocking on low-end mobile devices.
 */
export function decideAIMove(
  hand: UnoCard[],
  topCard: UnoCard | null,
  activeColor: UnoCardColor,
  nextPlayerCardCount?: number,
  difficulty: UnoDifficulty = 'pro',
  eightIsWild = false
): AIDecision {
  // 1. Gather all legally playable cards
  const playableCards = hand.filter((card) =>
    isValidCardPlay(card, topCard, activeColor, eightIsWild)
  );

  if (playableCards.length === 0) {
    return { action: 'draw' };
  }

  // ROOKIE LEVEL: Casual, random choices among legal cards
  if (difficulty === 'rookie') {
    const randomCard = playableCards[Math.floor(Math.random() * playableCards.length)];
    const chosenColor = isWildCard(randomCard, eightIsWild)
      ? PRIMARY_COLORS[Math.floor(Math.random() * PRIMARY_COLORS.length)]
      : undefined;
    return {
      action: 'play',
      card: randomCard,
      chosenColor,
    };
  }

  // Separate into categories for Pro and Master
  const actionDisruptCards = playableCards.filter(
    (c) => c.value === 'draw2' || c.value === 'skip' || c.value === 'reverse'
  );

  const regularCards = playableCards.filter(
    (c) =>
      typeof c.value === 'number' &&
      !(eightIsWild && c.value === 8) &&
      c.color !== 'wild'
  );

  const wildCards = playableCards.filter((c) => isWildCard(c, eightIsWild));

  const colorCounts = hand.reduce((acc, c) => {
    if (c.color !== 'wild') acc[c.color] = (acc[c.color] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Go aggressive only when it actually matters: an opponent is about to win,
  // or a Master bot is in its own endgame and wants to close out fast.
  const opponentAboutToWin =
    nextPlayerCardCount !== undefined && nextPlayerCardCount <= 2;
  const masterEndgame = difficulty === 'master' && hand.length <= 3;

  if (opponentAboutToWin || masterEndgame) {
    // Crush with penalties / turn denial before they can play
    const wildDrawFour = wildCards.find((c) => c.value === 'wild4');
    if (wildDrawFour) {
      return {
        action: 'play',
        card: wildDrawFour,
        chosenColor: getAIBestColorChoice(hand, wildDrawFour.id),
      };
    }

    const drawTwo = actionDisruptCards.find((c) => c.value === 'draw2');
    if (drawTwo) return { action: 'play', card: drawTwo };

    const skipCard = actionDisruptCards.find((c) => c.value === 'skip');
    if (skipCard) return { action: 'play', card: skipCard };

    const reverseCard = actionDisruptCards.find((c) => c.value === 'reverse');
    if (reverseCard) return { action: 'play', card: reverseCard };
  }

  // Otherwise: conserve Wilds, shed points, and keep the dominant color.
  // 1. Regular number cards first — prefer the dominant color, then the
  //    highest face value so we are not left holding expensive cards.
  if (regularCards.length > 0) {
    let bestRegular = regularCards[0];
    let bestScore = -1;
    for (const card of regularCards) {
      const colorWeight = (colorCounts[card.color] || 0) * 10;
      const valueWeight = typeof card.value === 'number' ? card.value : 0;
      const score = colorWeight + valueWeight;
      if (score > bestScore) {
        bestScore = score;
        bestRegular = card;
      }
    }
    return { action: 'play', card: bestRegular };
  }

  // 2. Action cards (Skip / Reverse / +2) — disrupt without burning a Wild.
  if (actionDisruptCards.length > 0) {
    const pref =
      actionDisruptCards.find((c) => c.value === 'draw2') ||
      actionDisruptCards.find((c) => c.value === 'skip') ||
      actionDisruptCards[0];
    return { action: 'play', card: pref };
  }

  // 3. Wilds last — plain Wild (or Card 8) before spending a Wild Draw 4.
  if (wildCards.length > 0) {
    const chosenWild =
      wildCards.find((c) => c.value === 'wild' || c.value === 8) ||
      wildCards.find((c) => c.value !== 'wild4') ||
      wildCards[0];
    return {
      action: 'play',
      card: chosenWild,
      chosenColor: getAIBestColorChoice(hand, chosenWild.id),
    };
  }

  return { action: 'draw' };
}
