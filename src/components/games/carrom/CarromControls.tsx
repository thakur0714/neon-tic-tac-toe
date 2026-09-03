import React from 'react';
import { RotateCcw, RotateCw, Zap, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShotIntent } from '../../../types/carrom';

interface CarromControlsProps {
  strikerSliderX: number;
  onSliderChange: (val: number) => void;
  aimAngle: number;
  onAngleChange: (angle: number) => void;
  aimPower: number;
  onPowerChange: (power: number) => void;
  onFireShot: (intent: ShotIntent) => void;
  disabled: boolean;
  isMyTurn: boolean;
  canPlaceHere: boolean;
}

export const CarromControls: React.FC<CarromControlsProps> = ({
  strikerSliderX,
  onSliderChange,
  aimAngle,
  onAngleChange,
  aimPower,
  onPowerChange,
  onFireShot,
  disabled,
  isMyTurn,
  canPlaceHere,
}) => {
  const handleNudgeSlider = (delta: number) => {
    if (disabled || !isMyTurn) return;
    const next = Math.max(0, Math.min(1, strikerSliderX + delta));
    onSliderChange(next);
  };

  const handleNudgeAngle = (degrees: number) => {
    if (disabled || !isMyTurn) return;
    const rad = (degrees * Math.PI) / 180;
    onAngleChange(aimAngle + rad);
  };

  const handleStrike = () => {
    if (disabled || !isMyTurn || !canPlaceHere) return;
    onFireShot({
      strikerX: strikerSliderX,
      angle: aimAngle,
      power: aimPower,
    });
  };

  return (
    <div className="w-full max-w-[430px] flex flex-col gap-2.5 px-3 py-2 bg-slate-900/90 border border-cyan-500/20 rounded-2xl backdrop-blur-md shadow-lg select-none">
      {/* 1. Baseline Position Slider */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
          <span className="flex items-center gap-1 text-cyan-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            STRIKER POSITION
          </span>
          <span className={canPlaceHere ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px] font-bold'}>
            {canPlaceHere ? 'Ready' : 'Blocked by piece!'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || !isMyTurn}
            onClick={() => handleNudgeSlider(-0.04)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            title="Nudge Left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={strikerSliderX}
            disabled={disabled || !isMyTurn}
            onChange={(e) => onSliderChange(parseFloat(e.target.value))}
            className="flex-1 accent-cyan-400 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          />

          <button
            type="button"
            disabled={disabled || !isMyTurn}
            onClick={() => handleNudgeSlider(0.04)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            title="Nudge Right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Angle Fine-Tuning & Power Meter */}
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Fine Angle Buttons */}
        <div className="col-span-4 flex items-center justify-between bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            disabled={disabled || !isMyTurn}
            onClick={() => handleNudgeAngle(-1.5)}
            className="p-1 rounded-md text-cyan-300 hover:bg-slate-800 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            title="Angle Left"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono font-medium text-slate-400">AIM</span>
          <button
            type="button"
            disabled={disabled || !isMyTurn}
            onClick={() => handleNudgeAngle(1.5)}
            className="p-1 rounded-md text-cyan-300 hover:bg-slate-800 active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            title="Angle Right"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Power Slider */}
        <div className="col-span-5 flex flex-col justify-center bg-slate-950/70 px-2 py-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-0.5">
            <span>POWER</span>
            <span className="text-amber-400 font-bold">{Math.round(aimPower * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.15}
            max={1.0}
            step={0.02}
            value={aimPower}
            disabled={disabled || !isMyTurn}
            onChange={(e) => onPowerChange(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer disabled:opacity-50"
          />
        </div>

        {/* Big Strike Button */}
        <div className="col-span-3">
          <button
            type="button"
            disabled={disabled || !isMyTurn || !canPlaceHere}
            onClick={handleStrike}
            className="w-full py-2.5 px-2 rounded-xl bg-gradient-to-r from-amber-500 to-cyan-500 text-slate-950 font-black text-xs tracking-wider uppercase flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(245,158,11,0.4)] active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            STRIKE
          </button>
        </div>
      </div>
    </div>
  );
};
