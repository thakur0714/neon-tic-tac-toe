import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, Brain, Zap, Users, Sparkles, CheckCircle2 } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface RulesModalProps {
  isOpen: boolean;
  soundEnabled: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, soundEnabled, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm max-h-[85vh] rounded-3xl p-5 bg-slate-900/95 border border-slate-800 shadow-2xl flex flex-col relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              <h3 className="font-bold text-base text-white font-orbitron">
                RULES & AI LOGIC
              </h3>
            </div>
            <button
              onClick={() => {
                playClickSound(soundEnabled);
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-1 text-xs text-slate-300">
            {/* Rule 1 */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white font-orbitron text-xs">Standard Objective</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Be the first player to place 3 of your neon marks in a horizontal, vertical, or diagonal line to trigger the laser strike-through!
                </p>
              </div>
            </div>

            {/* Rule 2: Pass & Play */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white font-orbitron text-xs">Pass & Play</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Take turns on the same mobile screen. Dynamic HUD highlights active player turns with glowing neon pulses and distinct audio tones.
                </p>
              </div>
            </div>

            {/* Rule 3: The Unbeatable Minimax AI */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-pink-500/30 flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0 border border-pink-500/30">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-pink-400 font-orbitron text-xs">Unbeatable Minimax AI</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Hard mode runs a mathematical recursive Minimax search tree with depth optimization. It looks ahead to all possible moves and counter-moves. It cannot be defeated — your goal is to hold out for an epic draw!
                </p>
              </div>
            </div>

            {/* Rule 4: Audio & Haptics */}
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white font-orbitron text-xs">Cyber Audio & Haptics</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Every move generates custom real-time Web Audio synthesis (X has high cyan synth pop; O has warm pink resonant chime).
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-800 shrink-0">
            <button
              onClick={() => {
                playClickSound(soundEnabled);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black font-orbitron text-xs tracking-wider transition-all cursor-pointer"
            >
              GOT IT, LET'S PLAY!
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
