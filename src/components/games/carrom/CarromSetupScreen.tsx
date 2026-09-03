import React, { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Users,
  Radio,
  Crown,
  Play,
  Volume2,
  VolumeX,
  HelpCircle,
  Sparkles,
  Shield,
  Zap,
} from 'lucide-react';
import {
  CarromAIDifficulty,
  CarromGameMode,
  CarromPlayType,
} from '../../../types/carrom';

export interface CarromSetupConfig {
  playType: CarromPlayType;
  gameMode: CarromGameMode;
  aiDifficulty: CarromAIDifficulty;
  userPuck: 'white' | 'black';
}

interface CarromSetupScreenProps {
  onStart: (config: CarromSetupConfig) => void;
  onBack: () => void;
  onOpenRules: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSound?: () => void;
}

const MODES: Array<{
  id: CarromPlayType;
  label: string;
  icon: React.ReactNode;
  tag: string;
  blurb: string;
  theme: string;
}> = [
  {
    id: 'vs-ai',
    label: 'vs Computer',
    icon: <Bot className="w-4 h-4" />,
    tag: 'SOLO BOT',
    blurb: 'Challenge the smart geometric AI with realistic banking & cut angles',
    theme: 'border-cyan-500/50 text-cyan-400',
  },
  {
    id: 'pass-and-play',
    label: 'Pass & Play',
    icon: <Users className="w-4 h-4" />,
    tag: 'LOCAL 2P',
    blurb: 'Turn-based duel on this device — P1 White vs P2 Black',
    theme: 'border-emerald-500/50 text-emerald-400',
  },
  {
    id: 'online',
    label: 'Online Room',
    icon: <Radio className="w-4 h-4" />,
    tag: 'PEER 1v1',
    blurb: 'Create or join a private 6-digit room code with a friend',
    theme: 'border-amber-500/50 text-amber-400',
  },
];

const GAME_MODES: Array<{
  id: CarromGameMode;
  label: string;
  blurb: string;
  badge: string;
}> = [
  {
    id: 'disc-pool',
    label: 'Disc Pool',
    blurb: 'Race to pocket all 9 of your assigned coins (White vs Black).',
    badge: 'FAST PACED',
  },
  {
    id: 'classic',
    label: 'Classic Points',
    blurb: 'White = 10 pts, Black = 5 pts, Red Queen = 25 pts with cover.',
    badge: 'TRADITIONAL',
  },
];

const DIFFICULTIES: Array<{ id: CarromAIDifficulty; label: string; desc: string }> = [
  { id: 'easy', label: 'EASY', desc: 'Relaxed shots' },
  { id: 'medium', label: 'MEDIUM', desc: 'Calculated banks' },
  { id: 'hard', label: 'MASTER', desc: 'High accuracy cuts' },
];

