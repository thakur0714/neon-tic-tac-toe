import { UnoCard, UnoCardColor, UnoCardValue } from '../types/uno';

const PRIMARY_COLORS: UnoCardColor[] = ['red', 'blue', 'green', 'yellow'];

/**
 * Generates a standard, complete Uno card deck (108 cards).
 * Optimized for minimal object overhead on mobile/low-end devices.
 */
export function generateUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  let cardCounter = 0;

  for (const color of PRIMARY_COLORS) {
    // Exactly one 0 per color
    deck.push({
      id: `${color}-0-${cardCounter++}`,
      color,
      value: 0,
    });

    // Two of each 1-9 per color
    for (let num = 1; num <= 9; num++) {
      deck.push({
        id: `${color}-${num}-a-${cardCounter++}`,
        color,
        value: num as UnoCardValue,
      });
      deck.push({
        id: `${color}-${num}-b-${cardCounter++}`,
        color,
        value: num as UnoCardValue,
      });
    }

    // Two of each action card (Skip, Reverse, Draw 2) per color
    const actionCards: UnoCardValue[] = ['skip', 'reverse', 'draw2'];
    for (const action of actionCards) {
      deck.push({
        id: `${color}-${action}-a-${cardCounter++}`,
        color,
        value: action,
      });
      deck.push({
        id: `${color}-${action}-b-${cardCounter++}`,
        color,
        value: action,
      });
    }
  }

  // 4 Wild cards (and Card 8 wild representation)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `wild-${i}-${cardCounter++}`,
      color: 'wild',
      value: 'wild',
    });
  }

  // 4 Wild Draw 4 cards
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `wild4-${i}-${cardCounter++}`,
      color: 'wild',
      value: 'wild4',
    });
  }

  return deck;
}

/**
 * In-place Fisher-Yates shuffle algorithm.
 * O(n) time, O(1) extra space - extremely fast for mobile browsers.
 */
export function shuffleCards(cards: UnoCard[]): UnoCard[] {
  const array = [...cards];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

/**
 * Refills draw pile from discard pile if draw pile runs low,
 * preserving top discard card.
 */
export function replenishDrawPile(
  drawPile: UnoCard[],
  discardPile: UnoCard[]
): { drawPile: UnoCard[]; discardPile: UnoCard[] } {
  if (drawPile.length > 0) {
    return { drawPile, discardPile };
  }

  if (discardPile.length <= 1) {
    // If table has only 1 or 0 cards, regenerate fresh shuffled cards
    return {
      drawPile: shuffleCards(generateUnoDeck()),
      discardPile,
    };
  }

  const topDiscard = discardPile[discardPile.length - 1];
  const cardsToRecycle = discardPile.slice(0, -1);
  const newDrawPile = shuffleCards(cardsToRecycle);

  return {
    drawPile: newDrawPile,
    discardPile: [topDiscard],
  };
}
