import React from 'react';
import { UnoCard, UnoCardColor } from '../../../types/uno';
import { Ban, RotateCw, Sparkles, Layers } from 'lucide-react';

interface UnoCardViewProps {
  card?: UnoCard;
  isFaceDown?: boolean;
  isPlayable?: boolean;
  isSelected?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'player';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  badgeLabel?: string;
  /** When true, number 8 cards act as wilds (Crazy Eights house rule) and show a badge. */
  eightIsWild?: boolean;
}

const COLOR_STYLES: Record<
  UnoCardColor,
  {
    bg: string;
    border: string;
    glow: string;
    text: string;
    pillBg: string;
    badgeText: string;
  }
> = {
  red: {
    bg: 'bg-gradient-to-br from-red-500 via-rose-600 to-red-700',
    border: 'border-red-400/80',
    glow: 'shadow-[0_0_12px_rgba(239,68,68,0.4)]',
    text: 'text-white',
    pillBg: 'bg-red-950/70 border-red-400/40',
    badgeText: 'text-red-300',
  },
  blue: {
    bg: 'bg-gradient-to-br from-cyan-400 via-blue-500 to-blue-700',
    border: 'border-cyan-300/80',
    glow: 'shadow-[0_0_12px_rgba(6,182,212,0.4)]',
    text: 'text-white',
    pillBg: 'bg-cyan-950/70 border-cyan-400/40',
    badgeText: 'text-cyan-300',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-700',
    border: 'border-emerald-300/80',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]',
    text: 'text-white',
    pillBg: 'bg-emerald-950/70 border-emerald-400/40',
    badgeText: 'text-emerald-300',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600',
    border: 'border-amber-200/90',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]',
    text: 'text-slate-950',
    pillBg: 'bg-amber-950/70 border-amber-400/40',
    badgeText: 'text-amber-300',
  },
  wild: {
    bg: 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-950',
    border: 'border-purple-400/80',
    glow: 'shadow-[0_0_14px_rgba(168,85,247,0.5)]',
    text: 'text-white',
    pillBg: 'bg-purple-950/80 border-purple-400/50',
    badgeText: 'text-purple-300',
  },
};

const SIZE_CONFIG = {
  xs: {
    width: 'w-8 sm:w-9',
    height: 'h-12 sm:h-13',
    centerText: 'text-xs font-black',
    cornerText: 'text-[7px] font-bold',
    padding: 'p-0.5',
    rounded: 'rounded-md',
    iconSize: 'w-2.5 h-2.5',
  },
  sm: {
    width: 'w-10 sm:w-11',
    height: 'h-15 sm:h-16',
    centerText: 'text-sm font-black',
    cornerText: 'text-[9px] font-bold',
    padding: 'p-1',
    rounded: 'rounded-lg',
    iconSize: 'w-3.5 h-3.5',
  },
  md: {
    width: 'w-13 sm:w-14',
    height: 'h-19 sm:h-21',
    centerText: 'text-lg font-black',
    cornerText: 'text-[10px] font-bold',
    padding: 'p-1.5',
    rounded: 'rounded-xl',
    iconSize: 'w-4 h-4',
  },
  lg: {
    width: 'w-16 sm:w-18',
    height: 'h-24 sm:h-26',
    centerText: 'text-2xl font-black',
    cornerText: 'text-xs font-bold',
    padding: 'p-2',
    rounded: 'rounded-2xl',
    iconSize: 'w-5 h-5',
  },
  player: {
    width: 'w-15 sm:w-18 md:w-20',
    height: 'h-23 sm:h-28 md:h-30',
    centerText: 'text-2xl sm:text-3xl font-black',
    cornerText: 'text-xs sm:text-sm font-black',
    padding: 'p-2',
    rounded: 'rounded-xl sm:rounded-2xl',
    iconSize: 'w-5 sm:w-6 h-5 sm:h-6',
  },
};

