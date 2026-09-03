import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Users,
  Play,
  HelpCircle,
  ArrowLeft,
  Zap,
  Shield,
  Sparkles,
  Cpu,
  Flame,
  Target,
  Bot,
  Wifi,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';
import { playClickSound } from '../../../utils/audio';
import { UnoDifficulty, UnoPlayType } from '../../../types/uno';

export interface UnoStartConfig {
  playType: UnoPlayType;
  playerCount: number;
  cardEightWild: boolean;
  difficulty: UnoDifficulty;
  playerNames: string[];
  privacyVeil: boolean;
}

interface UnoSetupScreenProps {
  onStartGame: (config: UnoStartConfig) => void;
  onOpenOnlineModal: () => void;
  onBackToHub: () => void;
  soundEnabled: boolean;
}

const MODES: Array<{
  id: UnoPlayType;
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
    blurb: 'Duel smart AI bots with tactical color & action card plays',
    theme: 'border-cyan-500/50 text-cyan-400',
  },
  {
    id: 'pass-and-play',
    label: 'Pass & Play',
    icon: <Users className="w-4 h-4" />,
    tag: 'LOCAL 2P-4P',
    blurb: 'Turn-based duel on this device with secret privacy hand veil',
    theme: 'border-emerald-500/50 text-emerald-400',
  },
  {
    id: 'online',
    label: 'Online Room',
    icon: <Wifi className="w-4 h-4" />,
    tag: 'PEER ROOM',
    blurb: 'Create or join a private room code to play with friends online',
    theme: 'border-purple-500/50 text-purple-400',
  },
];

const SEAT_COLORS = ['cyan', 'pink', 'amber', 'emerald'];

