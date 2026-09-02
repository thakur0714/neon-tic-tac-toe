import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Copy,
  Check,
  Share2,
  Users,
  Radio,
  Gamepad2,
  Sparkles,
  Zap,
  Wifi,
  AlertCircle,
  Loader2,
  Grid3X3,
} from 'lucide-react';
import { peerManager } from '../utils/peerManager';
import { MultiplayerGameType, MultiplayerStatus } from '../types';
import { playClickSound, playPopSound } from '../utils/audio';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartGame: (gameType: MultiplayerGameType) => void;
  initialGameType?: MultiplayerGameType;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartGame,
  initialGameType = 'tictactoe',
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const selectedGame: MultiplayerGameType = 'tictactoe';
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [status, setStatus] = useState<MultiplayerStatus>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [latency, setLatency] = useState<number>(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(null);
      return;
    }

    // Subscribe to peerManager events
    const unsubStatus = peerManager.onStatus((newStatus, detail) => {
      setStatus(newStatus);
      if (newStatus === 'error') {
        setErrorMsg(detail || 'Connection failed. Please check the code and retry.');
      } else if (newStatus === 'connected') {
        setErrorMsg('');
        playPopSound();
        // Start quick 2-second launch countdown
        setCountdown(2);
      }
    });

    const unsubLatency = peerManager.onLatency((ms) => {
      setLatency(ms);
    });

    const unsubMsg = peerManager.onMessage(() => {
      // Message listener
    });

    return () => {
      unsubStatus();
      unsubLatency();
      unsubMsg();
    };
  }, [isOpen]);

  // Handle launch countdown
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    } else {
      // Launch game
      const targetGame = peerManager.getGameType() || selectedGame;
      onStartGame(targetGame);
      onClose();
    }
  }, [countdown, onStartGame, onClose, selectedGame]);

  const handleCreateRoom = async () => {
    playClickSound();
    setErrorMsg('');
    try {
      const code = await peerManager.createRoom(selectedGame);
      setRoomCode(code);
    } catch (err: any) {
      setErrorMsg('Failed to create room. Please check your internet.');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    playClickSound();
    setErrorMsg('');
    try {
      await peerManager.joinRoom(joinCode, selectedGame);
    } catch (err: any) {
      setErrorMsg('Failed to connect. Please check room code.');
    }
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    playPopSound();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyShareLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}&game=${selectedGame}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    playPopSound();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClose = () => {
    playClickSound();
    peerManager.cleanup();
    setRoomCode('');
    setStatus('idle');
    setCountdown(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl p-5 relative overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Ambient Top Glow */}
          <div className="absolute -top-12 inset-x-0 h-24 bg-cyan-500/15 blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h3 className="font-orbitron font-bold text-base text-slate-100 flex items-center gap-1.5">
                  P2P Online Multiplayer
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 uppercase font-mono">
                    Zero Lag
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">Play real-time 1v1 with friends across devices</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Connected State Screen */}
          {status === 'connected' ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 animate-bounce">
                <Zap className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold font-orbitron text-emerald-400">Opponent Connected!</h4>
                <p className="text-xs text-slate-300 mt-1 flex items-center justify-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  Direct P2P Link Established ({latency > 0 ? `${latency}ms latency` : 'Active'})
                </p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-cyan-500/40 font-mono text-sm text-cyan-300">
                Launching in <span className="font-bold text-white text-base">{countdown}</span>s...
              </div>
            </div>
          ) : (
            <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
              {/* Active Online Arena Banner */}
              {status === 'idle' && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-cyan-500/40 relative overflow-hidden flex items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shrink-0">
                      <Grid3X3 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold font-orbitron text-white">
                          Ultimate Tic-Tac-Toe
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                          1v1 DUEL
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Synchronized Coin Toss · Turn Sync · Rematch Engine
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>ONLINE READY</span>
                  </div>
                </div>
              )}

              {/* Tabs: Create vs Join */}
              {status === 'idle' && (
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      setTab('create');
                      playClickSound();
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg font-orbitron transition-all ${
                      tab === 'create'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Create Room
                  </button>
                  <button
                    onClick={() => {
                      setTab('join');
                      playClickSound();
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg font-orbitron transition-all ${
                      tab === 'join'
                        ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Join Room
                  </button>
                </div>
              )}

              {/* TAB 1: CREATE ROOM */}
              {tab === 'create' && (
                <div className="space-y-4">
                  {status === 'idle' && (
                    <button
                      onClick={handleCreateRoom}
                      className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-orbitron text-sm rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      Generate Online Room Code
                    </button>
                  )}

                  {status === 'creating' && (
                    <div className="py-6 flex flex-col items-center justify-center space-y-3">
                      <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                      <p className="text-xs text-slate-400 font-mono">Initializing P2P Signaling...</p>
                    </div>
                  )}

                  {status === 'waiting' && roomCode && (
                    <div className="space-y-4 p-4 rounded-xl bg-slate-950/80 border border-cyan-500/40">
                      <div className="text-center">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 font-orbitron">
                          Your Room Code
                        </span>
                        <div className="font-mono text-3xl font-extrabold tracking-widest text-cyan-400 bg-slate-900/90 py-2.5 px-4 rounded-xl border border-cyan-500/30 inline-block shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                          {roomCode}
                        </div>
                      </div>

                      {/* Action buttons: Copy Code / Copy Link */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={copyCode}
                          className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? 'Copied Code!' : 'Copy Code'}
                        </button>
                        <button
                          onClick={copyShareLink}
                          className="py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Link Copied!' : 'Share Link'}
                        </button>
                      </div>

                      {/* Waiting Pulse */}
                      <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        <span>Waiting for friend to join...</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: JOIN ROOM */}
              {tab === 'join' && status === 'idle' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block font-orbitron">
                      Enter Friend's 4-Digit Room Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. 7482"
                      className="w-full text-center font-mono text-2xl font-bold uppercase tracking-widest py-2.5 px-4 bg-slate-950 border border-pink-500/40 rounded-xl text-pink-400 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all placeholder:text-slate-700"
                    />
                  </div>

                  <button
                    onClick={handleJoinRoom}
                    disabled={!joinCode.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 disabled:opacity-50 text-slate-950 font-bold font-orbitron text-sm rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all transform active:scale-98 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Connect & Play
                  </button>
                </div>
              )}

              {status === 'connecting' && (
                <div className="py-6 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
                  <p className="text-xs text-slate-400 font-mono">Connecting to Room {joinCode}...</p>
                </div>
              )}

              {/* Error Notification */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
