import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  Play,
  Flame,
  Sparkles,
  ChevronRight,
  Info,
  Trophy,
  Zap,
  Radio,
  Users,
} from 'lucide-react';
import { ArcadeGameId, MultiplayerGameType } from '../types';
import { playClickSound, triggerHaptic } from '../utils/audio';
import { MultiplayerLobbyModal } from './MultiplayerLobbyModal';

interface ArcadeHubProps {
  onSelectGame: (gameId: ArcadeGameId) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  tttStreak: number;
  snakeHighScore: number;
  connect4Wins: number;
  score2048HighScore: number;
  onStartMultiplayer?: (gameType: MultiplayerGameType) => void;
}

export const ArcadeHub: React.FC<ArcadeHubProps> = ({
  onSelectGame,
  soundEnabled,
  onToggleSound,
  tttStreak,
  snakeHighScore,
  connect4Wins,
  score2048HighScore,
  onStartMultiplayer,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'duel' | 'arcade'>('all');
  const [showHubInfo, setShowHubInfo] = useState(false);
  const [showMultiplayerModal, setShowMultiplayerModal] = useState(false);

  const handleGameClick = (gameId: ArcadeGameId) => {
    playClickSound(soundEnabled);
    triggerHaptic('medium');
    onSelectGame(gameId);
  };

  const games = [
    {
      id: 'tictactoe' as ArcadeGameId,
      title: 'Ultimate Tic-Tac-Toe',
      subtitle: 'Minimax AI & 2-Player Duel',
      category: 'duel',
      tag: 'POPULAR',
      theme: 'cyan',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
      statLabel: 'Best Streak',
      statValue: `${tttStreak} Wins`,
      iconVisual: (
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-cyan-500/30 grid grid-cols-2 gap-1 p-1.5 shrink-0 place-items-center">
          <span className="text-sm font-black font-orbitron text-cyan-400 leading-none">X</span>
          <span className="text-sm font-black font-orbitron text-pink-500 leading-none">O</span>
          <span className="text-sm font-black font-orbitron text-pink-500 leading-none">O</span>
          <span className="text-sm font-black font-orbitron text-cyan-400 leading-none">X</span>
        </div>
      ),
      description: 'Smart Minimax AI engine with 3 difficulty levels, Pass & Play, and neon strike animations.',
    },
    {
      id: 'snake' as ArcadeGameId,
      title: 'Cyber Snake 2099',
      subtitle: 'Neon Grid & Speed Boost',
      category: 'arcade',
      tag: 'ARCADE',
      theme: 'emerald',
      borderColor: 'border-emerald-500/40 hover:border-emerald-400',
      textColor: 'text-emerald-400',
      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      statLabel: 'High Score',
      statValue: `${snakeHighScore} Pts`,
      iconVisual: (
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-center gap-1 shrink-0 relative overflow-hidden">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600/60" />
          <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
        </div>
      ),
      description: 'Classic snake with cyber neon trails, power-up cores, multipliers, and swipe/d-pad controls.',
    },
    {
      id: 'connect4' as ArcadeGameId,
      title: 'Neon Connect 4',
      subtitle: 'Gravity Drop 4-in-a-Row',
      category: 'duel',
      tag: 'TACTICAL',
      theme: 'pink',
      borderColor: 'border-pink-500/40 hover:border-pink-400',
      textColor: 'text-pink-400',
      badgeBg: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
      statLabel: 'Victories',
      statValue: `${connect4Wins} Wins`,
      iconVisual: (
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-pink-500/30 grid grid-cols-3 gap-1 p-1.5 shrink-0 place-items-center">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="w-2 h-2 rounded-full bg-slate-800" />
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="w-2 h-2 rounded-full bg-pink-500" />
        </div>
      ),
      description: 'Drop glowing neon discs 4-in-a-row against smart AI bot or a friend with realistic drop physics.',
    },
    {
      id: '2048' as ArcadeGameId,
      title: 'Neon 2048 Matrix',
      subtitle: 'Swipe & Merge Cyber Tiles',
      category: 'arcade',
      tag: 'PUZZLE',
      theme: 'amber',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      statLabel: 'Best Score',
      statValue: `${score2048HighScore} Pts`,
      iconVisual: (
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/30 grid grid-cols-2 gap-1 p-1.5 shrink-0 place-items-center">
          <span className="w-4 h-4 rounded bg-cyan-500/30 text-[9px] font-orbitron font-black text-cyan-400 flex items-center justify-center">2</span>
          <span className="w-4 h-4 rounded bg-pink-500/30 text-[9px] font-orbitron font-black text-pink-400 flex items-center justify-center">8</span>
          <span className="w-4 h-4 rounded bg-amber-500/30 text-[9px] font-orbitron font-black text-amber-400 flex items-center justify-center">32</span>
          <span className="w-4 h-4 rounded bg-emerald-500/40 text-[8px] font-orbitron font-black text-emerald-400 flex items-center justify-center">2K</span>
        </div>
      ),
      description: 'Slide and combine glowing neon numbers to reach the legendary 2048 cyber matrix tile!',
    },
  ];

  const filteredGames = games.filter(
    (g) => selectedCategory === 'all' || g.category === selectedCategory
  );

  return (
    <div className="w-full h-full flex-1 flex flex-col p-3 sm:p-4 relative overflow-hidden bg-slate-950">
      {/* Top Header Bar */}
      <header className="shrink-0 w-full flex items-center justify-between z-10 pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.35)] shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-4.5 h-4.5 text-cyan-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm sm:text-base font-black font-orbitron tracking-wider text-white truncate">
                CYBER ARCADE
              </h1>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 font-bold">
                HUB
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">Choose a game to play</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setShowHubInfo(!showHubInfo);
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title="Arcade Info"
            aria-label="Arcade Info"
          >
            <Info className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Category Filter Chips & Online Room Button */}
      <div className="shrink-0 w-full flex items-center justify-between gap-2 py-2 my-1 z-10">
        <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setSelectedCategory('all');
            }}
            className={`shrink-0 h-8 px-3 flex items-center justify-center rounded-xl text-[11px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_14px_rgba(0,240,255,0.4)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            ALL ({games.length})
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setSelectedCategory('duel');
            }}
            className={`shrink-0 h-8 px-3 flex items-center justify-center rounded-xl text-[11px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'duel'
                ? 'bg-pink-500 text-white shadow-[0_0_14px_rgba(255,0,127,0.4)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            DUEL
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setSelectedCategory('arcade');
            }}
            className={`shrink-0 h-8 px-3 flex items-center justify-center rounded-xl text-[11px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'arcade'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            ARCADE
          </button>
        </nav>

        <button
          onClick={() => {
            playClickSound(soundEnabled);
            triggerHaptic('light');
            setShowMultiplayerModal(true);
          }}
          className="shrink-0 h-8 px-3 rounded-xl bg-gradient-to-r from-cyan-500/20 to-pink-500/20 border border-cyan-400/50 hover:border-cyan-300 text-cyan-300 hover:text-white text-[11px] font-orbitron font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)] transition-all cursor-pointer whitespace-nowrap"
        >
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span>ONLINE 1v1</span>
        </button>
      </div>

      {/* Games List - Scrollable Responsive Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2.5 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3 z-10 my-1 no-scrollbar">
        {filteredGames.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleGameClick(game.id)}
            className={`p-3.5 rounded-2xl bg-slate-900/80 border ${game.borderColor} transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group shadow-md flex flex-col justify-between hover:shadow-lg`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border tracking-wider ${game.badgeBg}`}>
                    {game.tag}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 whitespace-nowrap">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>{game.statLabel}:</span>
                    <strong className="text-slate-200">{game.statValue}</strong>
                  </span>
                </div>

                <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                {game.iconVisual}
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold font-orbitron text-white group-hover:text-cyan-300 transition-colors truncate">
                    {game.title}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium truncate">
                    {game.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="line-clamp-1 pr-2 text-slate-400 text-[10px]">{game.description}</span>
              <div className="flex items-center gap-0.5 text-cyan-400 font-bold font-orbitron text-[10px] shrink-0">
                <span>PLAY</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Launch Bottom Bar */}
      <footer className="shrink-0 w-full pt-2 z-10">
        <div className="p-2.5 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[11px] font-bold font-orbitron text-white truncate">READY TO PLAY?</div>
              <div className="text-[10px] text-slate-400 truncate">Zero lag · Web Audio Synthesizer · Haptics</div>
            </div>
          </div>
          <button
            onClick={() => handleGameClick('tictactoe')}
            className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-orbitron text-xs tracking-wider flex items-center gap-1 shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
          >
            <span>QUICK DUEL</span>
          </button>
        </div>
      </footer>

      {/* Info Modal */}
      <AnimatePresence>
        {showHubInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <div className="flex items-center gap-2 text-cyan-400 font-orbitron font-bold text-sm">
                  <Gamepad2 className="w-4 h-4" />
                  <span>CYBER ARCADE INFO</span>
                </div>
                <button
                  onClick={() => setShowHubInfo(false)}
                  className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-cyan-400 font-orbitron block mb-0.5">🎮 Multi-Game Hub</strong>
                  Switch between Tic-Tac-Toe, Cyber Snake 2099, Neon Connect 4, and Neon 2048 anytime with zero progress loss.
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-pink-400 font-orbitron block mb-0.5">🔊 Zero-Latency Audio</strong>
                  Powered by Web Audio API synthesizers - zero downloads needed.
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <strong className="text-amber-400 font-orbitron block mb-0.5">🏆 High Score Persistence</strong>
                  All game streaks and high scores are automatically saved to local storage.
                </div>
              </div>

              <button
                onClick={() => setShowHubInfo(false)}
                className="w-full mt-4 py-2.5 bg-cyan-500 text-slate-950 font-orbitron font-black rounded-xl text-xs tracking-wider cursor-pointer"
              >
                GOT IT
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online P2P Multiplayer Lobby Modal */}
      <MultiplayerLobbyModal
        isOpen={showMultiplayerModal}
        onClose={() => setShowMultiplayerModal(false)}
        onStartGame={(gameType) => {
          setShowMultiplayerModal(false);
          if (onStartMultiplayer) {
            onStartMultiplayer(gameType);
          } else {
            onSelectGame(gameType as ArcadeGameId);
          }
        }}
      />
    </div>
  );
};