export const UnoSetupScreen: React.FC<UnoSetupScreenProps> = ({
  onStartGame,
  onOpenOnlineModal,
  onBackToHub,
  soundEnabled,
}) => {
  const [playType, setPlayType] = useState<UnoPlayType>('vs-ai');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [cardEightWild, setCardEightWild] = useState<boolean>(true);
  const [difficulty, setDifficulty] = useState<UnoDifficulty>('pro');
  const [showRules, setShowRules] = useState<boolean>(false);
  const [privacyVeil, setPrivacyVeil] = useState<boolean>(true);
  const [playerNames, setPlayerNames] = useState<string[]>([
    'Player 1',
    'Player 2',
    'Player 3',
    'Player 4',
  ]);

  const handlePlayerNameChange = (index: number, val: string) => {
    setPlayerNames((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleStart = () => {
    playClickSound(soundEnabled);
    if (playType === 'online') {
      onOpenOnlineModal();
      return;
    }
    onStartGame({
      playType,
      playerCount,
      cardEightWild,
      difficulty,
      playerNames: playerNames.slice(0, playerCount).map((n, i) => n.trim() || `Player ${i + 1}`),
      privacyVeil,
    });
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-3 sm:p-4 bg-slate-950 text-white select-none overflow-y-auto no-scrollbar">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onBackToHub();
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-white px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-orbitron font-semibold cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>HUB</span>
        </button>

        <div className="text-center">
          <h2 className="text-xs sm:text-sm font-black font-orbitron tracking-wider text-cyan-400">
            NEON UNO / CARD 8
          </h2>
          <p className="text-[10px] text-slate-400">Cyber Card Duel Arena</p>
        </div>

        <button
          onClick={() => {
            playClickSound(soundEnabled);
            setShowRules(true);
          }}
          className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 flex items-center justify-center cursor-pointer transition-colors"
          title="Game Rules"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Center Interactive Setup Panel */}
      <div className="my-auto py-2 space-y-3.5 max-w-sm mx-auto w-full">
        {/* Banner Card */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border border-purple-500/40 text-center relative overflow-hidden shadow-lg">
          <div className="flex justify-center gap-2 mb-1.5">
            <div className="w-7 h-10 rounded-md bg-red-500 border border-red-300 flex items-center justify-center font-orbitron font-black text-xs text-white -rotate-12 shadow-md">
              8
            </div>
            <div className="w-7 h-10 rounded-md bg-cyan-500 border border-cyan-300 flex items-center justify-center font-orbitron font-black text-xs text-slate-950 -rotate-3 shadow-md">
              ★
            </div>
            <div className="w-7 h-10 rounded-md bg-amber-400 border border-amber-200 flex items-center justify-center font-orbitron font-black text-xs text-slate-950 rotate-8 shadow-md">
              +2
            </div>
          </div>
          <h1 className="text-base sm:text-lg font-black font-orbitron text-white">
            NEON CYBER UNO
          </h1>
          <p className="text-xs text-purple-300 font-medium">
            Multiplayer Arena · Pass & Play · Online Room
          </p>
        </div>

        {/* 1. Play Mode Selector Tabs (vs AI, Pass & Play, Online Room) */}
        <div className="space-y-1.5">
          <label className="text-xs font-orbitron font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>GAME MODE</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {playType === 'vs-ai' ? '1v1 BOT' : playType === 'pass-and-play' ? 'LOCAL PASS' : 'ONLINE PEER'}
            </span>
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            {MODES.map((m) => {
              const active = playType === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setPlayType(m.id);
                  }}
                  className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    active
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={active ? 'text-cyan-400' : 'text-slate-500'}>
                      {m.icon}
                    </span>
                    <span
                      className={`text-[8px] font-mono font-bold px-1 rounded ${
                        active
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800/80 text-slate-400'
                      }`}
                    >
                      {m.tag}
                    </span>
                  </div>
                  <div
                    className={`text-[11px] sm:text-xs font-black font-orbitron leading-tight ${
                      active ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {m.label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Player Count Selection (for vs-ai and pass-and-play) */}
        {playType !== 'online' && (
          <div className="space-y-1.5">
            <label className="text-xs font-orbitron font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>NUMBER OF PLAYERS</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { count: 2, label: '2 PLAYERS', desc: playType === 'vs-ai' ? '1v1 vs Bot' : 'Head to Head' },
                { count: 3, label: '3 PLAYERS', desc: playType === 'vs-ai' ? '2 AI Bots' : '3 Friends' },
                { count: 4, label: '4 PLAYERS', desc: playType === 'vs-ai' ? '3 AI Bots' : 'Full Table' },
              ].map((item) => (
                <button
                  key={item.count}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setPlayerCount(item.count);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    playerCount === item.count
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-black font-orbitron">{item.label}</div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3A. Pass & Play Configuration: Player Names & Privacy Veil */}
        {playType === 'pass-and-play' && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <label className="text-xs font-orbitron font-bold text-emerald-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>PLAYER NAMES</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: playerCount }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[9px] font-orbitron font-bold text-slate-400 flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          idx === 0
                            ? 'bg-cyan-400'
                            : idx === 1
                            ? 'bg-pink-400'
                            : idx === 2
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      PLAYER {idx + 1}
                    </span>
                    <input
                      type="text"
                      maxLength={12}
                      value={playerNames[idx]}
                      onChange={(e) => handlePlayerNameChange(idx, e.target.value)}
                      placeholder={`Player ${idx + 1}`}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs font-orbitron focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Privacy Veil Toggle */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {privacyVeil ? (
                    <EyeOff className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xs font-orbitron font-bold text-white">
                    CARD PRIVACY VEIL
                  </span>
                  <span
                    className={`text-[8px] font-mono px-1 rounded ${
                      privacyVeil
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {privacyVeil ? 'RECOMMENDED' : 'OFF'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Hides cards between turns with "Tap to Reveal" so opponents can't peek!
                </p>
              </div>

              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  setPrivacyVeil(!privacyVeil);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                  privacyVeil ? 'bg-emerald-500' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    privacyVeil ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* 3B. vs AI Difficulty Selection */}
        {playType === 'vs-ai' && (
          <div className="space-y-1.5">
            <label className="text-xs font-orbitron font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>AI BOT DIFFICULTY</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'rookie' as UnoDifficulty,
                  label: 'ROOKIE',
                  desc: 'Relaxed & casual',
                  activeBg:
                    'bg-emerald-500/20 text-emerald-300 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
                  icon: <Target className="w-3 h-3 text-emerald-400 inline mb-0.5" />,
                },
                {
                  id: 'pro' as UnoDifficulty,
                  label: 'PRO',
                  desc: 'Smart & balanced',
                  activeBg:
                    'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]',
                  icon: <Zap className="w-3 h-3 text-cyan-400 inline mb-0.5" />,
                },
                {
                  id: 'master' as UnoDifficulty,
                  label: 'MASTER',
                  desc: 'Deadly +4 attacks',
                  activeBg:
                    'bg-pink-500/20 text-pink-300 border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.3)]',
                  icon: <Flame className="w-3 h-3 text-pink-400 inline mb-0.5" />,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    setDifficulty(item.id);
                  }}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    difficulty === item.id
                      ? item.activeBg
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {item.icon}
                    <span className="text-xs font-black font-orbitron">{item.label}</span>
                  </div>
                  <div className="text-[9px] opacity-80 mt-0.5">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3C. Online Mode Info Blurb */}
        {playType === 'online' && (
          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/40 space-y-2">
            <div className="flex items-center gap-2 text-purple-300 font-orbitron font-bold text-xs">
              <Wifi className="w-4 h-4 text-purple-400" />
              <span>PEER-TO-PEER MULTIPLAYER</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Create a custom room code or join a friend's room from any mobile or desktop browser. Supports 2 to 4 players with real-time card synchronization!
            </p>
          </div>
        )}

        {/* Card 8 Crazy Eights Wild Toggle */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-xs font-orbitron font-bold text-white">
                CARD 8 WILD RULE
              </span>
              <span className="text-[8px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ACTIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
              Playing card 8 allows changing color on any card like Crazy Eights.
            </p>
          </div>

          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setCardEightWild(!cardEightWild);
            }}
            className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
              cardEightWild ? 'bg-amber-500' : 'bg-slate-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                cardEightWild ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Start Button */}
      <div className="pt-2">
        <button
          onClick={handleStart}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 font-orbitron font-black text-sm tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.4)] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {playType === 'online' ? (
            <>
              <Wifi className="w-4 h-4" />
              <span>OPEN ONLINE LOBBY</span>
            </>
          ) : playType === 'pass-and-play' ? (
            <>
              <Users className="w-4 h-4 fill-current" />
              <span>START PASS & PLAY</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>START DUEL</span>
            </>
          )}
        </button>
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 text-cyan-400 font-orbitron font-bold text-sm">
                <Shield className="w-4 h-4" />
                <span>HOW TO PLAY NEON UNO</span>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="w-6 h-6 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs text-slate-300 max-h-72 overflow-y-auto pr-1 no-scrollbar font-mono">
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-cyan-400 font-orbitron block mb-0.5">1. Matching Rules</strong>
                Play a card matching the active color or number of the top discard pile. Can't play?
                Draw one card, then play it or Pass.
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-amber-400 font-orbitron block mb-0.5">2. Card 8 & Wilds</strong>
                Wilds can be played on any card to choose the next color. Card 8 does the same only when
                the Crazy Eights toggle is on.
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-pink-400 font-orbitron block mb-0.5">3. Action Cards</strong>
                <ul className="list-disc list-inside space-y-0.5 mt-1 text-[11px]">
                  <li><strong>Skip:</strong> Next player loses their turn.</li>
                  <li><strong>Reverse:</strong> Reverses play order (or Skips in 1v1).</li>
                  <li><strong>Draw 2 (+2):</strong> Next player draws 2 cards and skips turn.</li>
                  <li><strong>Wild Draw 4 (+4):</strong> Change color + next player draws 4 cards.</li>
                </ul>
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-emerald-400 font-orbitron block mb-0.5">4. Calling UNO!</strong>
                The moment you're down to 1 card, tap the glowing <strong>UNO!</strong> button within a few seconds — miss the window and you draw a 2-card penalty!
              </div>
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                <strong className="text-purple-400 font-orbitron block mb-0.5">5. Multiplayer & Privacy Veil</strong>
                In Pass & Play, players take turns on the same device. Use the Privacy Veil to keep your cards secret between turns!
              </div>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-orbitron font-bold text-xs cursor-pointer"
            >
              UNDERSTOOD
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};
