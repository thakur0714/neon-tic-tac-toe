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
import { triggerHaptic, playDiceRollSound } from "../../../utils/audio";

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

// Which outer board corner each base panel touches, for the rounded "floating card" look
const BASE_CORNER_RADIUS: Record<LudoColor, string> = {
  red: "22% 6px 6px 6px",
  green: "6px 22% 6px 6px",
  blue: "6px 6px 6px 22%",
  yellow: "6px 6px 22% 6px",
};

// Royal Gold & Marble: deep faceted gemstone tones per color (dark + light variants)
const JEWEL_THEME: Record<LudoColor, { deep: string; mid: string; bright: string; name: string }> = {
  red: { deep: "#5c0a1c", mid: "#a3142f", bright: "#ff4d6d", name: "Ruby" },
  green: { deep: "#04452f", mid: "#0a7d54", bright: "#34e3a5", name: "Emerald" },
  blue: { deep: "#0b2c6b", mid: "#1554c2", bright: "#5aa8ff", name: "Sapphire" },
  yellow: { deep: "#6b4a06", mid: "#c98a12", bright: "#ffd85c", name: "Topaz" },
};

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

// Pre-computed lookup tables at module level (prevents re-allocation on each render)
const STATIC_TRACK_MAP = new Map<
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

  STATIC_TRACK_MAP.set(key, {
    trackIndex: idx,
    isSafe: SAFE_TRACK_INDICES.has(idx),
    isStart: startColor !== undefined,
    startColor,
  });
});

const STATIC_HOME_PATH_MAP = new Map<string, { color: LudoColor; stepIndex: number }>();
(["red", "green", "yellow", "blue"] as LudoColor[]).forEach((col) => {
  HOME_PATH_COORDINATES[col].forEach((coord, stepIdx) => {
    STATIC_HOME_PATH_MAP.set(`${coord.r}_${coord.c}`, { color: col, stepIndex: stepIdx });
  });
});

// Render authentic dice pips: Clean high-contrast dots on pure white acrylic
function renderWhiteDicePips(val: number, color: LudoColor) {
  const colTheme = LUDO_COLOR_THEMES[color];
  const pips = PIP_LAYOUT[Math.min(6, Math.max(1, val))] || PIP_LAYOUT[1];
  const isOne = val === 1;

  return (
    <div className="grid h-full w-full grid-cols-3 grid-rows-3 place-items-center p-[14%] select-none pointer-events-none">
      {Array.from({ length: 9 }).map((_, i) => {
        const hasPip = pips.includes(i);
        if (!hasPip) return <span key={i} className="w-full h-full" />;

        // Face 1 has the bold player color centerpiece; 2-6 have deep obsidian black/slate dots with subtle depth
        const dotColor = isOne ? colTheme.neonColor : "#0F172A";

        return (
          <span
            key={i}
            className="rounded-full transition-all duration-75"
            style={{
              width: "72%",
              height: "72%",
              backgroundColor: dotColor,
              boxShadow: isOne
                ? `0 0 6px ${colTheme.neonColor}aa, inset 0 1px 1px rgba(0,0,0,0.4)`
                : "inset 0 1px 2px rgba(0,0,0,0.7), 0 1px 1px rgba(255,255,255,0.7)",
            }}
          />
        );
      })}
    </div>
  );
}

