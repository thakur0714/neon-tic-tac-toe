import React, { useMemo } from 'react';
import { LudoColor, LudoPlayer, LudoThemeMode, LudoToken, LudoTurnState } from '../../../types/ludo';
import {
  GRID_SIZE,
  LUDO_COLOR_THEMES,
  MAIN_TRACK_COORDINATES,
  SAFE_TRACK_INDICES,
  COLOR_START_INDICES,
  HOME_PATH_COORDINATES,
  YARD_SPAWN_COORDINATES,
  getTokenCoordinates,
} from '../../../utils/ludoConstants';
import { LudoTokenVisual } from './LudoTokenVisual';
import { Star, Trophy, ArrowRight, ArrowDown, ArrowLeft, ArrowUp, User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { triggerHaptic } from '../../../utils/audio';

interface LudoBoardProps {
  players: LudoPlayer[];
  currentTurnColor?: LudoColor | null;
  turnState?: LudoTurnState;
  diceValue?: number | null;
  consecutiveSixes?: number;
  selectableTokenIds?: number[];
  onTokenClick?: (token: LudoToken) => void;
  onRollDice?: () => void;
  theme?: LudoThemeMode;
}

// 1-Based CSS Grid Spans for the 6x6 Base Backgrounds
const BASE_BACKGROUND_SPANS: Record<LudoColor, { row: string; col: string }> = {
  red: { row: '1 / 7', col: '1 / 7' },
  green: { row: '1 / 7', col: '10 / 16' },
  blue: { row: '10 / 16', col: '1 / 7' },
  yellow: { row: '10 / 16', col: '10 / 16' },
};

// 1-Based CSS Grid Spans for the 2x2 In-Base Terminals (Rows 3..4 / Cols 3..4 relative to base)
// Guaranteed ZERO overlap with corner nests located at (1,1), (1,4), (4,1), (4,4)
const BASE_TERMINAL_SPANS: Record<LudoColor, { row: string; col: string }> = {
  red: { row: '3 / span 2', col: '3 / span 2' },
  green: { row: '3 / span 2', col: '12 / span 2' },
  blue: { row: '12 / span 2', col: '3 / span 2' },
  yellow: { row: '12 / span 2', col: '12 / span 2' },
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  players,
  currentTurnColor = null,
  turnState = 'waiting_roll',
  diceValue = null,
  selectableTokenIds = [],
  onTokenClick,
  onRollDice,
  theme = 'cyber',
}) => {
  const isCyber = theme === 'cyber';

  // Active tokens list with exact (r, c) coordinates
  const allTokens = useMemo(() => {
    const list: Array<{ token: LudoToken; coords: { r: number; c: number } }> = [];
    players.forEach((player) => {
      player.tokens.forEach((token) => {
        const coords = getTokenCoordinates(token.color, token.id, token.step);
        list.push({ token, coords });
      });
    });
    return list;
  }, [players]);

  // Group tokens by coordinate to spread stacked tokens on the same track cell
  const tokenStacks = useMemo(() => {
    const map = new Map<string, Array<{ token: LudoToken; coords: { r: number; c: number } }>>();
    allTokens.forEach((item) => {
      const key = `${item.coords.r.toFixed(1)}_${item.coords.c.toFixed(1)}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    });
    return map;
  }, [allTokens]);

  // Fast track cells lookup
  const trackMap = useMemo(() => {
    const map = new Map<
      string,
      {
        trackIndex: number;
        isSafe: boolean;
        isStart: boolean;
        startColor?: LudoColor;
      }
    >();

    MAIN_TRACK_COORDINATES.forEach((coord, idx) => {
      const key = `${coord.r}_${coord.c}`;
      let startColor: LudoColor | undefined;
      if (idx === COLOR_START_INDICES.red) startColor = 'red';
      if (idx === COLOR_START_INDICES.green) startColor = 'green';
      if (idx === COLOR_START_INDICES.yellow) startColor = 'yellow';
      if (idx === COLOR_START_INDICES.blue) startColor = 'blue';

      map.set(key, {
        trackIndex: idx,
        isSafe: SAFE_TRACK_INDICES.has(idx),
        isStart: startColor !== undefined,
        startColor,
      });
    });
    return map;
  }, []);

  // Fast Home Path lookup
  const homePathMap = useMemo(() => {
    const map = new Map<string, { color: LudoColor; stepIndex: number }>();
    (['red', 'green', 'yellow', 'blue'] as LudoColor[]).forEach((col) => {
      HOME_PATH_COORDINATES[col].forEach((coord, stepIdx) => {
        map.set(`${coord.r}_${coord.c}`, { color: col, stepIndex: stepIdx });
      });
    });
    return map;
  }, []);

  // Crisp Geometric Dice Pips Renderer
  const renderDicePips = (val: number, color: LudoColor) => {
    const colTheme = LUDO_COLOR_THEMES[color];
    const dotColor = isCyber ? colTheme.neonColor : '#0F172A';
    const dotGlow = isCyber ? `0 0 6px ${colTheme.neonColor}` : 'none';

    switch (val) {
      case 1:
        return (
          <div className="w-full h-full flex items-center justify-center">
            <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 2:
        return (
          <div className="w-full h-full flex justify-between p-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full self-end" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 3:
        return (
          <div className="w-full h-full flex justify-between p-1.5 relative">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full self-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-2 h-2 rounded-full self-end" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 4:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-1.5 gap-1 place-items-center">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 5:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2 p-1.5 gap-1 place-items-center relative">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
      case 6:
      default:
        return (
          <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-1 gap-x-1 gap-y-0.5 place-items-center">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor, boxShadow: dotGlow }} />
          </div>
        );
    }
  };

  const handleYardDiceClick = () => {
    if (turnState === 'waiting_roll' && onRollDice) {
      triggerHaptic('medium');
      onRollDice();
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 select-none">
      {/* Master Board Container */}
      <div
        className={`w-full max-w-[min(94vw,70vh)] aspect-square rounded-3xl p-1.5 sm:p-2.5 relative shadow-2xl transition-all duration-300 ${
          isCyber
            ? 'bg-[#070A12] border-2 border-slate-700/70 shadow-[0_0_40px_rgba(6,182,212,0.18)]'
            : 'bg-amber-950/95 border-4 border-amber-800 shadow-black/80'
        }`}
      >
        {/* Strict 15x15 CSS Grid System (Zero Gap to Guarantee Exact Mathematical Percentage Alignment) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(15, minmax(0, 1fr))',
            gridTemplateRows: 'repeat(15, minmax(0, 1fr))',
          }}
          className="w-full h-full relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800"
        >
          {/* 1. 6x6 BASE BACKGROUND PANELS */}
          {/* Red Base: 1 / 7 x 1 / 7 */}
          <div
            style={{
              gridRow: BASE_BACKGROUND_SPANS.red.row,
              gridColumn: BASE_BACKGROUND_SPANS.red.col,
              backgroundColor: isCyber ? '#150608' : '#7F1D1D',
              borderColor: isCyber ? (currentTurnColor === 'red' ? '#EF4444' : 'rgba(239,68,68,0.35)') : '#991B1B',
            }}
            className="rounded-2xl border transition-all duration-300"
          />

          {/* Green Base: 1 / 7 x 10 / 16 */}
          <div
            style={{
              gridRow: BASE_BACKGROUND_SPANS.green.row,
              gridColumn: BASE_BACKGROUND_SPANS.green.col,
              backgroundColor: isCyber ? '#04150E' : '#064E3B',
              borderColor: isCyber ? (currentTurnColor === 'green' ? '#10B981' : 'rgba(16,185,129,0.35)') : '#047857',
            }}
            className="rounded-2xl border transition-all duration-300"
          />

          {/* Blue Base: 10 / 16 x 1 / 7 */}
          <div
            style={{
              gridRow: BASE_BACKGROUND_SPANS.blue.row,
              gridColumn: BASE_BACKGROUND_SPANS.blue.col,
              backgroundColor: isCyber ? '#04131C' : '#1E3A8A',
              borderColor: isCyber ? (currentTurnColor === 'blue' ? '#06B6D4' : 'rgba(6,182,212,0.35)') : '#1D4ED8',
            }}
            className="rounded-2xl border transition-all duration-300"
          />

          {/* Yellow Base: 10 / 16 x 10 / 16 */}
          <div
            style={{
              gridRow: BASE_BACKGROUND_SPANS.yellow.row,
              gridColumn: BASE_BACKGROUND_SPANS.yellow.col,
              backgroundColor: isCyber ? '#1A1104' : '#78350F',
              borderColor: isCyber ? (currentTurnColor === 'yellow' ? '#F59E0B' : 'rgba(245,158,11,0.35)') : '#B45309',
            }}
            className="rounded-2xl border transition-all duration-300"
          />

          {/* 2. CENTER 3x3 VICTORY EMBLEM (Rows 7..9, Cols 7..9) */}
          <div
            style={{ gridRow: '7 / span 3', gridColumn: '7 / span 3' }}
            className="relative overflow-hidden bg-slate-950 border border-slate-700/80 flex items-center justify-center z-10"
          >
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100">
              <polygon points="0,0 50,50 0,100" fill={isCyber ? '#EF4444' : '#DC2626'} fillOpacity={isCyber ? 0.45 : 0.85} stroke={isCyber ? '#F87171' : '#991B1B'} strokeWidth="1.5" />
              <polygon points="0,0 50,50 100,0" fill={isCyber ? '#10B981' : '#059669'} fillOpacity={isCyber ? 0.45 : 0.85} stroke={isCyber ? '#34D399' : '#065F46'} strokeWidth="1.5" />
              <polygon points="100,0 50,50 100,100" fill={isCyber ? '#F59E0B' : '#D97706'} fillOpacity={isCyber ? 0.45 : 0.85} stroke={isCyber ? '#FBBF24' : '#92400E'} strokeWidth="1.5" />
              <polygon points="0,100 50,50 100,100" fill={isCyber ? '#06B6D4' : '#2563EB'} fillOpacity={isCyber ? 0.45 : 0.85} stroke={isCyber ? '#22D3EE' : '#1E40AF'} strokeWidth="1.5" />
            </svg>
            <div className="relative z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-950/95 border-2 border-amber-400 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]">
              <Trophy className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-amber-400" />
            </div>
          </div>

          {/* 3. TRACK & HOME CELLS (Outer Pathway Grid) */}
          {Array.from({ length: 15 }).map((_, r) =>
            Array.from({ length: 15 }).map((_, c) => {
              const isRedBase = r < 6 && c < 6;
              const isGreenBase = r < 6 && c >= 9;
              const isBlueBase = r >= 9 && c < 6;
              const isYellowBase = r >= 9 && c >= 9;
              const isCenterHome = r >= 6 && r <= 8 && c >= 6 && c <= 8;

              if (isRedBase || isGreenBase || isBlueBase || isYellowBase || isCenterHome) return null;

              const cellKey = `${r}_${c}`;
              const trackInfo = trackMap.get(cellKey);
              const homePathInfo = homePathMap.get(cellKey);

              let cellBg = isCyber ? 'bg-[#0A0F1D]' : 'bg-slate-100';
              let cellBorder = isCyber ? 'border-slate-850' : 'border-slate-300';
              let content = null;

              if (homePathInfo) {
                const themeCol = LUDO_COLOR_THEMES[homePathInfo.color];
                cellBg = isCyber ? 'bg-[#080C18]' : 'bg-white';
                cellBorder = isCyber ? 'border-slate-800' : 'border-slate-400';
                content = (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: isCyber ? `${themeCol.neonDarkBg}95` : themeCol.classicColor }}>
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-inner" style={{ backgroundColor: isCyber ? themeCol.neonColor : '#FFFFFF', boxShadow: isCyber ? `0 0 8px ${themeCol.neonColor}` : 'none' }} />
                  </div>
                );
              } else if (trackInfo) {
                if (trackInfo.isStart && trackInfo.startColor) {
                  const themeCol = LUDO_COLOR_THEMES[trackInfo.startColor];
                  cellBg = isCyber ? 'bg-[#080C18]' : 'bg-white';
                  content = (
                    <div className="w-full h-full flex items-center justify-center relative" style={{ backgroundColor: isCyber ? `${themeCol.neonDarkBg}95` : themeCol.classicColor }}>
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" style={{ color: isCyber ? themeCol.neonColor : '#FFFFFF', fill: isCyber ? themeCol.neonColor : '#FFFFFF' }} />
                    </div>
                  );
                } else if (trackInfo.isSafe) {
                  content = (
                    <div className="w-full h-full flex items-center justify-center bg-slate-950/70">
                      <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400" />
                    </div>
                  );
                } else if (r === 7 && c === 0) content = <ArrowRight className="w-3 h-3 text-red-400" />;
                else if (r === 0 && c === 7) content = <ArrowDown className="w-3 h-3 text-emerald-400" />;
                else if (r === 7 && c === 14) content = <ArrowLeft className="w-3 h-3 text-amber-400" />;
                else if (r === 14 && c === 7) content = <ArrowUp className="w-3 h-3 text-cyan-400" />;
              }

              return (
                <div
                  key={cellKey}
                  style={{ gridRow: r + 1, gridColumn: c + 1 }}
                  className={`w-full h-full flex items-center justify-center border border-slate-800/80 ${cellBorder} ${cellBg} relative`}
                >
                  {content}
                </div>
              );
            })
          )}

          {/* 4. BASE NEST SOCKETS (Rendered strictly inside grid cells: r+1, c+1) */}
          {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((color) => {
            const colTheme = LUDO_COLOR_THEMES[color];
            return YARD_SPAWN_COORDINATES[color].map((coord, idx) => (
              <div
                key={`nest_${color}_${idx}`}
                style={{ gridRow: coord.r + 1, gridColumn: coord.c + 1 }}
                className="w-full h-full flex items-center justify-center pointer-events-none z-15 p-0.5"
              >
                {/* Outer Concentric Socket */}
                <div
                  className="w-full h-full max-w-[28px] max-h-[28px] sm:max-w-[34px] sm:max-h-[34px] rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: isCyber ? `${colTheme.neonColor}90` : '#FFFFFF90',
                    backgroundColor: isCyber ? '#090D18' : '#1E293B',
                    boxShadow: isCyber ? `0 0 10px ${colTheme.neonColor}50` : 'none',
                  }}
                >
                  {/* Inner Concentric Target Ring */}
                  <div
                    className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full border flex items-center justify-center"
                    style={{ borderColor: isCyber ? `${colTheme.neonColor}70` : '#FFFFFF50' }}
                  >
                    <div
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                      style={{ backgroundColor: isCyber ? colTheme.neonColor : '#FFFFFF' }}
                    />
                  </div>
                </div>
              </div>
            ));
          })}

          {/* 5. 2x2 IN-BASE TERMINALS (Strict 2x2 Grid Area: Zero Overlap with Nest Sockets) */}
          {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((color) => {
            const isTurn = currentTurnColor === color;
            const colTheme = LUDO_COLOR_THEMES[color];
            const player = players.find((p) => p.color === color);
            const spanConfig = BASE_TERMINAL_SPANS[color];
            const canRollNow = isTurn && turnState === 'waiting_roll';
            const isRollingNow = isTurn && turnState === 'rolling';

            return (
              <div
                key={`base_terminal_${color}`}
                style={{ gridRow: spanConfig.row, gridColumn: spanConfig.col }}
                className="w-full h-full z-20 flex items-center justify-center p-0.5 select-none"
              >
                {isTurn ? (
                  <div
                    className="w-full h-full rounded-xl bg-slate-950/95 border-2 p-1 flex flex-col items-center justify-center relative shadow-2xl transition-all"
                    style={{
                      borderColor: colTheme.neonBorder,
                      boxShadow: isCyber ? `0 0 20px ${colTheme.neonColor}60` : undefined,
                    }}
                  >
                    <motion.button
                      type="button"
                      whileHover={canRollNow ? { scale: 1.08 } : undefined}
                      whileTap={canRollNow ? { scale: 0.92 } : undefined}
                      onClick={handleYardDiceClick}
                      disabled={!canRollNow}
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg relative flex items-center justify-center transition-all ${
                        canRollNow ? 'cursor-pointer shadow-lg' : 'cursor-default'
                      }`}
                      style={{
                        backgroundColor: isCyber ? '#0B0F1C' : '#FFFFFF',
                        border: `2px solid ${colTheme.neonBorder}`,
                        boxShadow: isCyber
                          ? `0 0 16px ${colTheme.neonColor}, inset 0 2px 4px rgba(255,255,255,0.25)`
                          : '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    >
                      {canRollNow && (
                        <span
                          className="absolute -inset-1 rounded-lg animate-ping opacity-75 pointer-events-none"
                          style={{ backgroundColor: colTheme.neonColor }}
                        />
                      )}

                      <AnimatePresence mode="wait">
                        {isRollingNow ? (
                          <motion.div
                            key="rolling_anim"
                            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.25, 0.9, 1.2, 1] }}
                            transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
                            className="w-full h-full flex items-center justify-center"
                          >
                            <div
                              className="w-3.5 h-3.5 rounded-full animate-spin border-2 border-t-transparent"
                              style={{ borderColor: colTheme.neonColor, borderTopColor: 'transparent' }}
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key={`${color}_dice_${diceValue || 6}`}
                            initial={{ scale: 0.7, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                            className="w-full h-full p-0.5 flex items-center justify-center"
                          >
                            {renderDicePips(diceValue || 6, color)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <div className="mt-0.5 pointer-events-none">
                      <span
                        className="text-[6.5px] sm:text-[7.5px] font-orbitron font-extrabold px-1 py-0.2 rounded border shadow whitespace-nowrap uppercase tracking-wider"
                        style={{
                          backgroundColor: isCyber ? colTheme.neonDarkBg : '#0F172A',
                          borderColor: colTheme.neonBorder,
                          color: isCyber ? colTheme.neonColor : '#F8FAFC',
                        }}
                      >
                        {isRollingNow ? 'ROLL' : canRollNow ? 'ROLL' : selectableTokenIds.length > 0 ? 'PICK' : 'NEXT'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="w-full h-full rounded-xl bg-slate-950/85 border border-slate-800 p-1 flex flex-col items-center justify-center pointer-events-none transition-all"
                    style={{ borderColor: isCyber ? `${colTheme.neonBorder}50` : '#334155' }}
                  >
                    <span
                      className="text-[9px] sm:text-[11px] font-orbitron font-black tracking-widest uppercase"
                      style={{
                        color: isCyber ? colTheme.neonColor : '#F8FAFC',
                        textShadow: isCyber ? `0 0 10px ${colTheme.neonColor}` : 'none',
                      }}
                    >
                      {color.toUpperCase()}
                    </span>

                    {player && (
                      <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[8px] text-slate-400 font-mono">
                        {player.type === 'bot' ? <Bot className="w-2 h-2 text-slate-400" /> : <User className="w-2 h-2 text-slate-400" />}
                        <span>{player.tokensHome}/4</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* 6. TOKENS OVERLAY LAYER (Unified Exact 15x15 Matrix Overlay) */}
          <div className="absolute inset-0 pointer-events-none z-30">
            {allTokens.map((item) => {
              // Exact center formula of grid cell (r, c)
              const leftPct = ((item.coords.c + 0.5) / GRID_SIZE) * 100;
              const topPct = ((item.coords.r + 0.5) / GRID_SIZE) * 100;
              const isTurn = currentTurnColor === item.token.color;
              const isSelectable = isTurn && selectableTokenIds.includes(item.token.id);

              const stackKey = `${item.coords.r.toFixed(1)}_${item.coords.c.toFixed(1)}`;
              const stack = tokenStacks.get(stackKey) || [item];
              const stackIndex = stack.findIndex((s) => s.token.color === item.token.color && s.token.id === item.token.id);

              const angle = (stackIndex / stack.length) * 2 * Math.PI;
              const offsetRadius = stack.length > 1 && !item.token.isInYard ? 4 : 0;
              const offsetX = Math.cos(angle) * offsetRadius;
              const offsetY = Math.sin(angle) * offsetRadius;

              return (
                <motion.div
                  key={`${item.token.color}_${item.token.id}`}
                  initial={false}
                  animate={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    x: offsetX,
                    y: offsetY,
                    scale: isSelectable ? 1.15 : 1,
                    zIndex: isSelectable ? 40 : 25 + stackIndex,
                  }}
                  transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.5 }}
                  style={{ position: 'absolute', transform: 'translate(-50%, -50%)' }}
                  className="pointer-events-auto flex items-center justify-center"
                >
                  <LudoTokenVisual
                    token={item.token}
                    isSelectable={isSelectable}
                    isCurrentTurn={isTurn}
                    onClick={() => onTokenClick?.(item.token)}
                    stackCount={stack.length}
                    stackIndex={stackIndex}
                    theme={theme}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
