import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Download,
  Smartphone,
  Maximize2,
  Minimize2,
  X,
  Share2,
  PlusSquare,
  Sparkles,
  Check,
} from 'lucide-react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { triggerHaptic } from '../utils/audio';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isFullscreen, install, toggleFullscreen } =
    usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If already running in standalone/fullscreen PWA mode, don't show the install banner
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    triggerHaptic('medium');
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback: try fullscreen or show instructions
      toggleFullscreen();
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-2 p-2.5 rounded-2xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-pink-950/70 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-between gap-2.5 relative overflow-hidden"
      >
        {/* Ambient subtle glow pulse */}
        <div className="absolute -left-6 -top-6 w-20 h-20 bg-cyan-500/20 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-2.5 min-w-0 z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-pink-500 p-0.5 shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Smartphone className="w-4.5 h-4.5 text-cyan-300" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-bold font-orbitron text-white tracking-wide truncate">
                Mobile App Mode
              </span>
              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shrink-0">
                NO URL BAR
              </span>
            </div>
            <p className="text-[10px] text-slate-300 truncate">
              Install to hide browser header & footer like a real APK!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0 z-10">
          {/* Main Install / Launch button */}
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 font-orbitron font-bold text-[11px] shadow-[0_0_12px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {isInstallable ? 'INSTALL' : isIOS ? 'GET APP' : 'FULLSCREEN'}
          </button>

          {/* Quick Fullscreen toggle */}
          <button
            onClick={() => {
              triggerHaptic('light');
              toggleFullscreen();
            }}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter 100% Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-cyan-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Dismiss button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setIsDismissed(true);
            }}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* iOS Safari Installation Guide Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cyan-500/40 p-5 shadow-2xl text-slate-100 relative"
            >
              <button
                onClick={() => setShowIOSModal(false)}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-orbitron text-white">
                    INSTALL ON IPHONE / IPAD
                  </h3>
                  <p className="text-[11px] text-cyan-400">Removes Safari URL Bar & Footer</p>
                </div>
              </div>

              <div className="space-y-3 my-4 text-xs text-slate-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-6 h-6 rounded-md bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 font-bold font-mono text-xs">
                    1
                  </div>
                  <div>
                    Tap the <strong className="text-white">Share</strong> icon{' '}
                    <Share2 className="w-3.5 h-3.5 inline text-cyan-400 -mt-0.5" /> in your Safari bottom
                    toolbar.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-6 h-6 rounded-md bg-pink-500/20 flex items-center justify-center text-pink-400 shrink-0 font-bold font-mono text-xs">
                    2
                  </div>
                  <div>
                    Scroll down and select{' '}
                    <strong className="text-white">Add to Home Screen</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-pink-400 -mt-0.5" />.
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-bold font-mono text-xs">
                    3
                  </div>
                  <div>
                    Tap <strong className="text-white">Add</strong> in top-right. Launch it from your
                    Home Screen for 100% full-screen app mode!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-orbitron font-bold text-xs shadow-lg active:scale-98 transition-transform cursor-pointer"
              >
                GOT IT
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
