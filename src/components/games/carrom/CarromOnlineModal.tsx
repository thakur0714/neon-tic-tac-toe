import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  Wifi,
  X,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { carromRoomManager } from '../../../utils/carromRoomManager';
import { CarromGameMode, CarromLobbyState, CarromRoomStatus } from '../../../types/carrom';

interface CarromOnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameStarted: () => void;
  gameMode: CarromGameMode;
  onModeChange: (mode: CarromGameMode) => void;
}

export const CarromOnlineModal: React.FC<CarromOnlineModalProps> = ({
  isOpen,
  onClose,
  onGameStarted,
  gameMode,
  onModeChange,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [playerName, setPlayerName] = useState(() => {
    try {
      return localStorage.getItem('carrom_player_name') || 'Striker ' + Math.floor(Math.random() * 100);
    } catch {
      return 'Striker 1';
    }
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<CarromRoomStatus>('idle');
  const [lobby, setLobby] = useState<CarromLobbyState | null>(null);
  const [latency, setLatency] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('carrom_player_name', playerName);
    } catch {}
  }, [playerName]);

  // Subscribe to room manager events
  useEffect(() => {
    if (!isOpen) return;

    const unsubStatus = carromRoomManager.onStatus((s) => {
      setStatus(s);
      if (s === 'playing') {
        onGameStarted();
        onClose();
      }
    });

    const unsubLobby = carromRoomManager.onLobby((l) => {
      setLobby(l);
    });

    const unsubLatency = carromRoomManager.onLatency((lat) => {
      setLatency(lat);
    });

    return () => {
      unsubStatus();
      unsubLobby();
      unsubLatency();
    };
  }, [isOpen, onGameStarted, onClose]);

  if (!isOpen) return null;

  const handleCreateRoom = async () => {
    setErrorMessage('');
    try {
      await carromRoomManager.createRoom(playerName, gameMode);
    } catch (err) {
      setErrorMessage((err as Error)?.message || 'Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCodeInput.trim()) {
      setErrorMessage('Please enter a 6-digit room code');
      return;
    }
    setErrorMessage('');
    try {
      await carromRoomManager.joinRoom(roomCodeInput.trim(), playerName);
    } catch (err) {
      setErrorMessage((err as Error)?.message || 'Could not connect to host. Check the room code.');
    }
  };

  const handleCopyCode = () => {
    if (!lobby?.roomCode) return;
    navigator.clipboard.writeText(lobby.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartGame = () => {
    carromRoomManager.startGame();
    onGameStarted();
    onClose();
  };

  const isHost = carromRoomManager.isHost();
  const hasOpponent = lobby?.seats[1]?.connected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.25)] p-5 text-slate-100 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide bg-gradient-to-r from-cyan-400 to-amber-300 bg-clip-text text-transparent">
                ONLINE CARROM DUEL
              </h2>
              <p className="text-[11px] text-slate-400">Play with friends via Room Code</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              carromRoomManager.cleanup();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Player Name Input */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-300">Your Nickname</label>
          <input
            type="text"
            maxLength={14}
            value={playerName}
            disabled={status === 'lobby' || status === 'connecting'}
            onChange={(e) => setPlayerName(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-sm focus:outline-hidden focus:border-cyan-400 font-medium"
            placeholder="Enter nickname"
          />
        </div>

        {/* Mode Selector (Classic vs Disc Pool) */}
        {status === 'idle' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-300">Carrom Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onModeChange('disc-pool')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  gameMode === 'disc-pool'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                Disc Pool (Fast)
              </button>
              <button
                type="button"
                onClick={() => onModeChange('classic')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  gameMode === 'classic'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                Classic Points
              </button>
            </div>
          </div>
        )}

        {/* Tabs: Create vs Join (only if idle) */}
        {status === 'idle' && (
          <>
            <div className="flex rounded-xl bg-slate-800/60 p-1 border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Create Room
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('join')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-cyan-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Join Room
              </button>
            </div>

            {activeTab === 'create' ? (
              <div className="flex flex-col gap-3 py-1">
                <p className="text-xs text-slate-400">
                  Host a live match and share the 6-digit room code with your friend to play together in real-time.
                </p>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-sm text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Room Code
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-1">
                <input
                  type="text"
                  maxLength={6}
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Enter 6-digit Code"
                  className="w-full text-center tracking-[0.25em] text-lg font-black py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-cyan-400 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 font-bold text-sm text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer"
                >
                  Join Match
                </button>
              </div>
            )}
          </>
        )}

        {/* Lobby State */}
        {(status === 'lobby' || status === 'creating' || status === 'connecting') && (
          <div className="flex flex-col gap-3 py-2">
            {/* Room Code Card */}
            {lobby?.roomCode && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-cyan-950/40 border border-cyan-500/40">
                <div>
                  <span className="text-[10px] text-cyan-300 font-semibold block">ROOM CODE</span>
                  <span className="text-xl font-mono font-black text-cyan-400 tracking-wider">
                    {lobby.roomCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            {/* Players Status Box */}
            <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-850/80 border border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Players in Lobby
              </span>

              {/* Player 1 (Host - White) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-100 border-2 border-amber-300 shadow-sm" />
                  <span className="text-xs font-bold text-slate-200">
                    {lobby?.seats[0]?.name || playerName} {isHost && '(You)'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold">
                  Host (White)
                </span>
              </div>

              {/* Player 2 (Client - Black) */}
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-600 shadow-sm" />
                  <span className="text-xs font-bold text-slate-200">
                    {hasOpponent ? (
                      lobby?.seats[1]?.name + (!isHost ? ' (You)' : '')
                    ) : (
                      <span className="text-slate-500 italic">Waiting for opponent to join…</span>
                    )}
                  </span>
                </div>
                {hasOpponent ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-semibold">
                    Ready (Black)
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-2" />
                )}
              </div>
            </div>

            {/* Latency if available */}
            {latency > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <Wifi className="w-3.5 h-3.5" />
                <span>Ping: {latency}ms</span>
              </div>
            )}

            {/* Host Action: Start Game */}
            {isHost && (
              <button
                type="button"
                disabled={!hasOpponent}
                onClick={handleStartGame}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.4)] active:scale-95 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                {hasOpponent ? 'START MATCH NOW' : 'WAITING FOR FRIEND…'}
              </button>
            )}

            {!isHost && (
              <div className="text-center text-xs text-amber-300 font-medium py-1 animate-pulse">
                Connected! Waiting for host to start match…
              </div>
            )}
          </div>
        )}

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