export const CarromSetupScreen: React.FC<CarromSetupScreenProps> = ({
  onStart,
  onBack,
  onOpenRules,
  soundEnabled,
  onToggleSound,
  onSound,
}) => {
  const [playType, setPlayType] = useState<CarromPlayType>('vs-ai');
  const [gameMode, setGameMode] = useState<CarromGameMode>('disc-pool');
  const [aiDifficulty, setAiDifficulty] = useState<CarromAIDifficulty>('medium');
  const [userPuck, setUserPuck] = useState<'white' | 'black'>('white');

  const tap = () => onSound?.();

  const handleStart = () => {
    tap();
    onStart({
      playType,
      gameMode,
      aiDifficulty,
      userPuck,
    });
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white select-none overflow-y-auto">
      {/* 1. Header Bar */}
      <div className="w-full h-11 px-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-sm shrink-0">
        <button
          type="button"
          onClick={() => {
            tap();
            onBack();
          }}
          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-cyan-400 text-[11px] font-orbitron font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>HUB</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-amber-500/40 text-[11px] font-orbitron text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.2)]">
          <Crown className="w-3.5 h-3.5 text-amber-400" />
          <span>NEON CARROM POOL</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              tap();
              onOpenRules();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors"
            title="Carrom Rules"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              tap();
              onToggleSound();
            }}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* 2. Mode & Setup Body */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-5 max-w-md mx-auto w-full">
        {/* Play Type Selection */}
        <section className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-[11px] font-orbitron font-bold tracking-widest text-slate-400 uppercase">
              Select Game Mode
            </h3>
            <span className="text-[10px] text-cyan-400 font-orbitron">2D Physics</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {MODES.map((m) => {
              const selected = playType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    tap();
                    setPlayType(m.id);
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                    selected
                      ? 'bg-cyan-500/15 border-cyan-400 text-white shadow-[0_0_16px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      selected ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {m.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold font-orbitron text-white">{m.label}</span>
                      <span
                        className={`text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded ${
                          selected ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{m.blurb}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Rule Type Selection (Disc Pool vs Classic) */}
        <section className="w-full">
          <h3 className="text-[11px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-1.5">
            Board Rules
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {GAME_MODES.map((gm) => {
              const selected = gameMode === gm.id;
              return (
                <button
                  key={gm.id}
                  type="button"
                  onClick={() => {
                    tap();
                    setGameMode(gm.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_14px_rgba(245,158,11,0.2)]'
                      : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold font-orbitron text-slate-200">{gm.label}</span>
                    <span className="text-[8px] font-orbitron px-1 rounded bg-slate-800 text-amber-300">
                      {gm.badge}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 leading-tight">{gm.blurb}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Mode-Specific Settings */}
        {playType === 'vs-ai' && (
          <div className="w-full space-y-3 bg-slate-900/40 p-3 rounded-2xl border border-slate-800">
            {/* AI Difficulty */}
            <div>
              <h3 className="text-[10px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-1.5">
                Bot Difficulty
              </h3>
              <div className="grid grid-cols-3 gap-1.5">
                {DIFFICULTIES.map((d) => {
                  const selected = aiDifficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        tap();
                        setAiDifficulty(d.id);
                      }}
                      className={`py-1.5 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                        selected
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[10.5px] font-orbitron font-bold block">{d.label}</span>
                      <span className="text-[8.5px] text-slate-400 block truncate">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Play As Puck Color */}
            <div>
              <h3 className="text-[10px] font-orbitron font-bold tracking-widest text-slate-400 uppercase mb-1.5">
                Your Coins & Striker Side
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    tap();
                    setUserPuck('white');
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    userPuck === 'white'
                      ? 'bg-slate-800/90 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-100 to-amber-300 border border-amber-100 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(254,243,199,0.5)]">
                    <span className="w-2 h-2 rounded-full border border-amber-600" />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[11px] font-orbitron font-bold block">White Pucks</span>
                    <span className="text-[9px] text-cyan-400 block">Strikes 1st</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    tap();
                    setUserPuck('black');
                  }}
                  className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                    userPuck === 'black'
                      ? 'bg-slate-800/90 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                      : 'bg-slate-900/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(15,23,42,0.5)]">
                    <span className="w-2 h-2 rounded-full border border-slate-400" />
                  </div>
                  <div className="text-left leading-tight">
                    <span className="text-[11px] font-orbitron font-bold block">Black Pucks</span>
                    <span className="text-[9px] text-slate-400 block">AI Strikes 1st</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {playType === 'pass-and-play' && (
          <div className="w-full p-3 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-200 border border-amber-400" />
              <div>
                <span className="font-orbitron font-bold text-slate-200 block text-[11px]">Player 1</span>
                <span className="text-[9px] text-cyan-400 block">White · Strikes First</span>
              </div>
            </div>
            <span className="text-slate-500 font-orbitron font-bold text-[10px]">VS</span>
            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="font-orbitron font-bold text-slate-200 block text-[11px]">Player 2</span>
                <span className="text-[9px] text-slate-400 block">Black · Strikes Second</span>
              </div>
              <div className="w-4 h-4 rounded-full bg-slate-800 border border-slate-600" />
            </div>
          </div>
        )}

        {playType === 'online' && (
          <div className="w-full p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="font-orbitron font-bold text-amber-300 block text-[11px]">
                WebRTC Peer-to-Peer Duel
              </span>
              <p className="text-[9.5px] text-slate-300 mt-0.5">
                Host will generate an instant 6-digit room code. Opponent joins directly from browser.
              </p>
            </div>
          </div>
        )}

        {/* Start Button */}
        <button
          type="button"
          onClick={handleStart}
          className={`w-full py-3 rounded-xl font-orbitron font-black tracking-widest text-xs flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition-all shadow-lg ${
            playType === 'online'
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
              : 'bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{playType === 'online' ? 'OPEN ONLINE LOBBY' : 'START CARROM MATCH'}</span>
        </button>
      </div>
    </div>
  );
};
