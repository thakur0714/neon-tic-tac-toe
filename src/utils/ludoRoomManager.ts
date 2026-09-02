import Peer, { DataConnection } from 'peerjs';
import { LudoColor, LudoPlayer } from '../types/ludo';
import { SEATS_FOR_COUNT } from './ludoSetup';

/**
 * Multi-peer room manager for online Ludo (2–4 players), star topology.
 *
 *   client ─┐
 *   client ─┼──▶  HOST  ──▶ re-broadcast to every client
 *   client ─┘
 *
 * The host is the single source of truth: it runs the game rules and pushes a
 * full snapshot (`STATE`) after every change. Clients send `INTENT` messages and
 * otherwise just render what they receive. This is a standalone module — it does
 * NOT touch `peerManager` (which still serves TicTacToe / Connect4 as 1v1).
 */

export type LudoRoomStatus =
  | 'idle'
  | 'creating'
  | 'lobby' // room open, waiting for players
  | 'connecting'
  | 'playing' // host pressed start, room locked
  | 'disconnected'
  | 'error';

export type LudoRoomRole = 'host' | 'client' | null;

export interface LudoSeatInfo {
  color: LudoColor;
  name: string;
  connected: boolean;
  isHost: boolean;
}

export interface LudoLobbyState {
  seats: LudoSeatInfo[]; // only the active seats for this room's player count
  maxPlayers: number;
  locked: boolean;
  roomCode: string;
}

export interface LudoSnapshot {
  players: LudoPlayer[];
  currentTurnColor: LudoColor;
  turnState: string;
  diceValue: number | null;
  consecutiveSixes: number;
  selectableTokenIds: number[];
  statusText: string;
  statusType: string;
  winnerColor?: LudoColor | null;
}

export type LudoRoomMessage =
  | { type: 'HELLO'; name: string; rejoinToken?: string }
  | { type: 'LOBBY'; lobby: LudoLobbyState }
  | { type: 'ASSIGN'; seat: LudoColor; rejoinToken: string }
  | { type: 'START' }
  | { type: 'STATE'; snapshot: LudoSnapshot }
  | { type: 'INTENT'; action: 'roll' | 'move'; seat: LudoColor; tokenId?: number }
  | { type: 'REMATCH_LOBBY' }
  | { type: 'HOST_LEFT' }
  | { type: 'PING'; t: number }
  | { type: 'PONG'; t: number };

type Cb<T> = (v: T) => void;

const PREFIX = 'neon-ludo-room-v1-';
const JOIN_ORDER: LudoColor[] = ['red', 'green', 'yellow', 'blue'];

class LudoRoomManager {
  private peer: Peer | null = null;
  private role: LudoRoomRole = null;
  private status: LudoRoomStatus = 'idle';
  private roomCode = '';
  private maxPlayers = 2;
  private locked = false;
  private myName = 'Player';
  private mySeat: LudoColor | null = null;
  private myRejoinToken = '';

  // host: peerId -> seat ; and reverse for names/connection
  private connByPeer = new Map<string, DataConnection>();
  private seatByPeer = new Map<string, LudoColor>();
  private nameBySeat = new Map<LudoColor, string>();
  private tokenBySeat = new Map<LudoColor, string>();
  // client: single connection to host
  private hostConn: DataConnection | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private latency = 0;

  private statusCbs = new Set<Cb<LudoRoomStatus>>();
  private lobbyCbs = new Set<Cb<LudoLobbyState>>();
  private msgCbs = new Set<Cb<LudoRoomMessage>>();
  private latencyCbs = new Set<Cb<number>>();

  // ── subscriptions ──────────────────────────────────────────────
  onStatus(cb: Cb<LudoRoomStatus>) { this.statusCbs.add(cb); return () => this.statusCbs.delete(cb); }
  onLobby(cb: Cb<LudoLobbyState>) { this.lobbyCbs.add(cb); return () => this.lobbyCbs.delete(cb); }
  onMessage(cb: Cb<LudoRoomMessage>) { this.msgCbs.add(cb); return () => this.msgCbs.delete(cb); }
  onLatency(cb: Cb<number>) { this.latencyCbs.add(cb); return () => this.latencyCbs.delete(cb); }

  private emitStatus(s: LudoRoomStatus) { this.status = s; this.statusCbs.forEach((c) => c(s)); }
  private emitLobby() { const l = this.getLobby(); this.lobbyCbs.forEach((c) => c(l)); }
  private emitMsg(m: LudoRoomMessage) { this.msgCbs.forEach((c) => c(m)); }

  // ── getters ────────────────────────────────────────────────────
  getStatus() { return this.status; }
  getRole() { return this.role; }
  getRoomCode() { return this.roomCode; }
  getMySeat() { return this.mySeat; }
  getMaxPlayers() { return this.maxPlayers; }
  isHost() { return this.role === 'host'; }
  isLocked() { return this.locked; }
  getLatency() { return this.latency; }
  isConnected() {
    if (this.role === 'host') return this.status === 'lobby' || this.status === 'playing';
    return !!this.hostConn && this.hostConn.open;
  }

