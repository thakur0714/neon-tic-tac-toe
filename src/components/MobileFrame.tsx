import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-start sm:justify-center p-0 sm:p-4 md:p-6 overflow-x-hidden cyber-grid selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Main Responsive Application Shell */}
      <main className="w-full max-w-xl md:max-w-2xl sm:my-auto bg-slate-950/95 sm:rounded-3xl sm:border border-slate-800/80 sm:shadow-[0_10px_40px_-10px_rgba(0,240,255,0.12)] min-h-screen sm:min-h-[640px] sm:max-h-[92vh] flex flex-col relative overflow-hidden backdrop-blur-xl ring-1 ring-slate-800/40">
        <div className="flex-1 w-full flex flex-col overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
