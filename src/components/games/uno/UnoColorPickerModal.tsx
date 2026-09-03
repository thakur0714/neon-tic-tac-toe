import React from 'react';
import { motion } from 'motion/react';
import { UnoCardColor } from '../../../types/uno';
import { Sparkles } from 'lucide-react';

interface UnoColorPickerModalProps {
  onSelectColor: (color: UnoCardColor) => void;
  onCancel?: () => void;
  reason?: 'wild' | 'wild4' | 'eight';
}

export const UnoColorPickerModal: React.FC<UnoColorPickerModalProps> = ({
  onSelectColor,
  onCancel,
  reason = 'wild',
}) => {
  const colors: { color: UnoCardColor; label: string; bg: string; border: string; glow: string; text: string }[] = [
    {
      color: 'red',
      label: 'NEON RED',
      bg: 'bg-red-500 hover:bg-red-400',
      border: 'border-red-300',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
      text: 'text-white',
    },
    {
      color: 'blue',
      label: 'CYBER BLUE',
      bg: 'bg-cyan-500 hover:bg-cyan-400',
      border: 'border-cyan-200',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]',
      text: 'text-slate-950',
    },
    {
      color: 'green',
      label: 'MATRIX GREEN',
      bg: 'bg-emerald-500 hover:bg-emerald-400',
      border: 'border-emerald-200',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
      text: 'text-slate-950',
    },
    {
      color: 'yellow',
      label: 'SOLAR YELLOW',
      bg: 'bg-amber-400 hover:bg-amber-300',
      border: 'border-amber-100',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
      text: 'text-slate-950',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0 }}
        className="w-full max-w-xs rounded-3xl bg-slate-900 border border-purple-500/40 p-5 shadow-2xl text-center relative overflow-hidden"
      >
        <div className="flex items-center justify-center gap-1.5 text-purple-400 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-[11px] font-orbitron font-bold tracking-wider">
            {reason === 'eight' ? 'CRAZY 8 TRIGGERED' : 'WILD CARD PLAYED'}
          </span>
        </div>

        <h3 className="text-base font-black font-orbitron text-white mb-4">
          CHOOSE NEXT COLOR
        </h3>

        {/* 2x2 Grid of Neon Colors */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {colors.map((c) => (
            <button
              key={c.color}
              onClick={() => onSelectColor(c.color)}
              className={`h-18 rounded-2xl ${c.bg} border-2 ${c.border} ${c.glow} ${c.text} font-orbitron font-black text-xs flex flex-col items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer shadow-lg`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-white/40 border border-white/60" />
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-slate-400 mt-2 font-mono">
          Game turn will continue with your chosen color.
        </p>

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-3 text-[10px] font-orbitron font-bold text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
          >
            CANCEL
          </button>
        )}
      </motion.div>
    </div>
  );
};
