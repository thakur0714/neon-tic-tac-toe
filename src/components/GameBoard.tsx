import React from 'react';
import { motion } from 'motion/react';
import { Board, Player, WinResult } from '../types';

interface GameBoardProps {
  board: Board;
  winResult: WinResult;
  currentPlayer: Player;
  isAiThinking: boolean;
  disabled: boolean;
  onCellClick: (index: number) => void;
}

// Coordinate centers for cells 0-8 in percentage [x, y]
const CELL_CENTERS: Record<number, [number, number]> = {
  0: [16.67, 16.67],
  1: [50.0, 16.67],
  2: [83.33, 16.67],
  3: [16.67, 50.0],
  4: [50.0, 50.0],
  5: [83.33, 50.0],
  6: [16.67, 83.33],
  7: [50.0, 83.33],
  8: [83.33, 83.33],
};

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  winResult,
  currentPlayer,
  isAiThinking,
  disabled,
  onCellClick,
}) => {
  const winningLine = winResult.line;
  const isGameOver = winResult.winner !== null;

  // Compute laser strike-through line start and end
  let lineCoords = null;
  if (winningLine && winningLine.length === 3) {
    const [startIdx, , endIdx] = winningLine;
    const [x1, y1] = CELL_CENTERS[startIdx];
    const [x2, y2] = CELL_CENTERS[endIdx];

    // Extend line slightly past cell centers (by 8%)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const extendRatio = length > 0 ? 8 / length : 0;

    lineCoords = {
      x1: Math.max(5, Math.min(95, x1 - dx * extendRatio)),
      y1: Math.max(5, Math.min(95, y1 - dy * extendRatio)),
      x2: Math.max(5, Math.min(95, x2 + dx * extendRatio)),
      y2: Math.max(5, Math.min(95, y2 + dy * extendRatio)),
    };
  }

  return (
    <div className="w-full flex-1 flex items-center justify-center p-1.5 sm:p-4">
      {/* 3x3 Arena Wrapper - Lightweight GPU-friendly styling */}
      <div className="relative w-full max-w-[min(340px,46vh)] aspect-square rounded-3xl p-2.5 bg-slate-900/90 border border-slate-800/90 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.7)] cyber-grid-cyan shrink-0">
        {/* Subtle grid accent glow borders */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-cyan-500/20" />

        {/* 3x3 Tiles Grid */}
        <div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2.5 relative z-10">
          {board.map((cellValue, index) => {
            const isWinningCell = winningLine?.includes(index);
            const isDimmed = isGameOver && !isWinningCell;

            return (
              <motion.button
                key={index}
                whileTap={{ scale: disabled || cellValue ? 1 : 0.94 }}
                onClick={() => onCellClick(index)}
                disabled={disabled || cellValue !== null || isAiThinking}
                className={`group relative rounded-2xl flex items-center justify-center transition-all duration-200 select-none overflow-hidden cursor-pointer transform-gpu will-change-transform ${
                  cellValue === null
                    ? 'bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                    : 'bg-slate-950/90 border border-slate-800/90'
                } ${
                  isWinningCell
                    ? winResult.winner === 'X'
                      ? 'bg-cyan-950/40 border-cyan-400/90 shadow-[0_0_16px_rgba(0,240,255,0.4)]'
                      : 'bg-pink-950/40 border-pink-500/90 shadow-[0_0_16px_rgba(255,0,127,0.4)]'
                    : ''
                } ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
              >
                {/* Cell content */}
                {cellValue === 'X' && <NeonX isWinning={isWinningCell} />}
                {cellValue === 'O' && <NeonO isWinning={isWinningCell} />}

                {/* Ghost preview on hover for empty tiles */}
                {!cellValue && !disabled && !isAiThinking && (
                  <div className="opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none scale-90">
                    {currentPlayer === 'X' ? (
                      <span className="text-4xl font-black font-orbitron text-cyan-400">X</span>
                    ) : (
                      <span className="text-4xl font-black font-orbitron text-pink-500">O</span>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Lightweight Laser Strike-Through Line Overlay (No heavy SVG filters) */}
        {lineCoords && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20 rounded-3xl"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {/* Glowing neon halo */}
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              x1={`${lineCoords.x1}%`}
              y1={`${lineCoords.y1}%`}
              x2={`${lineCoords.x2}%`}
              y2={`${lineCoords.y2}%`}
              stroke={winResult.winner === 'X' ? '#00F0FF' : '#FF007F'}
              strokeWidth="6"
              strokeLinecap="round"
              className="drop-shadow-[0_0_8px_currentColor]"
            />

            {/* Sharp bright laser core */}
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              x1={`${lineCoords.x1}%`}
              y1={`${lineCoords.y1}%`}
              x2={`${lineCoords.x2}%`}
              y2={`${lineCoords.y2}%`}
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};

// Optimized Neon X Component (Hardware-accelerated, lightweight animations)
function NeonX({ isWinning }: { isWinning?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.18,
        ease: 'easeOut',
      }}
      className={`w-14 h-14 flex items-center justify-center transform-gpu will-change-transform ${
        isWinning ? 'animate-pulse' : ''
      }`}
    >
      <svg
        viewBox="0 0 60 60"
        className="w-12 h-12 overflow-visible drop-shadow-[0_0_8px_rgba(0,240,255,0.8)]"
      >
        <line
          x1="12"
          y1="12"
          x2="48"
          y2="48"
          stroke="#00F0FF"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <line
          x1="48"
          y1="12"
          x2="12"
          y2="48"
          stroke="#00F0FF"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* White neon hot core */}
        <line x1="12" y1="12" x2="48" y2="48" stroke="#E0F7FA" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="48" y1="12" x2="12" y2="48" stroke="#E0F7FA" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

// Optimized Neon O Component (Hardware-accelerated, lightweight animations)
function NeonO({ isWinning }: { isWinning?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0.2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.18,
        ease: 'easeOut',
      }}
      className={`w-14 h-14 flex items-center justify-center transform-gpu will-change-transform ${
        isWinning ? 'animate-pulse' : ''
      }`}
    >
      <svg
        viewBox="0 0 60 60"
        className="w-12 h-12 overflow-visible drop-shadow-[0_0_8px_rgba(255,0,127,0.85)]"
      >
        <circle
          cx="30"
          cy="30"
          r="19"
          fill="none"
          stroke="#FF007F"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* White neon hot core */}
        <circle cx="30" cy="30" r="19" fill="none" stroke="#FCE7F3" strokeWidth="2.2" />
      </svg>
    </motion.div>
  );
}

