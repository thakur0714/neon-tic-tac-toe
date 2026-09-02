import React, { useEffect, useMemo, useState } from "react";
import {
  LudoColor,
  LudoPlayer,
  LudoThemeMode,
  LudoToken,
  LudoTurnState,
} from "../../../types/ludo";
import {
  GRID_SIZE,
  LUDO_COLOR_THEMES,
  MAIN_TRACK_COORDINATES,
  SAFE_TRACK_INDICES,
  COLOR_START_INDICES,
  HOME_PATH_COORDINATES,
  YARD_SPAWN_COORDINATES,
  getTokenCoordinates,
} from "../../../utils/ludoConstants";
import { LudoTokenVisual } from "./LudoTokenVisual";
import {
  Star,
  Trophy,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  User,
  Bot,
} from "lucide-react";
import { motion } from "motion/react";
import { triggerHaptic } from "../../../utils/audio";

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
  red: { row: "1 / 7", col: "1 / 7" },
  green: { row: "1 / 7", col: "10 / 16" },
  blue: { row: "10 / 16", col: "1 / 7" },
  yellow: { row: "10 / 16", col: "10 / 16" },
};

// 1-Based CSS Grid Spans for the 2x2 In-Base Terminals (Rows 3..4 / Cols 3..4 relative to base)
// Guaranteed ZERO overlap with corner nests located at (1,1), (1,4), (4,1), (4,4)
const BASE_TERMINAL_SPANS: Record<LudoColor, { row: string; col: string }> = {
  red: { row: "3 / span 2", col: "3 / span 2" },
  green: { row: "3 / span 2", col: "12 / span 2" },
  blue: { row: "12 / span 2", col: "3 / span 2" },
  yellow: { row: "12 / span 2", col: "12 / span 2" },
};

// Real dice pip layout on a conceptual 3x3 grid (cell indices that carry a pip)
const PIP_LAYOUT: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function renderPips(val: number, color: LudoColor, isCyber: boolean) {
  const colTheme = LUDO_COLOR_THEMES[color];
  const dotColor = isCyber ? colTheme.neonColor : "#1E1B16";
  const dotGlow = isCyber
    ? `0 0 5px ${colTheme.neonColor}, 0 0 1px ${colTheme.neonColor}`
    : "inset 0 -1px 1px rgba(0,0,0,0.35)";
  const pips = PIP_LAYOUT[Math.min(6, Math.max(1, val))] || PIP_LAYOUT[6];
  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center p-[15%]">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className="rounded-full transition-all"
          style={{
            width: "68%",
            height: "68%",
            backgroundColor: pips.includes(i) ? dotColor : "transparent",
            boxShadow: pips.includes(i) ? dotGlow : "none",
          }}
        />
      ))}
    </div>
  );
}

