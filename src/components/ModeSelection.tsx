import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Bot, Zap, Skull, Sparkles, ChevronRight, Check, Volume2, VolumeX, Trophy, HelpCircle, Radio } from 'lucide-react';
import { GameConfig, GameMode, Player } from '../types';
import { playClickSound, triggerHaptic } from '../utils/audio';

interface ModeSelectionProps {
  config: GameConfig;
  onUpdateConfig: (newConfig: Partial<GameConfig>) => void;
  onStartGame: () => void;
  onStartOnline: () => void;
  onBack: () => void;
  onOpenRules: () => void;
  onOpenStats: () => void;
  onToggleSound: () => void;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({
  config,
  onUpdateConfig,
  onStartGame,
  onStartOnline,
  onBack,
  onOpenRules,
  onOpenStats,
  onToggleSound,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode | 'online'>(config.mode);
  const [playerSymbol, setPlayerSymbol] = useState<Player>(config.playerSymbol);
  const [firstMove, setFirstMove] = useState<'player' | 'ai' | 'alternate'>('player');

  const handleSelectMode = (mode: GameMode | 'online') => {
    playClickSound(config.soundEnabled);
    triggerHaptic('light', config.hapticsEnabled);
    setSelectedMode(mode);
  };

  const handleSelectSymbol = (sym: Player) => {
    playClickSound(config.soundEnabled);
    triggerHaptic('light', config.hapticsEnabled);
    setPlayerSymbol(sym);
  };

  const handleConfirmStart = () => {
    playClickSound(config.soundEnabled);
    triggerHaptic('medium', config.hapticsEnabled);

    if (selectedMode === 'online') {
      onStartOnline();
      return;
    }

    const aiSymbol: Player = playerSymbol === 'X' ? 'O' : 'X';
    let startingPlayer: Player = 'X';

    if (selectedMode.startsWith('ai')) {
      if (firstMove === 'player') {
        startingPlayer = playerSymbol;
      } else if (firstMove === 'ai') {
        startingPlayer = aiSymbol;
      } else {
        // Random
        startingPlayer = Math.random() < 0.5 ? 'X' : 'O';
      }
    } else {
      startingPlayer = 'X';
    }

    onUpdateConfig({
      mode: selectedMode,
      playerSymbol,
      aiSymbol,
      startingPlayer,
    });

    onStartGame();
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 relative overflow-y-auto cyber-grid">
      {/* Top Header */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onToggleSound();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer"
            title={config.soundEnabled ? 'Mute' : 'Unmute'}
          >
            {config.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onOpenStats();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-yellow-400 hover:bg-yellow-950/30 transition-all cursor-pointer"
            title="Achievements"
          >
            <Trophy className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              playClickSound(config.soundEnabled);
              onOpenRules();
            }}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="How to Play"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Mode Options */}
      <div className="flex-1 flex flex-col justify-center space-y-3 py-2">
        <div className="text-center mb-1">
          <h2 className="text-2xl font-black font-orbitron tracking-wide text-white">
            SELECT MODE
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose your opponent & challenge tier
          </p>
        </div>

        {/* Card 0: Online 1v1 */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectMode('online')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
            selectedMode === 'online'
              ? 'bg-slate-900/90 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
              : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  selectedMode === 'online'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-800/60 text-slate-400'
                }`}
              >
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-orbitron tracking-wide">
                    Online 1v1
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/50">
                    P2P LIVE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create or join a room & duel a friend across devices
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedMode === 'online'
                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              {selectedMode === 'online' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </motion.div>

        {/* Card 1: Pass & Play */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectMode('pvp')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
            selectedMode === 'pvp'
              ? 'bg-slate-900/90 border-cyan-500 shadow-[0_0_20px_rgba(0,240,255,0.25)]'
              : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  selectedMode === 'pvp'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                    : 'bg-slate-800/60 text-slate-400'
                }`}
              >
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-orbitron tracking-wide">
                    Pass & Play (PvP)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold border border-cyan-800/50">
                    2 PLAYERS
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Play against a friend on this single device
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedMode === 'pvp'
                  ? 'border-cyan-400 bg-cyan-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              {selectedMode === 'pvp' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </motion.div>

        {/* Card 2: AI Easy */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectMode('ai-easy')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
            selectedMode === 'ai-easy'
              ? 'bg-slate-900/90 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
              : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  selectedMode === 'ai-easy'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-slate-800/60 text-slate-400'
                }`}
              >
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white font-orbitron tracking-wide">
                    Casual AI (Easy)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/50">
                    WARM-UP
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Relaxed bot, good for casual practice
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedMode === 'ai-easy'
                  ? 'border-emerald-400 bg-emerald-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              {selectedMode === 'ai-easy' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </motion.div>

        {/* Card 3: AI Hard - Unbeatable Minimax */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleSelectMode('ai-hard')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden backdrop-blur-md ${
            selectedMode === 'ai-hard'
              ? 'bg-slate-900/90 border-pink-500 shadow-[0_0_25px_rgba(255,0,127,0.3)]'
              : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  selectedMode === 'ai-hard'
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/50'
                    : 'bg-slate-800/60 text-slate-400'
                }`}
              >
                <Skull className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-pink-400 font-orbitron tracking-wide">
                    Unbeatable AI (Hard)
                  </h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-950 text-pink-300 font-bold border border-pink-800/50 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    MINIMAX
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Flawless algorithmic logic — can you force a draw?
                </p>
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                selectedMode === 'ai-hard'
                  ? 'border-pink-400 bg-pink-500 text-slate-950'
                  : 'border-slate-700 bg-slate-800/50'
              }`}
            >
              {selectedMode === 'ai-hard' && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </div>
          </div>
        </motion.div>

        {/* Customization Drawer when playing vs AI */}
        {selectedMode.startsWith('ai') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="p-3.5 bg-slate-900/70 rounded-2xl border border-slate-800 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Choose Your Token:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectSymbol('X')}
                  className={`w-9 h-9 rounded-xl font-orbitron font-black text-base border transition-all ${
                    playerSymbol === 'X'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 glow-cyan-box'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  X
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectSymbol('O')}
                  className={`w-9 h-9 rounded-xl font-orbitron font-black text-base border transition-all ${
                    playerSymbol === 'O'
                      ? 'bg-pink-500/20 border-pink-400 text-pink-400 glow-pink-box'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  O
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/70">
              <span className="text-xs font-semibold text-slate-300">First Turn:</span>
              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(config.soundEnabled);
                    setFirstMove('player');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    firstMove === 'player'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  You First
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClickSound(config.soundEnabled);
                    setFirstMove('ai');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    firstMove === 'ai'
                      ? 'bg-pink-500 text-slate-950'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AI First
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Confirm Button */}
      <div className="mt-4 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleConfirmStart}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-pink-500 text-slate-950 font-black font-orbitron text-sm tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,240,255,0.3)] border border-cyan-200/50 cursor-pointer"
        >
          <span>{selectedMode === 'online' ? 'FIND MATCH' : 'ENTER ARENA'}</span>
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </motion.button>
      </div>
    </div>
  );
};