// 3D WHITE DICE component used inside the active player's home base terminal
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
  canRoll,
  isRolling,
  diceValue,
  hint,
  onRoll,
}) => {
  // Never default to 6! Keep track of the last genuine roll face
  const [lastFace, setLastFace] = useState<number>(diceValue && diceValue >= 1 && diceValue <= 6 ? diceValue : 1);
  const [justLanded, setJustLanded] = useState(false);
  // Extra whole turns piled onto the base spin so every roll keeps tumbling forward, never snapping backward
  const spinTurnsRef = React.useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (diceValue && diceValue >= 1 && diceValue <= 6) {
      setLastFace(diceValue);
    }
  }, [diceValue]);

  const wasRolling = React.useRef(false);
  useEffect(() => {
    if (isRolling && !wasRolling.current) {
      playDiceRollSound(true);
      // Randomize each roll's spin path so it never repeats the exact same 3D flip
      spinTurnsRef.current = {
        x: 720 + Math.floor(Math.random() * 3) * 360,
        y: 1080 + Math.floor(Math.random() * 3) * 360,
      };
    }
    if (wasRolling.current && !isRolling) {
      setJustLanded(true);
      const t = setTimeout(() => setJustLanded(false), 260);
      wasRolling.current = isRolling;
      return () => clearTimeout(t);
    }
    wasRolling.current = isRolling;
  }, [isRolling]);

  const dieFace = diceValue ?? lastFace ?? 1;

  // Standard die-face show rotations (opposite faces sum to 7), landing exactly on the true value
  const FACE_SHOW_ROTATION: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: -90, y: 0 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: 90, y: 0 },
    6: { x: 180, y: 0 },
  };
  const showRot = FACE_SHOW_ROTATION[dieFace] ?? FACE_SHOW_ROTATION[1];
  const cubeTransform = isRolling
    ? `rotateX(${spinTurnsRef.current.x}deg) rotateY(${spinTurnsRef.current.y}deg)`
    : `rotateX(${showRot.x}deg) rotateY(${showRot.y}deg)`;

  // Face layout: front=1, bottom=2, left=3, right=4, top=5, back=6
  const FACE_DEFS: Array<{ value: number; transform: string }> = [
    { value: 1, transform: "translateZ(var(--dice-half))" },
    { value: 2, transform: "rotateX(90deg) translateZ(var(--dice-half))" },
    { value: 3, transform: "rotateY(-90deg) translateZ(var(--dice-half))" },
    { value: 4, transform: "rotateY(90deg) translateZ(var(--dice-half))" },
    { value: 5, transform: "rotateX(-90deg) translateZ(var(--dice-half))" },
    { value: 6, transform: "rotateY(180deg) translateZ(var(--dice-half))" },
  ];

  return (
    <div className="flex h-full w-full items-center justify-center p-0.5 select-none">
      <motion.button
        type="button"
        whileHover={canRoll && !isRolling ? { scale: 1.08 } : undefined}
        whileTap={canRoll && !isRolling ? { scale: 0.92 } : undefined}
        onClick={canRoll && !isRolling ? onRoll : undefined}
        disabled={!canRoll || isRolling}
        aria-label={hint}
        className={`relative flex items-center justify-center ${canRoll && !isRolling ? "cursor-pointer" : "cursor-default"}`}
        style={{
          width: "86%",
          height: "86%",
          maxWidth: 52,
          maxHeight: 52,
          aspectRatio: "1 / 1",
          perspective: 220,
          ["--dice-size" as string]: "clamp(30px, 8.6vw, 52px)",
          ["--dice-half" as string]: "calc(clamp(30px, 8.6vw, 52px) / 2)",
        }}
      >
        {/* Pulsing beacon ring when it's your turn to roll (pure CSS: immune to re-render restarts) */}
        {canRoll && !isRolling && (
          <span
            className="ludo-beacon-pulse pointer-events-none absolute -inset-1.5 rounded-2xl"
            style={{ backgroundColor: colTheme.neonColor }}
          />
        )}

        {/* TRUE 3D SIX-FACED DICE CUBE */}
        <div
          className="relative"
          style={{
            width: "var(--dice-size)",
            height: "var(--dice-size)",
            transformStyle: "preserve-3d",
            transform: cubeTransform,
            transition: isRolling
              ? "transform 0.62s cubic-bezier(0.32, 0.1, 0.4, 1)"
              : "transform 0.55s cubic-bezier(0.22, 1.6, 0.4, 1)",
          }}
        >
          {FACE_DEFS.map((face) => (
            <div
              key={face.value}
              className="absolute inset-0 rounded-lg sm:rounded-xl"
              style={{
                transform: face.transform,
                transformStyle: "preserve-3d",
                background: "linear-gradient(145deg, #FFFFFF 0%, #F8FAFC 55%, #E2E8F0 100%)",
                border: "1.5px solid #CBD5E1",
                boxShadow:
                  justLanded && !isRolling
                    ? `inset 0 2px 4px #FFFFFF, inset 0 -3px 5px rgba(0,0,0,0.12), 0 0 16px ${colTheme.neonColor}aa`
                    : "inset 0 2px 4px #FFFFFF, inset 0 -3px 5px rgba(0,0,0,0.12)",
                backfaceVisibility: "hidden",
              }}
            >
              {renderWhiteDicePips(face.value, color)}
              <div className="absolute inset-x-1 top-0.5 h-1/3 rounded-t-lg bg-gradient-to-b from-white/90 to-transparent pointer-events-none opacity-80" />
            </div>
          ))}
        </div>

        {/* Contact shadow that breathes with the tumble for a grounded 3D feel */}
        <div
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 rounded-full pointer-events-none ${isRolling ? "ludo-dice-shadow-pulse" : ""}`}
          style={{
            width: "70%",
            background: "radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 75%)",
          }}
        />
      </motion.button>
    </div>
  );
};

// Memoized Static Board Track Cells Component (225 cells)
// This prevents 225 DOM elements from re-rendering and allocating memory on every single token step!
const StaticBoardTrackCells = React.memo<{
  isCyber: boolean;
  activeColors: Set<LudoColor>;
}>(({ isCyber, activeColors }) => {
  const isActive = (c: LudoColor) => activeColors.has(c);

  return (
    <>
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
          const trackInfo = STATIC_TRACK_MAP.get(cellKey);
          const homePathInfo = STATIC_HOME_PATH_MAP.get(cellKey);

          let cellStyle: React.CSSProperties = {
            background: isCyber
              ? "linear-gradient(160deg, #16141d 0%, #0c0b11 100%)"
              : "linear-gradient(160deg, #fffaf0 0%, #f0e8d6 100%)",
            borderColor: isCyber
              ? "rgba(212,175,55,0.16)"
              : "rgba(180,140,50,0.25)",
            boxShadow: isCyber
              ? "inset 0 0 5px rgba(0,0,0,0.6)"
              : "inset 0 0 3px rgba(120,90,40,0.15)",
          };
          let content: React.ReactNode = null;

          if (homePathInfo) {
            const jewel = JEWEL_THEME[homePathInfo.color];
            cellStyle = {
              background: `linear-gradient(180deg, ${jewel.mid} 0%, ${jewel.deep} 100%)`,
              borderColor: "rgba(212,175,55,0.55)",
              boxShadow: `inset 0 0 8px ${jewel.deep}aa, inset 0 1px 1px rgba(255,255,255,0.25)`,
              opacity: isActive(homePathInfo.color) ? 1 : 0.22,
            };
          } else if (trackInfo) {
            if (trackInfo.isStart && trackInfo.startColor) {
              const jewel = JEWEL_THEME[trackInfo.startColor];
              cellStyle = {
                background: `radial-gradient(circle, ${jewel.bright} 0%, ${jewel.mid} 55%, ${jewel.deep} 100%)`,
                borderColor: "#d4af37",
                boxShadow: `inset 0 0 10px ${jewel.deep}, 0 0 6px ${jewel.bright}66`,
                opacity: isActive(trackInfo.startColor) ? 1 : 0.3,
              };
              content = (
                <Star
                  className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 drop-shadow"
                  style={{ color: "#fff8e0", fill: "#fff8e0" }}
                />
              );
            } else if (trackInfo.isSafe) {
              cellStyle = {
                background: isCyber
                  ? "radial-gradient(circle, #2a2410, #17140a)"
                  : "#f6e8bf",
                borderColor: "#d4af37",
                boxShadow: isCyber
                  ? "inset 0 0 8px rgba(212,175,55,0.4)"
                  : "inset 0 0 4px rgba(120,90,20,0.25)",
              };
              content = (
                <Star className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 drop-shadow" />
              );
            } else if (r === 7 && c === 0)
              content = (
                <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "#d4af37" }} />
              );
            else if (r === 0 && c === 7)
              content = (
                <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "#d4af37" }} />
              );
            else if (r === 7 && c === 14)
              content = (
                <ArrowLeft className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "#d4af37" }} />
              );
            else if (r === 14 && c === 7)
              content = (
                <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "#d4af37" }} />
              );
          }

          return (
            <div
              key={cellKey}
              style={{ gridRow: r + 1, gridColumn: c + 1, ...cellStyle }}
              className="w-full h-full flex items-center justify-center border rounded-[2px] sm:rounded-[3px] relative"
            >
              {content}
            </div>
          );
        })
      )}
    </>
  );
});
StaticBoardTrackCells.displayName = "StaticBoardTrackCells";

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
    const list: Array<{ token: LudoToken; coords: { r: number; c: number } }> = [];
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

  const handleYardDiceClick = () => {
    if (turnState === "waiting_roll" && onRollDice) {
      triggerHaptic("medium");
      onRollDice();
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-0.5 sm:p-2 select-none">
      {/* Master Board Container - Maximized for Mobile Screen Real Estate */}
      <div
        className={`w-full max-w-[min(98vw,calc(100dvh-175px))] sm:max-w-[min(92vw,68vh)] aspect-square rounded-2xl sm:rounded-3xl p-1.5 sm:p-2.5 relative shadow-2xl transition-all duration-300 overflow-hidden border-[3px] sm:border-[4px] ${isCyber ? "ludo-marble-dark border-amber-400/80" : "ludo-marble-light border-amber-600/70"}`}
        style={{
          boxShadow:
            "0 0 0 1px rgba(212,175,55,0.9), 0 0 0 5px rgba(0,0,0,0.35), 0 0 0 6px rgba(212,175,55,0.5), 0 20px 44px rgba(0,0,0,0.55), inset 0 0 30px rgba(0,0,0,0.45)",
        }}
      >
        {/* Ornate gold corner medallions */}
        <div className="ludo-gold-corner absolute top-2 left-2 z-40" />
        <div className="ludo-gold-corner absolute top-2 right-2 z-40" />
        <div className="ludo-gold-corner absolute bottom-2 left-2 z-40" />
        <div className="ludo-gold-corner absolute bottom-2 right-2 z-40" />

        {/* Glossy full-board sheen for a polished lacquer finish */}
        <div className="absolute inset-0 pointer-events-none z-30 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-white/10 via-transparent to-black/15" />
        {/* Strict 15x15 CSS Grid System (Zero Gap to Guarantee Exact Mathematical Percentage Alignment) */}
        <div
          className={`w-full h-full relative rounded-xl sm:rounded-2xl overflow-hidden border-2 ${isCyber ? "ludo-marble-dark border-amber-500/40" : "ludo-marble-light border-amber-600/40"}`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(15, minmax(0, 1fr))",
            gridTemplateRows: "repeat(15, minmax(0, 1fr))",
          }}
        >
          {/* 1. 6x6 BASE BACKGROUND PANELS — faceted jewel plates in a gold bezel */}
          {(["red", "green", "blue", "yellow"] as LudoColor[]).map((color) => {
            const jewel = JEWEL_THEME[color];
            const seatActive = isActive(color);
            const active = seatActive && currentTurnColor === color;
            return (
              <div
                key={`base_bg_${color}`}
                style={{
                  gridRow: BASE_BACKGROUND_SPANS[color].row,
                  gridColumn: BASE_BACKGROUND_SPANS[color].col,
                  opacity: seatActive ? 1 : 0.2,
                  borderRadius: BASE_CORNER_RADIUS[color],
                  background: !seatActive
                    ? isCyber
                      ? "#141119"
                      : "#e8ddc4"
                    : `radial-gradient(circle at 50% 28%, ${jewel.bright}30 0%, transparent 55%), linear-gradient(160deg, ${jewel.mid} 0%, ${jewel.deep} 100%)`,
                  borderColor: !seatActive ? "rgba(212,175,55,0.25)" : active ? "#ffd85c" : "rgba(212,175,55,0.65)",
                  boxShadow: !seatActive
                    ? "none"
                    : active
                      ? `0 0 24px ${jewel.bright}55, inset 0 0 22px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.3)`
                      : `inset 0 0 22px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2), 0 4px 12px rgba(0,0,0,0.35)`,
                  ["--glow-color" as string]: `${jewel.bright}99`,
                }}
                className={`relative overflow-hidden border-2 sm:border-[3px] transition-colors duration-300 ${
                  active ? "ludo-glow-pulse" : ""
                }`}
              >
                {/* Faceted gem highlight — diagonal sheen like light hitting a cut stone */}
                {seatActive && (
                  <div
                    className="absolute inset-x-2 top-1 h-2/5 pointer-events-none opacity-35"
                    style={{
                      borderRadius: "inherit",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.9) 0%, transparent 100%)",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* 2. CENTER 3x3 VICTORY EMBLEM (Rows 7..9, Cols 7..9) */}
          <div
            style={{ gridRow: "7 / span 3", gridColumn: "7 / span 3" }}
            className={`relative overflow-hidden border-2 border-amber-400/70 flex items-center justify-center z-10 ${isCyber ? "bg-slate-950" : "bg-[#f7edd8]"}`}
          >
            <svg
              className="w-full h-full absolute inset-0"
              viewBox="0 0 100 100"
            >
              <polygon points="0,0 50,50 0,100" fill={JEWEL_THEME.red.mid} fillOpacity={0.85} stroke={JEWEL_THEME.red.bright} strokeWidth="1.5" />
              <polygon points="0,0 50,50 100,0" fill={JEWEL_THEME.green.mid} fillOpacity={0.85} stroke={JEWEL_THEME.green.bright} strokeWidth="1.5" />
              <polygon points="100,0 50,50 100,100" fill={JEWEL_THEME.yellow.mid} fillOpacity={0.85} stroke={JEWEL_THEME.yellow.bright} strokeWidth="1.5" />
              <polygon points="0,100 50,50 100,100" fill={JEWEL_THEME.blue.mid} fillOpacity={0.85} stroke={JEWEL_THEME.blue.bright} strokeWidth="1.5" />
              <line x1="0" y1="0" x2="100" y2="100" stroke="#d4af37" strokeWidth="0.8" strokeOpacity="0.6" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#d4af37" strokeWidth="0.8" strokeOpacity="0.6" />
            </svg>
            <div className="ludo-hub-pulse relative z-10 w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-slate-950/95 border-2 border-amber-400 flex items-center justify-center">
              <Trophy className="w-3 h-3 sm:w-4.5 sm:h-4.5 text-amber-400" />
            </div>
          </div>

          {/* 3. STATIC TRACK & HOME CELLS (Memoized: Zero Re-renders during token hops!) */}
          <StaticBoardTrackCells isCyber={isCyber} activeColors={activeColors} />

          {/* 4. BASE NEST SOCKETS (Rendered strictly inside grid cells: r+1, c+1) */}
          {(["red", "green", "yellow", "blue"] as LudoColor[]).map((color) => {
            const colTheme = LUDO_COLOR_THEMES[color];
            if (!isActive(color)) return null;
            return YARD_SPAWN_COORDINATES[color].map((coord, idx) => (
              <div
                key={`nest_${color}_${idx}`}
                style={{ gridRow: coord.r + 1, gridColumn: coord.c + 1 }}
                className="relative w-full h-full flex items-center justify-center pointer-events-none z-15 p-0.5"
              >
                {/* Rotating gold dashed pedestal ring — ornate jewel-socket accent */}
                <div
                  className="ludo-pedestal-spin absolute w-full h-full max-w-[30px] max-h-[30px] sm:max-w-[38px] sm:max-h-[38px] rounded-full pointer-events-none"
                  style={{ border: "1.5px dashed rgba(212,175,55,0.65)" }}
                />
                {/* Outer Gold Socket Rim */}
                <div
                  className="w-full h-full max-w-[26px] max-h-[26px] sm:max-w-[34px] sm:max-h-[34px] rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: "rgba(212,175,55,0.75)",
                    backgroundColor: isCyber ? "#100d16" : "#efe6cf",
                    boxShadow: `0 0 8px rgba(212,175,55,0.4), inset 0 0 8px ${JEWEL_THEME[color].deep}88`,
                  }}
                >
                  {/* Inner Jewel Setting */}
                  <div
                    className="w-3 h-3 sm:w-4.5 sm:h-4.5 rounded-full border flex items-center justify-center"
                    style={{ borderColor: "rgba(212,175,55,0.55)" }}
                  >
                    <div
                      className="ludo-gem-shimmer w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full"
                      style={{
                        backgroundColor: JEWEL_THEME[color].bright,
                        boxShadow: `0 0 4px ${JEWEL_THEME[color].bright}`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ));
          })}

          {/* 5. 2x2 IN-BASE TERMINALS WITH PROMINENT 3D WHITE DICE */}
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
                  <div
                    className="ludo-glow-pulse w-full h-full rounded-xl border-2 p-0.5 sm:p-1 flex items-center justify-center relative shadow-2xl"
                    style={{
                      background: isCyber
                        ? `radial-gradient(circle at 50% 40%, ${colTheme.neonColor}22, #05070ef2 70%)`
                        : `radial-gradient(circle at 50% 40%, #ffffff, ${colTheme.classicColor}22 75%)`,
                      borderColor: isCyber ? "rgba(251,191,36,0.7)" : colTheme.neonBorder,
                      ["--glow-color" as string]: isCyber ? `${colTheme.neonColor}aa` : `${colTheme.classicColor}66`,
                    }}
                  >
                    <BaseTerminalDice
                      color={color}
                      colTheme={colTheme}
                      isCyber={isCyber}
                      canRoll={canRollNow}
                      isRolling={isRollingNow}
                      diceValue={diceValue}
                      hint={canRollNow ? "Tap to Roll Dice" : "Dice"}
                      onRoll={handleYardDiceClick}
                    />

                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 pointer-events-none">
                      <span
                        className="text-[6.5px] sm:text-[8px] font-orbitron font-black px-1.5 py-0.2 rounded border shadow whitespace-nowrap uppercase tracking-wider"
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
                  </div>
                ) : (
                  <div
                    className="w-full h-full rounded-xl bg-slate-950/85 border border-slate-800 p-0.5 sm:p-1 flex flex-col items-center justify-center pointer-events-none transition-all"
                    style={{
                      borderColor: isCyber
                        ? `${colTheme.neonBorder}50`
                        : "#334155",
                    }}
                  >
                    <span
                      className="text-[8px] sm:text-[11px] font-orbitron font-black tracking-widest uppercase"
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
                      <div className="flex items-center gap-0.5 mt-0.5 text-[6.5px] sm:text-[8px] text-slate-400 font-mono">
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
                    scale: isSelectable ? 1.18 : 1,
                    zIndex: isSelectable ? 40 : 25 + stackIndex,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 480,
                    damping: 32,
                    mass: 0.5,
                  }}
                  style={{ position: "absolute" }}
                  className="pointer-events-auto flex items-center justify-center transform-gpu"
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
