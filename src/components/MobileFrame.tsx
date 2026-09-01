import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-0 sm:p-3 md:p-4 overflow-hidden cyber-grid selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Main 100% Viewport-Fitted Container */}
      <main className="w-full max-w-xl md:max-w-2xl h-full sm:h-auto sm:max-h-[96dvh] bg-slate-950 sm:rounded-3xl sm:border border-slate-800/80 sm:shadow-[0_10px_40px_-10px_rgba(0,240,255,0.12)] flex flex-col relative overflow-hidden backdrop-blur-xl ring-1 ring-slate-800/40">
        <div className="flex-1 w-full h-full flex flex-col overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
