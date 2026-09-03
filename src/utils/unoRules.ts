import {
  UnoCard,
  UnoCardColor,
  UnoDirection,
  UnoGameState,
  UnoPlayer,
} from '../types/uno';

/**
 * Checks if a card can be legally played on top of the discard pile.
 * Supports both classic UNO and Card 8 (Crazy Eights) rule.
 */
export function isValidCardPlay(
  card: UnoCard,
  topCard: UnoCard | null,
  activeColor: UnoCardColor,
  eightIsWild = false
): boolean {
  if (!topCard) return true;

  // 1. Wild and Wild Draw 4 cards can always be played
  if (card.color === 'wild' || card.value === 'wild' || card.value === 'wild4') {
    return true;
  }

  // 2. Card 8 is a special wild card in Crazy Eights (optional house rule)
  if (eightIsWild && card.value === 8) {
    return true;
  }

  // 3. Color matching current active color
  if (card.color === activeColor) {
    return true;
  }

  // 4. Value / Symbol matching the top card
  if (card.value === topCard.value) {
    return true;
  }

  return false;
}

/**
 * Checks if a player has at least one valid card to play in their hand.
 */
export function hasValidMoveInHand(
  hand: UnoCard[],
  topCard: UnoCard | null,
  activeColor: UnoCardColor,
  eightIsWild = false
): boolean {
  return hand.some((card) => isValidCardPlay(card, topCard, activeColor, eightIsWild));
}

/**
 * Calculates the next turn index with respect to direction and skip step.
 */
export function getNextTurnIndex(
  currentIndex: number,
  direction: UnoDirection,
  totalPlayers: number,
  step = 1
): number {
  if (totalPlayers <= 0) return 0;
  const rawNext = currentIndex + direction * step;
  return ((rawNext % totalPlayers) + totalPlayers) % totalPlayers;
}

/**
 * Calculates score value of a card for final game tally.
 */
export function getCardScoreValue(card: UnoCard): number {
  if (card.value === 'wild' || card.value === 'wild4') return 50;
  if (card.value === 'skip' || card.value === 'reverse' || card.value === 'draw2') return 20;
  if (typeof card.value === 'number') return card.value;
  return 0;
}

/**
 * Calculates total penalty score in a player's hand.
 */
export function calculateHandScore(hand: UnoCard[]): number {
  return hand.reduce((sum, card) => sum + getCardScoreValue(card), 0);
}

/**
 * Determines whether a card requires color selection (Wild, Wild4, or Card 8).
 */
export function isWildCard(card: UnoCard, eightIsWild = false): boolean {
  return (
    card.color === 'wild' ||
    card.value === 'wild' ||
    card.value === 'wild4' ||
    (eightIsWild && card.value === 8)
  );
}
