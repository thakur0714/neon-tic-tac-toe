import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Copy,
  Check,
  Play,
  Wifi,
  X,
  ShieldAlert,
  Sparkles,
  Loader2,
  Crown,
  Layers,
} from 'lucide-react';
import { unoRoomManager } from '../../../utils/unoRoomManager';
import { UnoLobbyState, UnoRoomStatus } from '../../../types/uno';
import { playClickSound } from '../../../utils/audio';

export interface UnoOnlineStartInfo {
  role: 'host' | 'client';
  mySeatIndex: number;
  playerCount: number;
  players: Array<{ index: number; name: string; avatarColor: string }>;
  cardEightWild: boolean;
  initialCardCount: number;
}

interface UnoOnlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGameStarted: (info: UnoOnlineStartInfo) => void;
  cardEightWild: boolean;
  soundEnabled: boolean;
}

export const UnoOnlineModal: React.FC<UnoOnlineModalProps> = ({
  isOpen,
  onClose,
  onGameStarted,
  cardEightWild,
  soundEnabled,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [initialCardCount, setInitialCardCount] = useState<3 | 5 | 7>(7);
  const [playerName, setPlayerName] = useState(() => {
    try {
      return (
        localStorage.getItem('uno_player_name') ||
        'Player ' + Math.floor(10 + Math.random() * 90)
      );
    } catch {
      return 'Player 1';
    }
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<UnoRoomStatus>('idle');
  const [lobby, setLobby] = useState<UnoLobbyState | null>(null);
  const [latency, setLatency] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const gameStartedRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem('uno_player_name', playerName);
    } catch {}
  }, [playerName]);

  // Subscribe to unoRoomManager
  useEffect(() => {
    if (!isOpen) return;

    gameStartedRef.current = false;

    const unsubStatus = unoRoomManager.onStatus((s) => {
      setStatus(s);
      if (s === 'playing' && !gameStartedRef.current) {
        gameStartedRef.current = true;
        const role = unoRoomManager.getRole();
        const mySeat = unoRoomManager.getMySeat();
        const currentLobby = unoRoomManager.getLobby();
        if (role && mySeat !== null && currentLobby) {
          onGameStarted({
            role,
            mySeatIndex: mySeat,
            playerCount: currentLobby.maxPlayers,
            players: currentLobby.seats
              .filter((s) => s.connected)
              .map((s) => ({
                index: s.index,
                name: s.name,
                avatarColor: s.avatarColor,
              })),
            cardEightWild: currentLobby.cardEightWild,
            initialCardCount: currentLobby.initialCardCount || unoRoomManager.getInitialCardCount() || 7,
          });
          onClose();
        }
      } else if (s === 'error') {
        setErrorMessage('Connection failed. Please check the code and try again.');
      } else if (s === 'disconnected') {
        setErrorMessage('Disconnected from room.');
      }
    });

    const unsubLobby = unoRoomManager.onLobby((l) => {
      setLobby(l);
    });

    const unsubLatency = unoRoomManager.onLatency((lat) => {
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
    playClickSound(soundEnabled);
    setErrorMessage('');
    try {
      await unoRoomManager.createRoom(
        playerCount,
        playerName.trim() || 'Host',
        cardEightWild,
        initialCardCount
      );
    } catch (e: any) {
      setErrorMessage(e?.message || 'Failed to create room.');
    }
  };

  const handleJoinRoom = () => {
    playClickSound(soundEnabled);
    if (!roomCodeInput.trim()) {
      setErrorMessage('Please enter a 4-digit room code');
      return;
    }
    setErrorMessage('');
    unoRoomManager.joinRoom(roomCodeInput.trim(), playerName.trim() || 'Guest');
  };

  const handleCopyCode = async () => {
    playClickSound(soundEnabled);
    if (lobby?.roomCode) {
      try {
        await navigator.clipboard.writeText(lobby.roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {}
    }
  };

  const handleStartGame = () => {
    playClickSound(soundEnabled);
    unoRoomManager.startGameAsHost();
  };

  const handleCancel = () => {
    playClickSound(soundEnabled);
    unoRoomManager.cleanup();
    setStatus('idle');
    setLobby(null);
    setErrorMessage('');
  };

  const isHost = unoRoomManager.isHost();
  const connectedPlayersCount = lobby?.seats.filter((s) => s.connected).length || 0;
  const canHostStart = isHost && connectedPlayersCount >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 border border-purple-500/40 p-4 sm:p-5 shadow-2xl text-white select-none max-h-[92vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black font-orbitron tracking-wider text-purple-300">
                ONLINE ROOM
              </h2>
              <p className="text-[10px] text-slate-400">Play Uno with Friends Anywhere</p>
            </div>
          </div>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              handleCancel();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Name Input */}
        <div className="mt-3.5 space-y-1">
          <label className="text-[10px] font-orbitron font-bold text-slate-400">
            YOUR DISPLAY NAME
          </label>
          <input
            type="text"
            value={playerName}
            maxLength={14}
            disabled={status === 'lobby' || status === 'creating' || status === 'connecting'}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-orbitron focus:border-purple-400 focus:outline-none transition-colors disabled:opacity-60"
          />
        </div>

        {/* Not in room: Tabs to Create or Join */}
        {status === 'idle' && (
          <div className="mt-3 space-y-3">
            {/* Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  setActiveTab('create');
                }}
                className={`py-2 rounded-xl font-orbitron text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'create'
                    ? 'bg-purple-500/30 border border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                HOST ROOM
              </button>
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  setActiveTab('join');
                }}
                className={`py-2 rounded-xl font-orbitron text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'join'
                    ? 'bg-purple-500/30 border border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                JOIN ROOM
              </button>
            </div>

            {/* Create Tab */}
            {activeTab === 'create' ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-orbitron font-bold text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3 text-cyan-400" />
                    <span>ROOM CAPACITY</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          playClickSound(soundEnabled);
                          setPlayerCount(count as any);
                        }}
                        className={`py-2 rounded-xl border font-orbitron text-xs font-bold transition-all cursor-pointer ${
                          playerCount === count
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {count} PLAYERS
                      </button>
                    ))}
                  </div>
                </div>

                {/* Starting Cards Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-orbitron font-bold text-slate-400 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      <span>STARTING CARDS</span>
                    </span>
                    <span className="text-[10px] text-purple-300 font-mono font-bold">
                      {initialCardCount === 3
                        ? '⚡ 3 Cards (Blitz)'
                        : initialCardCount === 5
                        ? '🔥 5 Cards (Speed)'
                        : '🏆 7 Cards (Classic)'}
                    </span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { count: 3, label: '3 CARDS', tag: '⚡ Blitz' },
                      { count: 5, label: '5 CARDS', tag: '🔥 Speed' },
                      { count: 7, label: '7 CARDS', tag: '🏆 Classic' },
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => {
                          playClickSound(soundEnabled);
                          setInitialCardCount(item.count as any);
                        }}
                        className={`py-2 rounded-xl border font-orbitron text-xs font-bold transition-all cursor-pointer ${
                          initialCardCount === item.count
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div>{item.label}</div>
                        <div className="text-[9px] text-purple-400 font-bold mt-0.5">{item.tag}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
                  Creates a private 4-digit code. Share with friends on any phone or browser to duel in real-time!
                </div>

                <button
                  onClick={handleCreateRoom}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-slate-950 font-orbitron font-black text-xs tracking-wider cursor-pointer shadow-[0_0_12px_rgba(168,85,247,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>CREATE ROOM</span>
                </button>
              </div>
            ) : (
              /* Join Tab */
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-orbitron font-bold text-slate-400">
                    ENTER 4-DIGIT ROOM CODE
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={roomCodeInput}
                    onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. 4892"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-center font-orbitron font-bold text-base tracking-widest focus:border-cyan-400 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={handleJoinRoom}
                  disabled={!roomCodeInput.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-slate-950 font-orbitron font-black text-xs tracking-wider cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>JOIN ROOM</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* In Connecting / Creating state */}
        {(status === 'creating' || status === 'connecting') && (
          <div className="my-6 text-center space-y-3 py-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
            <p className="text-xs font-orbitron text-purple-300">
              {status === 'creating' ? 'GENERATING SECURE ROOM...' : 'CONNECTING TO ROOM...'}
            </p>
            <button
              onClick={handleCancel}
              className="text-[11px] text-slate-500 hover:text-red-400 underline cursor-pointer"
            >
              Cancel
            </button>
          </div>
        )}

        {/* In Lobby state */}
        {status === 'lobby' && lobby && (
          <div className="mt-3 space-y-3">
            {/* Room Code Card */}
            <div className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/50 text-center space-y-1.5 shadow-lg">
              <div className="text-[10px] font-orbitron font-bold text-purple-300 tracking-wider">
                ROOM CODE (SHARE WITH FRIENDS)
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-orbitron font-black text-2xl tracking-widest text-white">
                  {lobby.roomCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 border border-purple-400 text-purple-300 transition-colors cursor-pointer"
                  title="Copy code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && (
                <span className="text-[10px] text-emerald-400 font-mono">Code copied to clipboard!</span>
              )}
            </div>

            {/* Lobby Match Pace Info */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950/80 border border-purple-500/30 text-xs">
              <span className="text-slate-400 font-orbitron text-[10px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>MATCH RULES:</span>
              </span>
              <span className="font-orbitron font-bold text-purple-300 text-[11px]">
                {lobby.initialCardCount === 3
                  ? '⚡ 3 Cards (Blitz)'
                  : lobby.initialCardCount === 5
                  ? '🔥 5 Cards (Speed)'
                  : '🏆 7 Cards (Classic)'}
              </span>
            </div>

            {/* Players List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-orbitron font-bold text-slate-400">
                <span>PLAYERS ({connectedPlayersCount}/{lobby.maxPlayers})</span>
                {latency > 0 && <span className="text-emerald-400 font-mono">{latency}ms</span>}
              </div>
              <div className="space-y-1.5">
                {lobby.seats.map((seat) => (
                  <div
                    key={seat.index}
                    className={`flex items-center justify-between p-2 rounded-xl border ${
                      seat.connected
                        ? 'bg-slate-950 border-slate-700'
                        : 'bg-slate-950/40 border-dashed border-slate-800 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          seat.connected ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-700'
                        }`}
                      />
                      <span className="text-xs font-orbitron font-bold text-white">
                        {seat.name}
                      </span>
                    </div>
                    {seat.isHost ? (
                      <span className="flex items-center gap-1 text-[9px] font-orbitron font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <Crown className="w-3 h-3" /> HOST
                      </span>
                    ) : (
                      <span className="text-[9px] font-orbitron text-slate-400">
                        {seat.connected ? 'READY' : 'WAITING...'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 space-y-2">
              {isHost ? (
                <button
                  onClick={handleStartGame}
                  disabled={!canHostStart}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-orbitron font-black text-xs tracking-wider cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:brightness-110 active:scale-98 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {canHostStart
                      ? 'START MULTIPLAYER MATCH'
                      : 'WAITING FOR 2ND PLAYER...'}
                  </span>
                </button>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-center text-xs text-cyan-300 font-orbitron animate-pulse">
                  Waiting for Host to start match...
                </div>
              )}

              <button
                onClick={handleCancel}
                className="w-full py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-red-500/50 text-slate-400 hover:text-red-400 font-orbitron text-xs transition-colors cursor-pointer"
              >
                LEAVE ROOM
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