export const UnoCardView: React.FC<UnoCardViewProps> = React.memo(({
  card,
  isFaceDown = false,
  isPlayable = false,
  isSelected = false,
  size = 'md',
  onClick,
  disabled = false,
  className = '',
  badgeLabel,
  eightIsWild = false,
}) => {
  const handleClick = disabled ? undefined : onClick;
  const sizeStyles = SIZE_CONFIG[size];

  // Render Face Down Card (Deck or Opponents' hands)
  if (isFaceDown || !card) {
    return (
      <div
        onClick={onClick}
        className={`relative ${sizeStyles.width} ${sizeStyles.height} ${sizeStyles.rounded} ${sizeStyles.padding} bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-cyan-500/40 shadow-md flex items-center justify-center select-none transition-transform duration-150 ${onClick ? 'cursor-pointer active:scale-95' : ''} ${className}`}
      >
        {/* Cyber Neon Back Pattern */}
        <div className="w-full h-full rounded-[inherit] border border-cyan-400/30 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950/80">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent pointer-events-none" />
          <div className="w-4/5 h-4/5 rounded-full border border-pink-500/40 -rotate-25 flex items-center justify-center bg-slate-900/60 shadow-[0_0_6px_rgba(236,72,153,0.3)]">
            <span className="font-orbitron font-black text-[9px] sm:text-[10px] text-cyan-400 tracking-tighter">
              UNO
            </span>
          </div>
        </div>
      </div>
    );
  }

  const theme = COLOR_STYLES[card.color] || COLOR_STYLES.wild;

  // Render Card Visual Center Element
  const renderCenterSymbol = () => {
    if (typeof card.value === 'number') {
      return (
        <span className={`font-orbitron ${sizeStyles.centerText} ${theme.text} drop-shadow-md`}>
          {card.value}
        </span>
      );
    }

    switch (card.value) {
      case 'skip':
        return <Ban className={`${sizeStyles.iconSize} ${theme.text} drop-shadow-md stroke-[2.5]`} />;
      case 'reverse':
        return <RotateCw className={`${sizeStyles.iconSize} ${theme.text} drop-shadow-md stroke-[2.5]`} />;
      case 'draw2':
        return (
          <div className="flex flex-col items-center leading-none">
            <span className={`font-orbitron ${sizeStyles.centerText} ${theme.text} drop-shadow-md`}>
              +2
            </span>
          </div>
        );
      case 'wild':
        return (
          <div className="w-5/6 h-5/6 rounded-full -rotate-25 p-0.5 grid grid-cols-2 grid-rows-2 shadow-[0_0_8px_rgba(255,255,255,0.3)] overflow-hidden border border-white/50">
            <div className="bg-red-500" />
            <div className="bg-cyan-400" />
            <div className="bg-amber-400" />
            <div className="bg-emerald-400" />
          </div>
        );
      case 'wild4':
        return (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="font-orbitron font-black text-xs sm:text-sm text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.8)]">
              +4
            </span>
            <div className="flex gap-0.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-xs bg-red-500" />
              <span className="w-1.5 h-1.5 rounded-xs bg-cyan-400" />
              <span className="w-1.5 h-1.5 rounded-xs bg-amber-400" />
              <span className="w-1.5 h-1.5 rounded-xs bg-emerald-400" />
            </div>
          </div>
        );
    }
  };

  // Corner symbol representation
  const renderCornerLabel = () => {
    if (typeof card.value === 'number') return card.value;
    if (card.value === 'draw2') return '+2';
    if (card.value === 'wild4') return '+4';
    if (card.value === 'skip') return '⊘';
    if (card.value === 'reverse') return '⇄';
    if (card.value === 'wild') return '★';
    return '';
  };

  const cornerLabel = renderCornerLabel();

  return (
    <div
      onClick={handleClick}
      className={`relative ${sizeStyles.width} ${sizeStyles.height} ${sizeStyles.rounded} ${sizeStyles.padding} ${theme.bg} border ${theme.border} select-none transition-all duration-150 ${handleClick ? 'cursor-pointer active:scale-95' : ''} ${
        disabled ? 'opacity-60' : ''
      } ${
        isSelected ? '-translate-y-2 sm:-translate-y-3 z-30 shadow-lg scale-105 ring-2 ring-white' : ''
      } ${
        isPlayable && !isSelected ? 'ring-2 ring-cyan-300 ring-offset-1 ring-offset-slate-950 animate-pulse hover:-translate-y-1' : ''
      } ${className}`}
    >
      {/* Outer Card Shell with Inner Oval */}
      <div className="w-full h-full rounded-[inherit] relative flex flex-col justify-between p-0.5 overflow-hidden">
        {/* Top-Left Corner Index */}
        <div className="flex items-center justify-start">
          <span className={`font-orbitron ${sizeStyles.cornerText} ${theme.text} leading-none drop-shadow`}>
            {cornerLabel}
          </span>
        </div>

        {/* Center Oval Core */}
        <div className="absolute inset-1.5 rounded-full -rotate-20 bg-slate-950/40 border border-white/20 flex items-center justify-center backdrop-blur-[1px] shadow-inner">
          <div className="rotate-20 flex items-center justify-center">
            {renderCenterSymbol()}
          </div>
        </div>

        {/* Bottom-Right Corner Index (Inverted) */}
        <div className="flex items-center justify-end rotate-180">
          <span className={`font-orbitron ${sizeStyles.cornerText} ${theme.text} leading-none drop-shadow`}>
            {cornerLabel}
          </span>
        </div>
      </div>

      {/* Optional Card 8 / Wild Crown Label */}
      {card.value === 8 && eightIsWild && (
        <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded bg-amber-400 text-slate-950 font-orbitron font-black text-[7px] shadow-sm tracking-tighter">
          CRAZY 8
        </span>
      )}

      {badgeLabel && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1 rounded bg-slate-950/90 border border-cyan-400 text-cyan-300 font-mono text-[7px] whitespace-nowrap">
          {badgeLabel}
        </span>
      )}
    </div>
  );
});
