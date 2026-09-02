import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Wifi,
  Crown,
  Users,
} from "lucide-react";
import { LudoColor } from "../../../types/ludo";
import { LUDO_COLOR_THEMES } from "../../../utils/ludoConstants";
import {
  ludoRoomManager,
  LudoRoomStatus,
  LudoLobbyState,
} from "../../../utils/ludoRoomManager";

export interface LudoOnlineStartInfo {
  role: "host" | "client";
  mySeat: LudoColor;
  seats: Array<{ color: LudoColor; name: string }>;
}

interface Props {
  open: boolean;
  playerCount: 2 | 3 | 4;
  onBack: () => void;
  onEnterGame: (info: LudoOnlineStartInfo) => void;
}

export const LudoOnlineModal: React.FC<Props> = ({
  open,
  playerCount,
  onBack,
  onEnterGame,
}) => {
  const [screen, setScreen] = useState<"choose" | "lobby">("choose");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [status, setStatus] = useState<LudoRoomStatus>("idle");
  const [lobby, setLobby] = useState<LudoLobbyState | null>(null);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const enteredRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    const unsubS = ludoRoomManager.onStatus((s) => {
      setStatus(s);
      if (s === "lobby" || s === "playing") setScreen("lobby");
      if (s === "error")
        setErr("Connection failed. Check the room code and try again.");
      if (s === "disconnected") setErr("Disconnected from room.");
    });
    const unsubL = ludoRoomManager.onLobby((l) => setLobby(l));
    return () => {
      unsubS();
      unsubL();
    };
  }, [open]);

  // Fire once the host starts the match.
  useEffect(() => {
    if (status !== "playing" || enteredRef.current) return;
    const seat = ludoRoomManager.getMySeat();
    const role = ludoRoomManager.getRole();
    const lob = ludoRoomManager.getLobby();
    if (!seat || !role) return;
    enteredRef.current = true;
    onEnterGame({
      role,
      mySeat: seat,
      seats: lob.seats
        .filter((s) => s.connected)
        .map((s) => ({ color: s.color, name: s.name })),
    });
  }, [status, onEnterGame]);

  if (!open) return null;

  const displayName = name.trim() || "Player";
  const isHost = ludoRoomManager.getRole() === "host";
  const connectedCount = lobby?.seats.filter((s) => s.connected).length ?? 0;
  const canStart = isHost && connectedCount >= 2;

  const createRoom = async () => {
    setErr("");
    await ludoRoomManager.createRoom(playerCount, displayName);
  };
  const joinRoom = async () => {
    setErr("");
    if (joinCode.trim().length < 3) {
      setErr("Enter the room code.");
      return;
    }
    let rejoin: string | undefined;
    try {
      const saved = JSON.parse(localStorage.getItem("ludo-rejoin") || "null");
      if (saved && saved.code === joinCode.trim()) rejoin = saved.token;
    } catch {
      /* noop */
    }
    await ludoRoomManager.joinRoom(joinCode.trim(), displayName, rejoin);
  };
  const leave = () => {
    ludoRoomManager.cleanup();
    enteredRef.current = false;
    setScreen("choose");
    onBack();
  };
  const copyCode = () => {
    if (!lobby) return;
    navigator.clipboard?.writeText(lobby.roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-slate-950 p-4 overflow-y-auto">
      <div className="w-full max-w-sm rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-[0_0_40px_rgba(6,182,212,0.25)] overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
          <button
            onClick={leave}
            className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] font-orbitron font-bold cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> BACK
          </button>
          <span className="flex items-center gap-1 text-[11px] font-orbitron font-bold text-cyan-300">
            <Wifi className="w-3.5 h-3.5" /> ONLINE · {playerCount}P
          </span>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {screen === "choose" && (
            <>
              <label className="text-[10px] font-orbitron font-bold uppercase tracking-widest text-slate-400">
                Your name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 14))}
                placeholder="Player"
                className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
              />

              <button
                onClick={createRoom}
                disabled={status === "creating"}
                className="mt-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-orbitron font-black text-sm tracking-wider flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 disabled:opacity-50"
              >
                {status === "creating" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                CREATE ROOM
              </button>

              <div className="flex items-center gap-2 text-slate-600 text-[10px] font-orbitron my-0.5">
                <span className="flex-1 h-px bg-slate-800" /> OR{" "}
                <span className="flex-1 h-px bg-slate-800" />
              </div>

              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={(e) =>
                    setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  placeholder="Room code"
                  inputMode="numeric"
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400 tracking-widest font-orbitron"
                />
                <button
                  onClick={joinRoom}
                  disabled={status === "connecting"}
                  className="px-4 rounded-lg bg-slate-800 border border-slate-600 text-white font-orbitron font-bold text-xs cursor-pointer hover:bg-slate-700 disabled:opacity-50"
                >
                  {status === "connecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "JOIN"
                  )}
                </button>
              </div>
            </>
          )}

          {screen === "lobby" && lobby && (
            <>
              {isHost && (
                <button
                  onClick={copyCode}
                  className="self-center flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 border border-cyan-500/50 cursor-pointer"
                >
                  <span className="font-orbitron font-black text-2xl tracking-[0.3em] text-cyan-300">
                    {lobby.roomCode}
                  </span>
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-slate-400" />
                  )}
                </button>
              )}

              <div className="flex items-center gap-1.5 text-[10px] font-orbitron font-bold uppercase tracking-widest text-slate-400">
                <Users className="w-3.5 h-3.5" /> Players {connectedCount}/
                {lobby.maxPlayers}
              </div>

              <div className="flex flex-col gap-1.5">
                {lobby.seats.map((s) => {
                  const ct = LUDO_COLOR_THEMES[s.color];
                  return (
                    <div
                      key={s.color}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border bg-slate-950/60"
                      style={{
                        borderColor: s.connected ? ct.neonBorder : "#334155",
                      }}
                    >
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: ct.neonColor,
                          boxShadow: s.connected
                            ? `0 0 8px ${ct.neonColor}`
                            : "none",
                          opacity: s.connected ? 1 : 0.3,
                        }}
                      />
                      <span
                        className={`text-sm font-bold ${s.connected ? "text-white" : "text-slate-500"}`}
                      >
                        {s.name}
                      </span>
                      {s.isHost && (
                        <Crown className="w-3.5 h-3.5 text-amber-400 ml-auto" />
                      )}
                      {!s.connected && (
                        <span className="ml-auto text-[10px] text-slate-600 font-orbitron">
                          EMPTY
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {isHost ? (
                <button
                  onClick={() => ludoRoomManager.startGame()}
                  disabled={!canStart}
                  className="mt-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-orbitron font-black text-sm tracking-wider cursor-pointer hover:brightness-110 disabled:opacity-40"
                >
                  {canStart ? "START GAME" : "WAITING FOR PLAYERS…"}
                </button>
              ) : (
                <p className="text-center text-[11px] text-slate-400 font-orbitron flex items-center justify-center gap-2 py-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for
                  host to start…
                </p>
              )}
            </>
          )}

          {err && <p className="text-[11px] text-red-400 text-center">{err}</p>}
        </div>
      </div>
    </div>
  );
};