  private activeColors(): LudoColor[] {
    return SEATS_FOR_COUNT[this.maxPlayers as 2 | 3 | 4] ?? JOIN_ORDER;
  }

  getLobby(): LudoLobbyState {
    const active = this.activeColors();
    const seats: LudoSeatInfo[] = active.map((color) => {
      if (color === 'red') {
        return { color, name: this.role === 'host' ? this.myName : this.nameBySeat.get('red') || 'Host', connected: true, isHost: true };
      }
      const name = this.nameBySeat.get(color);
      return { color, name: name || 'Waiting…', connected: !!name, isHost: false };
    });
    return { seats, maxPlayers: this.maxPlayers, locked: this.locked, roomCode: this.roomCode };
  }

  // ── host ───────────────────────────────────────────────────────
  async createRoom(playerCount: 2 | 3 | 4, hostName: string): Promise<string> {
    this.cleanup();
    this.role = 'host';
    this.maxPlayers = playerCount;
    this.myName = hostName || 'Host';
    this.mySeat = 'red';
    this.nameBySeat.set('red', this.myName);
    this.emitStatus('creating');

    const code = `${Math.floor(1000 + Math.random() * 9000)}`;
    this.roomCode = code;

    this.peer = new Peer(`${PREFIX}${code}`, { debug: 0, config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ] } });

    this.peer.on('open', () => { this.emitStatus('lobby'); this.emitLobby(); });
    this.peer.on('error', (err: any) => {
      if (err?.type === 'unavailable-id') { this.createRoom(playerCount, hostName); return; }
      this.emitStatus('error');
    });
    this.peer.on('connection', (conn) => this.hostAcceptConnection(conn));

    return code;
  }

  private freeSeat(): LudoColor | null {
    for (const c of this.activeColors()) {
      if (c === 'red') continue;
      if (!this.nameBySeat.get(c)) return c;
    }
    return null;
  }

  private hostAcceptConnection(conn: DataConnection) {
    const reject = (why: string) => {
      try { conn.on('open', () => { conn.send({ type: 'HOST_LEFT' }); setTimeout(() => conn.close(), 50); }); } catch { /* noop */ }
      void why;
    };
    if (this.locked) return reject('locked');

    conn.on('open', () => {
      // wait for HELLO to learn the name / rejoin token before assigning
      conn.on('data', (raw: any) => this.hostOnData(conn, raw));
    });
    conn.on('close', () => this.hostOnClose(conn));
    conn.on('error', () => this.hostOnClose(conn));
  }

  private hostOnData(conn: DataConnection, raw: any) {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as LudoRoomMessage;

    if (msg.type === 'PING') { this.safeSend(conn, { type: 'PONG', t: msg.t }); return; }
    if (msg.type === 'PONG') { this.latency = Math.max(1, Date.now() - msg.t); this.latencyCbs.forEach((c) => c(this.latency)); return; }

    if (msg.type === 'HELLO') {
      // rejoin to an existing seat?
      let seat: LudoColor | null = null;
      if (msg.rejoinToken) {
        for (const [s, tok] of this.tokenBySeat) if (tok === msg.rejoinToken) { seat = s; break; }
      }
      if (!seat) {
        if (this.locked) { this.safeSend(conn, { type: 'HOST_LEFT' }); setTimeout(() => conn.close(), 50); return; }
        seat = this.freeSeat();
      }
      if (!seat) { this.safeSend(conn, { type: 'HOST_LEFT' }); setTimeout(() => conn.close(), 50); return; }

      const token = this.tokenBySeat.get(seat) || `${seat}-${Math.random().toString(36).slice(2, 10)}`;
      this.tokenBySeat.set(seat, token);
      this.nameBySeat.set(seat, msg.name || seat);
      this.connByPeer.set(conn.peer, conn);
      this.seatByPeer.set(conn.peer, seat);

      this.safeSend(conn, { type: 'ASSIGN', seat, rejoinToken: token });
      this.broadcastLobby();
      this.emitLobby();
      this.emitMsg(msg); // let the game notify "X joined"
      return;
    }

    if (msg.type === 'INTENT') {
      this.emitMsg(msg); // host game logic handles + will call pushState()
      return;
    }
  }

  private hostOnClose(conn: DataConnection) {
    const seat = this.seatByPeer.get(conn.peer);
    this.connByPeer.delete(conn.peer);
    this.seatByPeer.delete(conn.peer);
    if (seat) {
      this.nameBySeat.delete(seat);
      // keep tokenBySeat so the same player can rejoin their seat
      this.broadcastLobby();
      this.emitLobby();
      this.emitMsg({ type: 'HELLO', name: `__left__:${seat}` }); // signal leave to game
    }
  }

  private broadcastLobby() {
    const lobby = this.getLobby();
    for (const conn of this.connByPeer.values()) this.safeSend(conn, { type: 'LOBBY', lobby });
  }

  /** Host: begin the match, lock the room. */
  startGame() {
    if (this.role !== 'host') return;
    this.locked = true;
    this.emitStatus('playing');
    for (const conn of this.connByPeer.values()) this.safeSend(conn, { type: 'START' });
    this.broadcastLobby();
    this.emitLobby();
  }

  /** Host: after a win, reopen the lobby for the next match. */
  reopenLobby() {
    if (this.role !== 'host') return;
    this.locked = false;
    this.emitStatus('lobby');
    for (const conn of this.connByPeer.values()) this.safeSend(conn, { type: 'REMATCH_LOBBY' });
    this.broadcastLobby();
    this.emitLobby();
  }

  /** Host: push the authoritative snapshot to all clients. */
  pushState(snapshot: LudoSnapshot) {
    if (this.role !== 'host') return;
    for (const conn of this.connByPeer.values()) this.safeSend(conn, { type: 'STATE', snapshot });
  }

  // ── client ─────────────────────────────────────────────────────
  async joinRoom(code: string, name: string, rejoinToken?: string): Promise<void> {
    this.cleanup();
    this.role = 'client';
    this.myName = name || 'Player';
    this.roomCode = code.trim();
    this.myRejoinToken = rejoinToken || '';
    this.emitStatus('connecting');

    this.peer = new Peer({ debug: 0, config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ] } });

    this.peer.on('open', () => {
      if (!this.peer) return;
      const conn = this.peer.connect(`${PREFIX}${this.roomCode}`, { reliable: true });
      this.hostConn = conn;
      conn.on('open', () => {
        this.startHeartbeat();
        this.safeSend(conn, { type: 'HELLO', name: this.myName, rejoinToken: this.myRejoinToken || undefined });
      });
      conn.on('data', (raw: any) => this.clientOnData(raw));
      conn.on('close', () => { this.stopHeartbeat(); this.emitStatus('disconnected'); });
      conn.on('error', () => { this.stopHeartbeat(); this.emitStatus('error'); });
    });
    this.peer.on('error', () => this.emitStatus('error'));
  }

  private clientOnData(raw: any) {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as LudoRoomMessage;

    if (msg.type === 'PING') { if (this.hostConn) this.safeSend(this.hostConn, { type: 'PONG', t: msg.t }); return; }
    if (msg.type === 'PONG') { this.latency = Math.max(1, Date.now() - msg.t); this.latencyCbs.forEach((c) => c(this.latency)); return; }

    if (msg.type === 'ASSIGN') {
      this.mySeat = msg.seat;
      this.myRejoinToken = msg.rejoinToken;
      try { localStorage.setItem('ludo-rejoin', JSON.stringify({ code: this.roomCode, token: msg.rejoinToken, seat: msg.seat })); } catch { /* noop */ }
      this.emitStatus('lobby');
    } else if (msg.type === 'LOBBY') {
      this.maxPlayers = msg.lobby.maxPlayers;
      this.locked = msg.lobby.locked;
      msg.lobby.seats.forEach((s) => { if (s.connected) this.nameBySeat.set(s.color, s.name); else this.nameBySeat.delete(s.color); });
      this.lobbyCbs.forEach((c) => c(msg.lobby));
    } else if (msg.type === 'START') {
      this.locked = true;
      this.emitStatus('playing');
    } else if (msg.type === 'REMATCH_LOBBY') {
      this.locked = false;
      this.emitStatus('lobby');
    } else if (msg.type === 'HOST_LEFT') {
      this.emitStatus('disconnected');
    }

    this.emitMsg(msg);
  }

  /** Client: send my intent to the host. */
  sendIntent(action: 'roll' | 'move', tokenId?: number) {
    if (this.role !== 'client' || !this.hostConn || !this.mySeat) return;
    this.safeSend(this.hostConn, { type: 'INTENT', action, seat: this.mySeat, tokenId });
  }

  // ── shared ─────────────────────────────────────────────────────
  private safeSend(conn: DataConnection, msg: LudoRoomMessage) {
    try { if (conn.open) conn.send(msg); } catch { /* noop */ }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.hostConn?.open) this.safeSend(this.hostConn, { type: 'PING', t: Date.now() });
    }, 4000);
  }
  private stopHeartbeat() { if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; } }

  cleanup() {
    this.stopHeartbeat();
    if (this.role === 'host') {
      for (const conn of this.connByPeer.values()) {
        this.safeSend(conn, { type: 'HOST_LEFT' });
        try { conn.close(); } catch { /* noop */ }
      }
    } else if (this.hostConn) {
      try { this.hostConn.close(); } catch { /* noop */ }
    }
    try { this.peer?.destroy(); } catch { /* noop */ }
    this.peer = null;
    this.hostConn = null;
    this.connByPeer.clear();
    this.seatByPeer.clear();
    this.nameBySeat.clear();
    this.tokenBySeat.clear();
    this.role = null;
    this.mySeat = null;
    this.roomCode = '';
    this.locked = false;
    this.latency = 0;
    this.emitStatus('idle');
  }
}

export const ludoRoomManager = new LudoRoomManager();
