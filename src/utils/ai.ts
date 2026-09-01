import { Board, CellValue, Player, WinResult } from '../types';

export const WINNING_COMBINATIONS: Array<{
  combo: [number, number, number];
  direction: 'row-0' | 'row-1' | 'row-2' | 'col-0' | 'col-1' | 'col-2' | 'diag-main' | 'diag-anti';
}> = [
  { combo: [0, 1, 2], direction: 'row-0' },
  { combo: [3, 4, 5], direction: 'row-1' },
  { combo: [6, 7, 8], direction: 'row-2' },
  { combo: [0, 3, 6], direction: 'col-0' },
  { combo: [1, 4, 7], direction: 'col-1' },
  { combo: [2, 5, 8], direction: 'col-2' },
  { combo: [0, 4, 8], direction: 'diag-main' },
  { combo: [2, 4, 6], direction: 'diag-anti' },
];

/**
 * Check if the board has a winner, a draw, or is ongoing
 */
export function checkWinner(board: Board): WinResult {
  for (const { combo, direction } of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] as Player,
        line: combo,
        direction,
      };
    }
  }

  // Check for draw (all cells filled)
  const isFull = board.every((cell) => cell !== null);
  if (isFull) {
    return {
      winner: 'draw',
      line: null,
    };
  }

  return {
    winner: null,
    line: null,
  };
}

/**
 * Get all available cell indices
 */
export function getAvailableCells(board: Board): number[] {
  const cells: number[] = [];
  board.forEach((val, idx) => {
    if (val === null) cells.push(idx);
  });
  return cells;
}

/**
 * Easy AI: Mostly random with occasional intuitive placement
 */
export function getEasyAIMove(board: Board): number {
  const available = getAvailableCells(board);
  if (available.length === 0) return -1;
  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Medium AI: Checks for immediate wins and blocks, otherwise plays balanced moves
 */
export function getMediumAIMove(board: Board, aiSymbol: Player): number {
  const humanSymbol: Player = aiSymbol === 'X' ? 'O' : 'X';
  const available = getAvailableCells(board);
  if (available.length === 0) return -1;

  // 1. Can AI win in one move?
  for (const idx of available) {
    const testBoard = [...board];
    testBoard[idx] = aiSymbol;
    if (checkWinner(testBoard).winner === aiSymbol) {
      return idx;
    }
  }

  // 2. Must AI block human from winning in one move?
  for (const idx of available) {
    const testBoard = [...board];
    testBoard[idx] = humanSymbol;
    if (checkWinner(testBoard).winner === humanSymbol) {
      return idx;
    }
  }

  // 3. Take center if open (70% chance)
  if (board[4] === null && Math.random() < 0.7) {
    return 4;
  }

  // 4. Mix of smart move and random
  if (Math.random() < 0.5) {
    return getBestMoveMinimax(board, aiSymbol);
  }

  const randomIndex = Math.floor(Math.random() * available.length);
  return available[randomIndex];
}

/**
 * Hard AI: Unbeatable Minimax Algorithm with Depth-Penalized Scoring
 */
export function getBestMoveMinimax(board: Board, aiSymbol: Player): number {
  const humanSymbol: Player = aiSymbol === 'X' ? 'O' : 'X';
  const available = getAvailableCells(board);

  if (available.length === 0) return -1;

  // Quick optimization: if entire board is empty, pick center or random corner
  if (available.length === 9) {
    const openingMoves = [0, 2, 4, 6, 8];
    return openingMoves[Math.floor(Math.random() * openingMoves.length)];
  }

  // If only 1 move left
  if (available.length === 1) {
    return available[0];
  }

  let bestScore = -Infinity;
  let bestMove = available[0];

  for (const move of available) {
    board[move] = aiSymbol;
    const score = minimax(board, 0, false, aiSymbol, humanSymbol, -Infinity, Infinity);
    board[move] = null; // undo

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Minimax recursive evaluation with Alpha-Beta pruning
 */
function minimax(
  board: Board,
  depth: number,
  isMaximizing: boolean,
  aiSymbol: Player,
  humanSymbol: Player,
  alpha: number,
  beta: number
): number {
  const result = checkWinner(board);

  if (result.winner === aiSymbol) {
    return 10 - depth;
  }
  if (result.winner === humanSymbol) {
    return depth - 10;
  }
  if (result.winner === 'draw') {
    return 0;
  }

  const available = getAvailableCells(board);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of available) {
      board[move] = aiSymbol;
      const score = minimax(board, depth + 1, false, aiSymbol, humanSymbol, alpha, beta);
      board[move] = null;
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break; // pruning
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const move of available) {
      board[move] = humanSymbol;
      const score = minimax(board, depth + 1, true, aiSymbol, humanSymbol, alpha, beta);
      board[move] = null;
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break; // pruning
    }
    return minScore;
  }
}
