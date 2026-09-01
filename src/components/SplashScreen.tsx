import React from 'react';
import { motion } from 'motion/react';
import { Play, Sparkles, BookOpen, Trophy, Volume2, VolumeX } from 'lucide-react';
import { playClickSound, triggerHaptic } from '../utils/audio';

interface SplashScreenProps {
  onStart: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onStart,
  onOpenRules,
  onOpenStats,
  onToggleSound,
  soundEnabled,
}) => {
  const handleStart = () => {
    playClickSound(soundEnabled);
    triggerHaptic('medium');
    onStart();
  };

  const handleRules = () => {
    playClickSound(soundEnabled);
    triggerHaptic('light');
    onOpenRules();
  };

  const handleStats = () => {
    playClickSound(soundEnabled);
    triggerHaptic('light');
    onOpenStats();
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 py-8 relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Background cyber ambient glow */}
      <div className="absolute top-1/4 -left-20 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-56 h-56 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Tagline + In-App Controls */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full flex items-center justify-between z-10"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
          <span className="text-[11px] font-orbitron tracking-widest text-pink-400 font-bold uppercase">
            CYBER ARCADE V2.0
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onToggleSound();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
            title={soundEnabled ? 'Mute' : 'Unmute'}
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={handleStats}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-yellow-400 hover:bg-yellow-950/30 transition-all cursor-pointer"
            title="Achievements"
            aria-label="Achievements"
          >
            <Trophy className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Central Branding Area */}
      <div className="w-full flex flex-col items-center my-auto py-4">
        {/* Animated Cyber Hologram Token Display */}
        <div className="relative w-44 h-44 flex items-center justify-center mb-6">
          {/* Outer rotating neon energy rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 rounded-full border border-dashed border-cyan-500/40"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border border-pink-500/30"
          />

          {/* Central 2x2 Mini Hologram Grid */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-xl bg-slate-950/80 border border-cyan-500/40 flex items-center justify-center glow-cyan-box"
            >
              <span className="text-3xl font-black font-orbitron text-cyan-400 glow-cyan-text">
                X
              </span>
            </motion.div>

            <motion.div
              animate={{ scale: [1.12, 1, 1.12] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-14 h-14 rounded-xl bg-slate-950/80 border border-pink-500/40 flex items-center justify-center glow-pink-box"
            >
              <span className="text-3xl font-black font-orbitron text-pink-500 glow-pink-text">
                O
              </span>
            </motion.div>

            <motion.div
              animate={{ scale: [1.12, 1, 1.12] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="w-14 h-14 rounded-xl bg-slate-950/80 border border-pink-500/40 flex items-center justify-center glow-pink-box"
            >
              <span className="text-3xl font-black font-orbitron text-pink-500 glow-pink-text">
                O
              </span>
            </motion.div>

            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
              className="w-14 h-14 rounded-xl bg-slate-950/80 border border-cyan-500/40 flex items-center justify-center glow-cyan-box"
            >
              <span className="text-3xl font-black font-orbitron text-cyan-400 glow-cyan-text">
                X
              </span>
            </motion.div>
          </div>
        </div>

        {/* Pulsing Neon Main Title */}
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="text-center px-2"
        >
          <div className="text-xs font-bold tracking-[0.3em] text-cyan-400 uppercase font-orbitron mb-1 flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            THE NEXT-GEN MOBILE DUEL
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          </div>

          <h1 className="text-4xl font-black tracking-wider uppercase font-orbitron leading-none text-white drop-shadow-md">
            ULTIMATE
          </h1>
          <h2 className="text-3xl font-black tracking-wider uppercase font-orbitron leading-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-500 glow-cyan-text">
            TIC-TAC-TOE
          </h2>

          <p className="text-xs text-slate-400 mt-2 font-medium max-w-[260px] mx-auto leading-relaxed">
            Pass & Play or challenge the Unbeatable Minimax AI Engine with high-energy neon FX.
          </p>
        </motion.div>
      </div>

      {/* Glossy Action Buttons */}
      <div className="w-full flex flex-col gap-3 z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleStart}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-400 text-slate-950 font-black font-orbitron text-base tracking-wider flex items-center justify-center gap-3 shadow-[0_0_25px_rgba(0,240,255,0.4)] border border-cyan-300/60 transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-slate-950" />
          <span>START PLAYING</span>
        </motion.button>

        <div className="grid grid-cols-2 gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleRules}
            className="py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Rules & AI</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleStats}
            className="py-3 px-4 rounded-xl bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 text-yellow-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>Achievements</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
};
