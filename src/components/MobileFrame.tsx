import React, { useState, useEffect } from 'react';
import { Wifi, BatteryMedium } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [currentTime, setCurrentTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 sm:p-4 lg:p-6 select-none relative overflow-x-hidden cyber-grid">
      {/* Main Container / Mobile Device Wrapper */}
      <div className="transition-all duration-300 relative w-full max-w-[400px] h-[844px] max-h-[100vh] sm:max-h-[92vh] sm:rounded-[48px] sm:border-[10px] sm:border-slate-800/90 sm:shadow-[0_25px_60px_-15px_rgba(0,240,255,0.15)] bg-slate-950 overflow-hidden flex flex-col ring-1 ring-slate-700/40">
        {/* Mobile Device Status Bar */}
        <div className="w-full h-11 px-7 flex items-center justify-between z-20 text-[13px] font-semibold text-slate-200 select-none bg-slate-950/90 backdrop-blur-md shrink-0">
          <span>{currentTime}</span>

          {/* Dynamic Island / Camera Notch */}
          <div className="w-24 h-5 bg-black rounded-full border border-slate-800/70 flex items-center justify-end px-2 gap-1.5 shadow-inner">
            <div className="w-2 h-2 rounded-full bg-slate-900 border border-slate-800" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
          </div>

          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="text-[10px] font-extrabold tracking-tight text-slate-400">5G</span>
            <Wifi className="w-3.5 h-3.5" />
            <BatteryMedium className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Inner App Content Screen */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col relative">
          {children}
        </div>

        {/* Mobile Home Bar Indicator */}
        <div className="w-full h-5 flex items-center justify-center pb-1 shrink-0 bg-slate-950/90 z-20">
          <div className="w-32 h-1 bg-slate-600/70 rounded-full" />
        </div>
      </div>
    </div>
  );
};
