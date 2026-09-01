import React from 'react';
import { motion } from 'motion/react';
import { Board, CellValue, Player, WinResult } from '../types';

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
    <div className="w-full flex-1 flex items-center justify-center p-4">
      {/* 3x3 Arena Wrapper */}
      <div className="relative w-full max-w-[320px] aspect-square rounded-3xl p-3 bg-slate-900/60 border border-slate-800/90 shadow-[0_10px_35px_-5px_rgba(0,0,0,0.7)] backdrop-blur-xl cyber-grid-cyan">
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
                whileTap={{ scale: disabled || cellValue ? 1 : 0.92 }}
                onClick={() => onCellClick(index)}
                disabled={disabled || cellValue !== null || isAiThinking}
                className={`group relative rounded-2xl flex items-center justify-center transition-all duration-300 select-none overflow-hidden cursor-pointer ${
                  cellValue === null
                    ? 'bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                    : 'bg-slate-950/90 border border-slate-800/90'
                } ${
                  isWinningCell
                    ? winResult.winner === 'X'
                      ? 'bg-cyan-950/40 border-cyan-400/90 shadow-[0_0_20px_rgba(0,240,255,0.4)]'
                      : 'bg-pink-950/40 border-pink-500/90 shadow-[0_0_20px_rgba(255,0,127,0.4)]'
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

        {/* SVG Laser Strike-Through Line Overlay */}
        {lineCoords && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-20 rounded-3xl"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="neon-glow-filter" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.5" result="blur1" />
                <feGaussianBlur stdDeviation="3.5" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Glowing wide halo */}
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              x1={`${lineCoords.x1}%`}
              y1={`${lineCoords.y1}%`}
              x2={`${lineCoords.x2}%`}
              y2={`${lineCoords.y2}%`}
              stroke={winResult.winner === 'X' ? '#00F0FF' : '#FF007F'}
              strokeWidth="6"
              strokeLinecap="round"
              filter="url(#neon-glow-filter)"
            />

            {/* Sharp bright laser core */}
            <motion.line
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
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

// Neon X Component
function NeonX({ isWinning }: { isWinning?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -25 }}
      animate={{ scale: isWinning ? [1, 1.15, 1] : 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 22,
        repeat: isWinning ? Infinity : 0,
        repeatDelay: 1,
      }}
      className="w-14 h-14 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 60 60"
        className="w-12 h-12 overflow-visible"
        style={{
          filter: 'drop-shadow(0 0 6px rgba(0, 240, 255, 0.8)) drop-shadow(0 0 16px rgba(0, 240, 255, 0.4))',
        }}
      >
        <motion.line
          x1="12"
          y1="12"
          x2="48"
          y2="48"
          stroke="#00F0FF"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        />
        <motion.line
          x1="48"
          y1="12"
          x2="12"
          y2="48"
          stroke="#00F0FF"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.22, delay: 0.06, ease: 'easeOut' }}
        />
        {/* White neon hot core */}
        <line x1="12" y1="12" x2="48" y2="48" stroke="#E0F7FA" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="48" y1="12" x2="12" y2="48" stroke="#E0F7FA" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

// Neon O Component
function NeonO({ isWinning }: { isWinning?: boolean }) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: isWinning ? [1, 1.15, 1] : 1 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 22,
        repeat: isWinning ? Infinity : 0,
        repeatDelay: 1,
      }}
      className="w-14 h-14 flex items-center justify-center"
    >
      <svg
        viewBox="0 0 60 60"
        className="w-12 h-12 overflow-visible"
        style={{
          filter: 'drop-shadow(0 0 6px rgba(255, 0, 127, 0.85)) drop-shadow(0 0 16px rgba(255, 0, 127, 0.4))',
        }}
      >
        <motion.circle
          cx="30"
          cy="30"
          r="19"
          fill="none"
          stroke="#FF007F"
          strokeWidth="7"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        />
        {/* White neon hot core */}
        <circle cx="30" cy="30" r="19" fill="none" stroke="#FCE7F3" strokeWidth="2.2" />
      </svg>
    </motion.div>
  );
}