// Realistic tumbling dice used inside the active player's home base
const BaseTerminalDice: React.FC<{
  color: LudoColor;
  colTheme: (typeof LUDO_COLOR_THEMES)[LudoColor];
  isCyber: boolean;
  canRoll: boolean;
  isRolling: boolean;
  diceValue: number | null;
  hint: string;
  onRoll: () => void;
}> = ({
  color,
  colTheme,
  isCyber,
  canRoll,
  isRolling,
  diceValue,
  hint,
  onRoll,
}) => {
  const [tumbleFace, setTumbleFace] = useState(diceValue || 6);

  useEffect(() => {
    if (!isRolling) return;
    const id = setInterval(
      () => setTumbleFace(Math.floor(Math.random() * 6) + 1),
      80,
    );
    return () => clearInterval(id);
  }, [isRolling]);

  const dieFace = isRolling ? tumbleFace : diceValue || 6;

  return (
    <div className="flex h-full w-full items-center justify-center">
      <motion.button
        type="button"
        whileHover={canRoll ? { scale: 1.06 } : undefined}
        whileTap={canRoll ? { scale: 0.9 } : undefined}
        onClick={canRoll ? onRoll : undefined}
        disabled={!canRoll}
        aria-label={hint}
        className={`relative flex items-center justify-center ${canRoll ? "cursor-pointer" : "cursor-default"}`}
        style={{
          width: "62%",
          maxWidth: 44,
          aspectRatio: "1 / 1",
          perspective: 260,
        }}
      >
        {canRoll && (
          <motion.span
            className="pointer-events-none absolute -inset-1.5 rounded-[28%]"
            style={{ backgroundColor: colTheme.neonColor }}
            animate={{ opacity: [0.35, 0, 0.35], scale: [0.9, 1.25, 0.9] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        <motion.div
          className="relative h-full w-full rounded-[26%]"
          style={{
            transformStyle: "preserve-3d",
            background: isCyber
              ? `linear-gradient(150deg, #10141f 0%, #060912 60%, #0d1220 100%)`
              : `linear-gradient(150deg, #ffffff 0%, #f2ead4 55%, #e2d4ad 100%)`,
            border: `1.5px solid ${isCyber ? colTheme.neonBorder : "#c8b78a"}`,
            boxShadow: isCyber
              ? `0 0 14px ${colTheme.neonColor}aa, inset 0 2px 5px rgba(255,255,255,0.12), inset 0 -3px 6px rgba(0,0,0,0.55)`
              : `0 5px 10px rgba(0,0,0,0.35), inset 0 3px 5px rgba(255,255,255,0.85), inset 0 -4px 7px rgba(0,0,0,0.22)`,
          }}
          animate={
            isRolling
              ? {
                  rotateX: [0, -32, 24, -14, 0],
                  rotateZ: [0, 14, -12, 7, 0],
                  y: [0, -6, 0, -3, 0],
                  scale: [1, 1.05, 0.97, 1.03, 1],
                }
              : { rotateX: 0, rotateZ: 0, y: 0, scale: 1 }
          }
          transition={
            isRolling
              ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
              : { type: "spring", stiffness: 380, damping: 14 }
          }
        >
          <motion.div
            key={isRolling ? "tumble" : `settled-${dieFace}`}
            className="absolute inset-0"
            initial={
              isRolling ? false : { scale: 0.7, rotate: -20, opacity: 0.4 }
            }
            animate={isRolling ? {} : { scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
          >
            {renderPips(dieFace, color, isCyber)}
          </motion.div>
        </motion.div>
      </motion.button>
    </div>
  );
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  players,
  currentTurnColor = null,
  turnState = "waiting_roll",
  diceValue = null,
  selectableTokenIds = [],
  onTokenClick,
  onRollDice,
  theme = "cyber",
}) => {
  const isCyber = theme === "cyber";

  // Colors that are actually in play this match (empty seats are hidden)
  const activeColors = useMemo(
    () => new Set(players.filter((p) => p.type !== "none").map((p) => p.color)),
    [players],
  );
  const isActive = (color: LudoColor) => activeColors.has(color);

  // Active tokens list with exact (r, c) coordinates
  const allTokens = useMemo(() => {
    const list: Array<{ token: LudoToken; coords: { r: number; c: number } }> =
      [];
    players.forEach((player) => {
      if (player.type === "none") return;
      player.tokens.forEach((token) => {
        const coords = getTokenCoordinates(token.color, token.id, token.step);
        list.push({ token, coords });
      });
    });
    return list;
  }, [players]);

  // Group tokens by coordinate to spread stacked tokens on the same track cell
  const tokenStacks = useMemo(() => {
    const map = new Map<
      string,
      Array<{ token: LudoToken; coords: { r: number; c: number } }>
    >();
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
      if (idx === COLOR_START_INDICES.red) startColor = "red";
      if (idx === COLOR_START_INDICES.green) startColor = "green";
      if (idx === COLOR_START_INDICES.yellow) startColor = "yellow";
      if (idx === COLOR_START_INDICES.blue) startColor = "blue";

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
    (["red", "green", "yellow", "blue"] as LudoColor[]).forEach((col) => {
      HOME_PATH_COORDINATES[col].forEach((coord, stepIdx) => {
        map.set(`${coord.r}_${coord.c}`, { color: col, stepIndex: stepIdx });
      });
    });
    return map;
  }, []);

  const handleYardDiceClick = () => {
    if (turnState === "waiting_roll" && onRollDice) {
      triggerHaptic("medium");
      onRollDice();
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-1 sm:p-2 select-none">
      {/* Master Board Container */}
      <div
        className={`w-full max-w-[min(94vw,70vh)] aspect-square rounded-3xl p-1.5 sm:p-2.5 relative shadow-2xl transition-all duration-300 ${
          isCyber
            ? "border-2 border-slate-700/70"
            : "border-[5px] border-[#5b3b21]"
        }`}
        style={{
          background: isCyber
            ? "radial-gradient(circle at 50% 0%, #0f1626 0%, #070a12 55%, #04060c 100%)"
            : "linear-gradient(150deg, #8a5a30 0%, #6b4423 45%, #4d3018 100%)",
          boxShadow: isCyber
            ? "0 0 40px rgba(6,182,212,0.18), inset 0 0 30px rgba(0,0,0,0.6)"
            : "0 18px 40px rgba(0,0,0,0.55), inset 0 2px 4px rgba(255,255,255,0.15)",
        }}
      >
        {/* Strict 15x15 CSS Grid System (Zero Gap to Guarantee Exact Mathematical Percentage Alignment) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
            gridTemplateRows: "repeat(15, minmax(0, 1fr))",
            background: isCyber
              ? "radial-gradient(circle at 50% 50%, #0a0f1d 0%, #05070e 100%)"
              : "#f7edd8",
          }}
          className={`w-full h-full relative rounded-2xl overflow-hidden border ${isCyber ? "border-slate-800" : "border-[#c8b78a]"}`}
        >
          {/* 1. 6x6 BASE BACKGROUND PANELS */}
          {(["red", "green", "blue", "yellow"] as LudoColor[]).map((color) => {
            const ct = LUDO_COLOR_THEMES[color];
            const seatActive = isActive(color);
            const active = seatActive && currentTurnColor === color;
            return (
              <motion.div
                key={`base_bg_${color}`}
                style={{
                  gridRow: BASE_BACKGROUND_SPANS[color].row,
                  gridColumn: BASE_BACKGROUND_SPANS[color].col,
                  opacity: seatActive ? 1 : 0.18,
                  background: !seatActive
                    ? isCyber
                      ? "#0b0f1a"
                      : "#e9dfc4"
                    : isCyber
                      ? `radial-gradient(circle at 50% 40%, ${ct.neonColor}2e 0%, #05070e 72%)`
                      : `linear-gradient(150deg, ${ct.classicColor} 0%, ${ct.classicDark} 100%)`,
                  borderColor: !seatActive
                    ? isCyber
                      ? "#1e293b"
                      : "#cbbf9d"
                    : isCyber
                      ? active
                        ? ct.neonColor
                        : `${ct.neonColor}40`
                      : ct.classicBorder,
                }}
                className="rounded-2xl border-2 transition-colors duration-300"
                animate={
                  active
                    ? {
                        boxShadow: isCyber
                          ? [
                              `0 0 8px ${ct.neonColor}40`,
                              `0 0 24px ${ct.neonColor}99`,
                              `0 0 8px ${ct.neonColor}40`,
                            ]
                          : [
                              `inset 0 0 0 0 ${ct.classicColor}00`,
                              `inset 0 0 22px 2px rgba(255,255,255,0.35)`,
                              `inset 0 0 0 0 ${ct.classicColor}00`,
                            ],
                      }
                    : {
                        boxShadow: isCyber
                          ? `0 0 0px ${ct.neonColor}00`
                          : "inset 0 0 18px rgba(0,0,0,0.35)",
                      }
                }
                transition={{
                  duration: 2,
                  repeat: active ? Infinity : 0,
                  ease: "easeInOut",
                }}
              />
            );
          })}

          {/* 2. CENTER 3x3 VICTORY EMBLEM (Rows 7..9, Cols 7..9) */}
          <div
            style={{ gridRow: "7 / span 3", gridColumn: "7 / span 3" }}
            className={`relative overflow-hidden border flex items-center justify-center z-10 ${isCyber ? "bg-slate-950 border-slate-700/80" : "bg-[#f7edd8] border-[#c8b78a]"}`}
          >
            <svg
              className="w-full h-full absolute inset-0"
              viewBox="0 0 100 100"
            >
              <polygon
                points="0,0 50,50 0,100"
                fill={isCyber ? "#EF4444" : "#DC2626"}
                fillOpacity={isCyber ? 0.45 : 0.85}
                stroke={isCyber ? "#F87171" : "#991B1B"}
                strokeWidth="1.5"
              />
              <polygon
                points="0,0 50,50 100,0"
                fill={isCyber ? "#10B981" : "#059669"}
                fillOpacity={isCyber ? 0.45 : 0.85}
                stroke={isCyber ? "#34D399" : "#065F46"}
                strokeWidth="1.5"
              />
              <polygon
                points="100,0 50,50 100,100"
                fill={isCyber ? "#F59E0B" : "#D97706"}
                fillOpacity={isCyber ? 0.45 : 0.85}
                stroke={isCyber ? "#FBBF24" : "#92400E"}
                strokeWidth="1.5"
              />
              <polygon
                points="0,100 50,50 100,100"
                fill={isCyber ? "#06B6D4" : "#2563EB"}
                fillOpacity={isCyber ? 0.45 : 0.85}
                stroke={isCyber ? "#22D3EE" : "#1E40AF"}
                strokeWidth="1.5"
              />
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

              if (
                isRedBase ||
                isGreenBase ||
                isBlueBase ||
                isYellowBase ||
                isCenterHome
              )
                return null;

              const cellKey = `${r}_${c}`;
              const trackInfo = trackMap.get(cellKey);
              const homePathInfo = homePathMap.get(cellKey);

              let cellStyle: React.CSSProperties = {
                background: isCyber ? "#0a1120" : "#fbf5e6",
                borderColor: isCyber
                  ? "rgba(80,110,160,0.14)"
                  : "rgba(60,45,25,0.28)",
                boxShadow: isCyber
                  ? "inset 0 0 6px rgba(0,0,0,0.5)"
                  : "inset 0 0 3px rgba(0,0,0,0.12)",
              };
              let content = null;

              if (homePathInfo) {
                const themeCol = LUDO_COLOR_THEMES[homePathInfo.color];
                cellStyle = {
                  background: isCyber
                    ? `linear-gradient(180deg, ${themeCol.neonColor}44, ${themeCol.neonColor}22)`
                    : `linear-gradient(180deg, ${themeCol.classicColor}, ${themeCol.classicDark})`,
                  borderColor: isCyber
                    ? `${themeCol.neonColor}66`
                    : themeCol.classicBorder,
                  boxShadow: isCyber
                    ? `inset 0 0 8px ${themeCol.neonColor}55`
                    : "inset 0 1px 2px rgba(255,255,255,0.35)",
                  opacity: isActive(homePathInfo.color) ? 1 : 0.22,
                };
              } else if (trackInfo) {
                if (trackInfo.isStart && trackInfo.startColor) {
                  const themeCol = LUDO_COLOR_THEMES[trackInfo.startColor];
                  cellStyle = {
                    background: isCyber
                      ? `radial-gradient(circle, ${themeCol.neonColor}55, ${themeCol.neonColor}22)`
                      : `linear-gradient(180deg, ${themeCol.classicColor}, ${themeCol.classicDark})`,
                    borderColor: isCyber
                      ? themeCol.neonColor
                      : themeCol.classicBorder,
                    boxShadow: isCyber
                      ? `inset 0 0 10px ${themeCol.neonColor}`
                      : "inset 0 1px 2px rgba(255,255,255,0.4)",
                    opacity: isActive(trackInfo.startColor) ? 1 : 0.3,
                  };
                  content = (
                    <Star
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5 drop-shadow"
                      style={{
                        color: isCyber ? "#fff" : "#fff",
                        fill: isCyber ? themeCol.neonColor : "#ffffffcc",
                      }}
                    />
                  );
                } else if (trackInfo.isSafe) {
                  cellStyle = {
                    background: isCyber
                      ? "radial-gradient(circle, #1c2740, #0a1120)"
                      : "#f3e8c9",
                    borderColor: isCyber
                      ? "rgba(251,191,36,0.5)"
                      : "rgba(180,130,40,0.5)",
                    boxShadow: isCyber
                      ? "inset 0 0 8px rgba(251,191,36,0.35)"
                      : "inset 0 0 4px rgba(0,0,0,0.15)",
                  };
                  content = (
                    <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 drop-shadow" />
                  );
                } else if (r === 7 && c === 0)
                  content = (
                    <ArrowRight
                      className="w-3 h-3"
                      style={{ color: LUDO_COLOR_THEMES.red.neonBorder }}
                    />
                  );
                else if (r === 0 && c === 7)
                  content = (
                    <ArrowDown
                      className="w-3 h-3"
                      style={{ color: LUDO_COLOR_THEMES.green.neonBorder }}
                    />
                  );
                else if (r === 7 && c === 14)
                  content = (
                    <ArrowLeft
                      className="w-3 h-3"
                      style={{ color: LUDO_COLOR_THEMES.yellow.neonBorder }}
                    />
                  );
                else if (r === 14 && c === 7)
                  content = (
                    <ArrowUp
                      className="w-3 h-3"
                      style={{ color: LUDO_COLOR_THEMES.blue.neonBorder }}
                    />
                  );
              }

              return (
                <div
                  key={cellKey}
                  style={{ gridRow: r + 1, gridColumn: c + 1, ...cellStyle }}
                  className="w-full h-full flex items-center justify-center border rounded-[3px] relative"
                >
                  {content}
                </div>
              );
            }),
          )}

          {/* 4. BASE NEST SOCKETS (Rendered strictly inside grid cells: r+1, c+1) */}
          {(["red", "green", "yellow", "blue"] as LudoColor[]).map((color) => {
            const colTheme = LUDO_COLOR_THEMES[color];
            if (!isActive(color)) return null;
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
                    borderColor: isCyber
                      ? `${colTheme.neonColor}90`
                      : "#FFFFFF90",
                    backgroundColor: isCyber ? "#090D18" : "#1E293B",
                    boxShadow: isCyber
                      ? `0 0 10px ${colTheme.neonColor}50`
                      : "none",
                  }}
                >
                  {/* Inner Concentric Target Ring */}
                  <div
                    className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full border flex items-center justify-center"
                    style={{
                      borderColor: isCyber
                        ? `${colTheme.neonColor}70`
                        : "#FFFFFF50",
                    }}
                  >
                    <div
                      className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                      style={{
                        backgroundColor: isCyber
                          ? colTheme.neonColor
                          : "#FFFFFF",
                      }}
                    />
                  </div>
                </div>
              </div>
            ));
          })}

          {/* 5. 2x2 IN-BASE TERMINALS (Strict 2x2 Grid Area: Zero Overlap with Nest Sockets) */}
          {(["red", "green", "yellow", "blue"] as LudoColor[]).map((color) => {
            const colTheme = LUDO_COLOR_THEMES[color];
            const player = players.find((p) => p.color === color);
            if (!player || player.type === "none") return null;
            const isTurn = currentTurnColor === color;
            const spanConfig = BASE_TERMINAL_SPANS[color];
            const canRollNow = isTurn && turnState === "waiting_roll";
            const isRollingNow = isTurn && turnState === "rolling";

            return (
              <div
                key={`base_terminal_${color}`}
                style={{ gridRow: spanConfig.row, gridColumn: spanConfig.col }}
                className="w-full h-full z-20 flex items-center justify-center p-0.5 select-none"
              >
                {isTurn ? (
                  <motion.div
                    className="w-full h-full rounded-xl border-2 p-1 flex items-center justify-center relative shadow-2xl"
                    style={{
                      background: isCyber
                        ? `radial-gradient(circle at 50% 40%, ${colTheme.neonColor}22, #05070ef2 70%)`
                        : `radial-gradient(circle at 50% 40%, #ffffff, ${colTheme.classicColor}22 75%)`,
                      borderColor: colTheme.neonBorder,
                    }}
                    animate={{
                      boxShadow: isCyber
                        ? [
                            `0 0 12px ${colTheme.neonColor}55`,
                            `0 0 26px ${colTheme.neonColor}aa`,
                            `0 0 12px ${colTheme.neonColor}55`,
                          ]
                        : [
                            `0 0 0px ${colTheme.classicColor}00`,
                            `0 0 14px ${colTheme.classicColor}66`,
                            `0 0 0px ${colTheme.classicColor}00`,
                          ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <BaseTerminalDice
                      color={color}
                      colTheme={colTheme}
                      isCyber={isCyber}
                      canRoll={canRollNow}
                      isRolling={isRollingNow}
                      diceValue={diceValue}
                      hint={canRollNow ? "Roll the dice" : "Waiting"}
                      onRoll={handleYardDiceClick}
                    />

                    <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 pointer-events-none">
                      <span
                        className="text-[6.5px] sm:text-[7.5px] font-orbitron font-extrabold px-1 py-0.2 rounded border shadow whitespace-nowrap uppercase tracking-wider"
                        style={{
                          backgroundColor: isCyber
                            ? colTheme.neonDarkBg
                            : "#0F172A",
                          borderColor: colTheme.neonBorder,
                          color: isCyber ? colTheme.neonColor : "#F8FAFC",
                        }}
                      >
                        {isRollingNow
                          ? "ROLLING"
                          : canRollNow
                            ? "ROLL"
                            : selectableTokenIds.length > 0
                              ? "PICK"
                              : "NEXT"}
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  <div
                    className="w-full h-full rounded-xl bg-slate-950/85 border border-slate-800 p-1 flex flex-col items-center justify-center pointer-events-none transition-all"
                    style={{
                      borderColor: isCyber
                        ? `${colTheme.neonBorder}50`
                        : "#334155",
                    }}
                  >
                    <span
                      className="text-[9px] sm:text-[11px] font-orbitron font-black tracking-widest uppercase"
                      style={{
                        color: isCyber ? colTheme.neonColor : "#F8FAFC",
                        textShadow: isCyber
                          ? `0 0 10px ${colTheme.neonColor}`
                          : "none",
                      }}
                    >
                      {color.toUpperCase()}
                    </span>

                    {player && (
                      <div className="flex items-center gap-0.5 mt-0.5 text-[7px] sm:text-[8px] text-slate-400 font-mono">
                        {player.type === "ai" ? (
                          <Bot className="w-2 h-2 text-slate-400" />
                        ) : (
                          <User className="w-2 h-2 text-slate-400" />
                        )}
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
              const isSelectable =
                isTurn && selectableTokenIds.includes(item.token.id);

              const stackKey = `${item.coords.r.toFixed(1)}_${item.coords.c.toFixed(1)}`;
              const stack = tokenStacks.get(stackKey) || [item];
              const stackIndex = stack.findIndex(
                (s) =>
                  s.token.color === item.token.color &&
                  s.token.id === item.token.id,
              );

              const angle = (stackIndex / stack.length) * 2 * Math.PI;
              const offsetRadius =
                stack.length > 1 && !item.token.isInYard ? 4 : 0;
              const offsetX = Math.cos(angle) * offsetRadius;
              const offsetY = Math.sin(angle) * offsetRadius;

              return (
                <motion.div
                  key={`${item.token.color}_${item.token.id}`}
                  initial={false}
                  animate={{
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    x: `calc(-50% + ${offsetX}px)`,
                    y: `calc(-50% + ${offsetY}px)`,
                    scale: isSelectable ? 1.15 : 1,
                    zIndex: isSelectable ? 40 : 25 + stackIndex,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 480,
                    damping: 32,
                    mass: 0.5,
                  }}
                  style={{ position: "absolute" }}
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
