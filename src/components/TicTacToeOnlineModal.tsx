import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Copy,
  Check,
  Share2,
  Radio,
  Sparkles,
  Zap,
  Wifi,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { peerManager } from '../utils/peerManager';
import { MultiplayerStatus } from '../types';
import { playClickSound, playPopSound } from '../utils/audio';

interface TicTacToeOnlineModalProps {
  onBack: () => void;
  onConnected: () => void;
}

/**
 * In-game online lobby for Ultimate Tic-Tac-Toe. Mirrors the Ludo flow — the
 * online section now lives inside the game itself instead of the arcade hub.
 */
export const TicTacToeOnlineModal: React.FC<TicTacToeOnlineModalProps> = ({
  onBack,
  onConnected,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [status, setStatus] = useState<MultiplayerStatus>('idle');
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [latency, setLatency] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const unsubStatus = peerManager.onStatus((newStatus, detail) => {
      setStatus(newStatus);
      if (newStatus === 'error') {
        setErrorMsg(detail || 'Connection failed. Check the room code and retry.');
      } else if (newStatus === 'connected') {
        setErrorMsg('');
        playPopSound();
        setCountdown(2);
      }
    });
    const unsubLatency = peerManager.onLatency((ms) => setLatency(ms));
    return () => {
      unsubStatus();
      unsubLatency();
    };
  }, []);

  // Short launch countdown once the opponent connects.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 800);
      return () => clearTimeout(timer);
    }
    onConnected();
  }, [countdown, onConnected]);

  const handleCreateRoom = async () => {
    playClickSound();
    setErrorMsg('');
    try {
      const code = await peerManager.createRoom('tictactoe');
      setRoomCode(code);
    } catch {
      setErrorMsg('Failed to create room. Please check your internet.');
    }
  };

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;
    playClickSound();
    setErrorMsg('');
    try {
      await peerManager.joinRoom(joinCode, 'tictactoe');
    } catch {
      setErrorMsg('Failed to connect. Please check the room code.');
    }
  };

  const copyCode = () => {
    if (!roomCode) return;
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopiedCode(true);
    playPopSound();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyShareLink = () => {
    if (!roomCode) return;
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}&game=tictactoe`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopiedLink(true);
    playPopSound();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBack = () => {
    playClickSound();
    peerManager.cleanup();
    onBack();
  };

  return (
    <div className="flex-1 h-full w-full flex items-center justify-center bg-slate-950 p-4 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.25)] p-5 relative overflow-hidden flex flex-col max-h-[92vh]"
      >
        <div className="absolute -top-12 inset-x-0 h-24 bg-cyan-500/15 blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 relative z-10">
          <button
            onClick={handleBack}
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-orbitron font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK
          </button>
          <span className="flex items-center gap-1.5 text-[11px] font-orbitron font-bold text-cyan-300">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> ONLINE 1v1
          </span>
        </div>

        {status === 'connected' ? (
          <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 animate-bounce">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold font-orbitron text-emerald-400">Opponent Connected!</h4>
              <p className="text-xs text-slate-300 mt-1 flex items-center justify-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                Direct P2P Link ({latency > 0 ? `${latency}ms` : 'Active'})
              </p>
            </div>
            <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-cyan-500/40 font-mono text-sm text-cyan-300">
              Launching in <span className="font-bold text-white text-base">{countdown}</span>s...
            </div>
          </div>
        ) : (
          <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1">
            {status === 'idle' && (
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => {
                    setTab('create');
                    playClickSound();
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg font-orbitron transition-all ${
                    tab === 'create'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
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
                      ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Join Room
                </button>
              </div>
            )}

            {/* CREATE */}
            {tab === 'create' && (
              <div className="space-y-4">
                {status === 'idle' && (
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold font-orbitron text-sm rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Room Code
                  </button>
                )}

                {status === 'creating' && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <p className="text-xs text-slate-400 font-mono">Initializing P2P signaling...</p>
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

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={copyCode}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode ? 'Copied!' : 'Copy Code'}
                      </button>
                      <button
                        onClick={copyShareLink}
                        className="py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        {copiedLink ? 'Copied!' : 'Share Link'}
                      </button>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-800 text-xs text-slate-400">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                      <span>Waiting for friend to join...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* JOIN */}
            {tab === 'join' && status === 'idle' && (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block font-orbitron">
                  Enter Friend's Room Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 7482"
                  className="w-full text-center font-mono text-2xl font-bold uppercase tracking-widest py-2.5 px-4 bg-slate-950 border border-pink-500/40 rounded-xl text-pink-400 focus:outline-none focus:border-pink-400 transition-all placeholder:text-slate-700"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={!joinCode.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 disabled:opacity-50 text-slate-950 font-bold font-orbitron text-sm rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  Connect & Play
                </button>
              </div>
            )}

            {status === 'connecting' && (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 text-pink-400 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Connecting to room {joinCode}...</p>
              </div>
            )}

            {(status === 'disconnected' || errorMsg) && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg || 'Disconnected from room.'}</span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
