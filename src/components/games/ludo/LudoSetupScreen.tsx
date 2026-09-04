import React, { useMemo, useState } from 'react';
import { ArrowLeft, Bot, Users, Radio, Crown, Play } from 'lucide-react';
import {
  LudoGameMode,
  LudoDifficulty,
  LudoSetupConfig,
  createSetupConfig,
  SEATS_FOR_COUNT,
} from '../../../utils/ludoSetup';
import { LUDO_COLOR_THEMES } from '../../../utils/ludoConstants';
import { LudoColor } from '../../../types/ludo';

interface LudoSetupScreenProps {
  onStart: (config: LudoSetupConfig) => void;
  onBack: () => void;
  onSound?: () => void;
}

const MODES: Array<{ id: LudoGameMode; label: string; icon: React.ReactNode; blurb: string }> = [
  { id: 'vs-computer', label: 'vs Computer', icon: <Bot className="w-4 h-4" />, blurb: 'You + AI opponents' },
  { id: 'pass-and-play', label: 'Pass & Play', icon: <Users className="w-4 h-4" />, blurb: 'Local multiplayer, one device' },
  { id: 'online', label: 'Online Room', icon: <Radio className="w-4 h-4" />, blurb: '2–4 players · create or join a room' },
];

const DIFFICULTIES: LudoDifficulty[] = ['easy', 'medium', 'hard'];

export const LudoSetupScreen: React.FC<LudoSetupScreenProps> = ({ onStart, onBack, onSound }) => {
  const [mode, setMode] = useState<LudoGameMode>('vs-computer');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);
  const [difficulty, setDifficulty] = useState<LudoDifficulty>('medium');

  const config = useMemo(
    () => createSetupConfig(mode, playerCount, difficulty),
    [mode, playerCount, difficulty]
  );

  const activeColors = SEATS_FOR_COUNT[playerCount];
  const showDifficulty = mode !== 'pass-and-play';

  const tap = () => onSound?.();

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none overflow-y-auto">
      {/* Top bar */}
      <div className="w-full h-12 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/70 shrink-0">
        <button
          onClick={() => {
            tap();
            onBack();
          }}
          className="px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 text-[10px] font-orbitron font-bold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>HUB</span>
        </button>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950 border border-amber-500/40 text-[10px] font-orbitron text-amber-300 font-bold">
          <Crown className="w-3 h-3 text-amber-400" />
          <span>NEON LUDO KING</span>
        </div>
        <span className="w-[52px]" />
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 py-6 max-w-md mx-auto w-full">
        {/* Mode */}
        <section className="w-full">
          <h3 className="text-[11px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-2">Game Mode</h3>
          <div className="grid grid-cols-1 gap-2">
            {MODES.map((m) => {
              const selected = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    tap();
                    setMode(m.id);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_14px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className={selected ? 'text-cyan-300' : 'text-slate-400'}>{m.icon}</span>
                  <span className="flex flex-col">
                    <span className="text-[13px] font-bold font-orbitron">{m.label}</span>
                    <span className="text-[10px] text-slate-400">{m.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Player count */}
        <section className="w-full">
          <h3 className="text-[11px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-2">Players</h3>
          <div className="grid grid-cols-3 gap-2">
            {([2, 3, 4] as const).map((n) => {
              const disabled = false;
              const selected = playerCount === n;
              return (
                <button
                  key={n}
                  disabled={disabled}
                  onClick={() => {
                    tap();
                    setPlayerCount(n);
                  }}
                  className={`py-2 rounded-xl border text-[13px] font-orbitron font-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                    selected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-slate-900/70 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {n}P
                </button>
              );
            })}
          </div>
          {playerCount === 2 && (
            <p className="text-[10px] text-slate-500 mt-1.5">Opposite corners · Red vs Yellow</p>
          )}
        </section>

        {/* Seat preview */}
        <section className="w-full">
          <h3 className="text-[11px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-2">Seats</h3>
          <div className="flex gap-2">
            {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((color) => {
              const type = config.seats[color];
              const ct = LUDO_COLOR_THEMES[color];
              const inactive = type === 'none';
              return (
                <div
                  key={color}
                  className={`flex-1 rounded-lg border px-1.5 py-2 flex flex-col items-center gap-1 ${
                    inactive ? 'opacity-30 border-slate-800 bg-slate-900/40' : 'bg-slate-900/70'
                  }`}
                  style={{ borderColor: inactive ? undefined : ct.neonBorder }}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ct.neonColor, boxShadow: inactive ? 'none' : `0 0 8px ${ct.neonColor}` }}
                  />
                  <span className="text-[9px] font-orbitron font-bold uppercase text-slate-300">
                    {type === 'ai' ? 'CPU' : type === 'online' ? 'ONLINE' : type === 'human' ? 'YOU' : '—'}
                  </span>
                </div>
              );
            })}
          </div>
          {mode === 'pass-and-play' && activeColors.length > 1 && (
            <p className="text-[10px] text-slate-500 mt-1.5">All seats are local humans (P1–P{activeColors.length}).</p>
          )}
        </section>

        {/* Difficulty */}
        {showDifficulty && (
          <section className="w-full">
            <h3 className="text-[11px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-2">
              AI Difficulty
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => {
                const selected = difficulty === d;
                return (
                  <button
                    key={d}
                    onClick={() => {
                      tap();
                      setDifficulty(d);
                    }}
                    className={`py-1.5 rounded-xl border text-[11px] font-orbitron font-bold uppercase transition-all cursor-pointer ${
                      selected
                        ? 'bg-emerald-500/15 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900/70 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Start */}
        <button
          onClick={() => {
            tap();
            onStart(config);
          }}
          className="w-full mt-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-orbitron font-black tracking-widest text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 transition shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          START GAME
        </button>
      </div>
    </div>
  );
};
