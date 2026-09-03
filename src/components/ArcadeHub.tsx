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
  Maximize2,
  Minimize2,
  Download,
  Smartphone,
  Share2,
  PlusSquare,
  X,
} from 'lucide-react';
import { ArcadeGameId } from '../types';
import { playClickSound, triggerHaptic } from '../utils/audio';
import { PWAInstallBanner } from './PWAInstallBanner';
import { usePWAInstall } from '../utils/usePWAInstall';

interface ArcadeHubProps {
  onSelectGame: (gameId: ArcadeGameId) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  tttStreak: number;
  snakeHighScore: number;
  connect4Wins: number;
  score2048HighScore: number;
}

export const ArcadeHub: React.FC<ArcadeHubProps> = ({
  onSelectGame,
  soundEnabled,
  onToggleSound,
  tttStreak,
  snakeHighScore,
  connect4Wins,
  score2048HighScore,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'duel' | 'arcade'>('all');
  const [showHubInfo, setShowHubInfo] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { isFullscreen, toggleFullscreen, isInstalled, isInstallable, install, isIOS } = usePWAInstall();

  const handleGameClick = (gameId: ArcadeGameId) => {
    playClickSound(soundEnabled);
    triggerHaptic('medium');
    onSelectGame(gameId);
  };

  const games = [
    {
      id: 'tictactoe' as ArcadeGameId,
      title: 'Ultimate Tic-Tac-Toe',
      subtitle: 'Online 1v1 & Minimax AI Duel',
      category: 'duel',
      tag: 'ONLINE 1v1 READY',
      theme: 'cyan',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse',
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
      description: 'Live Online P2P multiplayer with synchronized coin toss & Minimax AI difficulty modes.',
    },
    {
      id: 'ludo' as ArcadeGameId,
      title: 'Neon Ludo King',
      subtitle: '4-Player AI & Online Board Duel',
      category: 'classic',
      tag: 'NEW · 4 PLAYERS',
      theme: 'amber',
      borderColor: 'border-amber-500/40 hover:border-amber-400',
      textColor: 'text-amber-400',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold',
      statLabel: 'Track Engine',
      statValue: '15x15 Grid',
      iconVisual: (
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/40 grid grid-cols-2 gap-1 p-1.5 shrink-0 place-items-center">
          <span className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_6px_#EF4444]" />
          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981]" />
          <span className="w-3.5 h-3.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06B6D4]" />
          <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_6px_#F59E0B]" />
        </div>
      ),
      description: '15x15 precision board with 52-tile track, 8 Safe Stars, 4 Home columns, and smooth token hops.',
    },
    {
      id: 'carrom' as ArcadeGameId,
      title: 'Neon Carrom Pool',
      subtitle: '2D Physics & Online Room Duel',
      category: 'classic',
      tag: 'NEW · ONLINE 1v1',
      theme: 'cyan',
      borderColor: 'border-cyan-500/40 hover:border-cyan-400',
      textColor: 'text-cyan-400',
      badgeBg: 'bg-gradient-to-r from-cyan-500/20 to-amber-500/20 text-cyan-300 border-cyan-500/40 font-bold',
      statLabel: 'Engine',
      statValue: '2D Physics',
      iconVisual: (
        <div className="w-12 h-12 rounded-xl bg-slate-950 border border-amber-500/40 flex items-center justify-center shrink-0 relative overflow-hidden">
          <div className="w-8 h-8 rounded-md border border-amber-600/60 bg-amber-950/40 flex items-center justify-center">
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_#EF4444]" />
          </div>
          <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 border border-cyan-200" />
        </div>
      ),
      description: 'Realistic Carrom board with 2D elastic collisions, dynamic striker slingshot aim, smart AI bot & Ludo King style room codes.',
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
    <div className="w-full h-full flex-1 flex flex-col p-2.5 sm:p-4 relative overflow-hidden bg-slate-950">
      {/* Top Header Bar - Clean, spacious, no clipping */}
      <header className="shrink-0 w-full flex items-center justify-between z-10 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 p-0.5 flex items-center justify-center shadow-[0_0_12px_rgba(0,240,255,0.3)] shrink-0">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-black font-orbitron tracking-wider text-white whitespace-nowrap">
                CYBER ARCADE
              </h1>
              <span className="text-[8px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0 font-bold">
                HUB
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">6 Neon Games · Instant Play</p>
          </div>
        </div>

        {/* Clean, compact right controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
            title={soundEnabled ? 'Mute Sound' : 'Enable Sound'}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              triggerHaptic('light');
              toggleFullscreen();
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter 100% Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setShowHubInfo(!showHubInfo);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 flex items-center justify-center transition-colors cursor-pointer"
            title="Arcade Info"
            aria-label="Arcade Info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Category Filter Chips & Right-Aligned Install CTA (Balanced Layout) */}
      <div className="shrink-0 w-full flex items-center justify-between gap-2 py-1.5 z-10">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setSelectedCategory('all');
            }}
            className={`shrink-0 h-7 px-2.5 flex items-center justify-center rounded-lg text-[10px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(0,240,255,0.35)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            ALL ({games.length})
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setSelectedCategory('duel');
            }}
            className={`shrink-0 h-7 px-2.5 flex items-center justify-center rounded-lg text-[10px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'duel'
                ? 'bg-pink-500 text-white shadow-[0_0_10px_rgba(255,0,127,0.35)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            DUEL
          </button>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              setSelectedCategory('arcade');
            }}
            className={`shrink-0 h-7 px-2.5 flex items-center justify-center rounded-lg text-[10px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'arcade'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            ARCADE
          </button>
        </nav>

        {/* Install CTA utilizing the available right space */}
        {!isInstalled ? (
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              triggerHaptic('medium');
              if (isInstallable) {
                install();
              } else {
                setShowInstallGuide(true);
              }
            }}
            className="shrink-0 h-7 px-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 font-orbitron font-bold text-[10px] flex items-center gap-1 shadow-[0_0_10px_rgba(6,182,212,0.35)] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Install Mobile App (No URL Bar)"
          >
            <Download className="w-3 h-3" />
            <span>INSTALL APP</span>
          </button>
        ) : (
          <div className="shrink-0 h-7 px-2 flex items-center gap-1 text-[9px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 rounded-lg">
            <Smartphone className="w-3 h-3" />
            <span>APP MODE</span>
          </div>
        )}
      </div>

      {/* Games List - Scrollable Responsive Grid */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-2.5 z-10 my-0.5 no-scrollbar">
        {filteredGames.map((game, index) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => handleGameClick(game.id)}
            className={`p-3 rounded-xl sm:rounded-2xl bg-slate-900/80 border ${game.borderColor} transition-all cursor-pointer backdrop-blur-md relative overflow-hidden group shadow-md flex flex-col justify-between hover:shadow-lg`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
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

                <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700/70 flex items-center justify-center text-slate-300 group-hover:bg-cyan-500 group-hover:text-slate-950 transition-all shrink-0">
                  <Play className="w-3 h-3 fill-current ml-0.5" />
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {game.iconVisual}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xs sm:text-sm font-bold font-orbitron text-white group-hover:text-cyan-300 transition-colors truncate">
                    {game.title}
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                    {game.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="line-clamp-1 pr-2 text-slate-400 text-[10px]">{game.description}</span>
              <div className="flex items-center gap-0.5 text-cyan-400 font-bold font-orbitron text-[9px] sm:text-[10px] shrink-0">
                <span>PLAY</span>
                <ChevronRight className="w-3 h-3" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Launch Bottom Bar - Slim & Non-intrusive */}
      <footer className="shrink-0 w-full pt-1.5 z-10">
        <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold font-orbitron text-white truncate">READY TO PLAY?</div>
              <div className="text-[9px] text-slate-400 truncate">Zero lag · Web Audio Synthesizer · Haptics</div>
            </div>
          </div>
          <button
            onClick={() => handleGameClick('tictactoe')}
            className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-orbitron text-[11px] tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(0,240,255,0.3)] cursor-pointer transition-all shrink-0 whitespace-nowrap"
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
                <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30">
                  <strong className="text-cyan-300 font-orbitron block mb-0.5">📱 Mobile App Mode (No URL Bar)</strong>
                  Tap the <span className="text-white font-bold">Install</span> or <span className="text-white font-bold">Fullscreen</span> button at the top to hide browser address bars, headers, and footers for a 100% native mobile app experience!
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

      {/* Direct App Install / Download Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100 relative"
            >
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 p-0.5 shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center text-cyan-300">
                    <Download className="w-4.5 h-4.5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold font-orbitron text-white">
                    HOW TO INSTALL APP
                  </h3>
                  <p className="text-[11px] text-cyan-400">Removes browser bar for full screen!</p>
                </div>
              </div>

              {isInstallable ? (
                <div className="space-y-3 my-4">
                  <p className="text-xs text-slate-300">
                    Your browser is ready! Tap below to add Cyber Arcade Hub directly to your phone's home screen.
                  </p>
                  <button
                    onClick={async () => {
                      await install();
                      setShowInstallGuide(false);
                    }}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-orbitron font-bold text-xs shadow-lg active:scale-98 transition-transform cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    INSTALL NOW
                  </button>
                </div>
              ) : isIOS ? (
                <div className="space-y-2.5 my-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <span>Tap the Safari <strong>Share</strong> button (<Share2 className="w-3.5 h-3.5 inline text-cyan-400 -mt-0.5" />).</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-5 h-5 rounded-md bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <span>Scroll and tap <strong>"Add to Home Screen"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-pink-400 -mt-0.5" />).</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <span>Open from your Home Screen for a zero-URL-bar real mobile app experience!</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 my-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">1</span>
                    <span>Tap Chrome's <strong>three dots (⋮)</strong> menu in the top right.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-5 h-5 rounded-md bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-[10px] shrink-0">2</span>
                    <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">3</span>
                    <span>Or tap the <strong>Fullscreen (⛶)</strong> button at any time to hide URL bars immediately!</span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowInstallGuide(false)}
                className="w-full mt-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-orbitron text-xs cursor-pointer transition-colors"
              >
                CLOSE
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
