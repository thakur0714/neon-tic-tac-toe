import Peer, { DataConnection } from 'peerjs';
import {
  UnoLobbyState,
  UnoOnlineSnapshot,
  UnoRoomMessage,
  UnoRoomStatus,
  UnoSeatInfo,
  UnoTablePosition,
} from '../types/uno';

const PREFIX = 'neon-uno-room-v1-';
const SEAT_COLORS = ['cyan', 'pink', 'amber', 'emerald'];

type Cb<T> = (v: T) => void;

class UnoRoomManager {
  private peer: Peer | null = null;
  private role: 'host' | 'client' | null = null;
  private status: UnoRoomStatus = 'idle';
  private roomCode = '';
  private maxPlayers = 2;
  private cardEightWild = true;
  private initialCardCount = 7;
  private locked = false;
  private myName = 'Player 1';
  private mySeatIndex: number | null = null;
  private myRejoinToken = '';

  // Host state
  private connByPeer = new Map<string, DataConnection>();
  private seatByPeer = new Map<string, number>();
  private nameBySeat = new Map<number, string>();
  private tokenBySeat = new Map<number, string>();

  // Client state
  private hostConn: DataConnection | null = null;

  // Ping / latency
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private latency = 0;

  // Listeners
  private statusCbs = new Set<Cb<UnoRoomStatus>>();
  private lobbyCbs = new Set<Cb<UnoLobbyState>>();
  private msgCbs = new Set<Cb<UnoRoomMessage>>();
  private latencyCbs = new Set<Cb<number>>();

  onStatus(cb: Cb<UnoRoomStatus>) {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }

  onLobby(cb: Cb<UnoLobbyState>) {
    this.lobbyCbs.add(cb);
    return () => this.lobbyCbs.delete(cb);
  }

  onMessage(cb: Cb<UnoRoomMessage>) {
    this.msgCbs.add(cb);
    return () => this.msgCbs.delete(cb);
  }

  onLatency(cb: Cb<number>) {
    this.latencyCbs.add(cb);
    return () => this.latencyCbs.delete(cb);
  }

  private emitStatus(s: UnoRoomStatus) {
    this.status = s;
    this.statusCbs.forEach((c) => c(s));
  }

  private emitLobby() {
    const l = this.getLobby();
    this.lobbyCbs.forEach((c) => c(l));
  }

  private emitMsg(m: UnoRoomMessage) {
    this.msgCbs.forEach((c) => c(m));
  }

  getStatus() {
    return this.status;
  }

  getRole() {
    return this.role;
  }

  getRoomCode() {
    return this.roomCode;
  }

  getMySeat() {
    return this.mySeatIndex;
  }

  getMaxPlayers() {
    return this.maxPlayers;
  }

  isHost() {
    return this.role === 'host';
  }

  getLatency() {
    return this.latency;
  }

  getInitialCardCount(): number {
    return this.initialCardCount;
  }

  getLobby(): UnoLobbyState {
    const seats: UnoSeatInfo[] = [];
    for (let i = 0; i < this.maxPlayers; i++) {
      if (i === 0) {
        seats.push({
          index: 0,
          name: this.role === 'host' ? this.myName : this.nameBySeat.get(0) || 'Host',
          connected: true,
          isHost: true,
          avatarColor: SEAT_COLORS[0],
        });
      } else {
        const name = this.nameBySeat.get(i);
        seats.push({
          index: i,
          name: name || 'Waiting…',
          connected: !!name,
          isHost: false,
          avatarColor: SEAT_COLORS[i % SEAT_COLORS.length],
        });
      }
    }
    return {
      seats,
      maxPlayers: this.maxPlayers,
      locked: this.locked,
      roomCode: this.roomCode,
      cardEightWild: this.cardEightWild,
      initialCardCount: this.initialCardCount,
    };
  }

  /**
   * Host creates a room
   */
  async createRoom(
    playerCount: 2 | 3 | 4,
    hostName: string,
    isEightWild = true,
    initialCardCount = 7
  ): Promise<string> {
    this.cleanup();
    this.role = 'host';
    this.maxPlayers = playerCount;
    this.cardEightWild = isEightWild;
    this.initialCardCount = initialCardCount;
    this.myName = hostName || 'Host';
    this.mySeatIndex = 0;
    this.nameBySeat.set(0, this.myName);
    this.emitStatus('creating');

    const code = `${Math.floor(1000 + Math.random() * 9000)}`;
    this.roomCode = code;

    this.peer = new Peer(`${PREFIX}${code}`, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    this.peer.on('open', () => {
      this.emitStatus('lobby');
      this.emitLobby();
    });

    this.peer.on('error', (err: any) => {
      if (err?.type === 'unavailable-id') {
        this.createRoom(playerCount, hostName, isEightWild);
        return;
      }
      this.emitStatus('error');
    });

    this.peer.on('connection', (conn) => this.hostAcceptConnection(conn));

    return code;
  }

  private freeSeatIndex(): number | null {
    for (let i = 1; i < this.maxPlayers; i++) {
      if (!this.nameBySeat.get(i)) return i;
    }
    return null;
  }

  private hostAcceptConnection(conn: DataConnection) {
    if (this.locked) {
      try {
        conn.on('open', () => {
          conn.send({ type: 'HOST_LEFT' });
          setTimeout(() => conn.close(), 50);
        });
      } catch {}
      return;
    }

    conn.on('open', () => {
      conn.on('data', (raw: any) => this.hostOnData(conn, raw));
    });
    conn.on('close', () => this.hostOnClose(conn));
    conn.on('error', () => this.hostOnClose(conn));
  }

  private hostOnData(conn: DataConnection, raw: any) {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as UnoRoomMessage;

    if (msg.type === 'PING') {
      this.safeSend(conn, { type: 'PONG', t: msg.t });
      return;
    }
    if (msg.type === 'PONG') {
      this.latency = Math.max(1, Date.now() - msg.t);
      this.latencyCbs.forEach((c) => c(this.latency));
      return;
    }

    if (msg.type === 'HELLO') {
      let seatIdx: number | null = null;
      if (msg.rejoinToken) {
        for (const [idx, tok] of this.tokenBySeat) {
          if (tok === msg.rejoinToken) {
            seatIdx = idx;
            break;
          }
        }
      }
      if (seatIdx === null) {
        if (this.locked) {
          this.safeSend(conn, { type: 'HOST_LEFT' });
          setTimeout(() => conn.close(), 50);
          return;
        }
        seatIdx = this.freeSeatIndex();
      }
      if (seatIdx === null) {
        this.safeSend(conn, { type: 'HOST_LEFT' });
        setTimeout(() => conn.close(), 50);
        return;
      }

      const token = this.tokenBySeat.get(seatIdx) || `${seatIdx}-${Math.random().toString(36).slice(2, 10)}`;
      this.tokenBySeat.set(seatIdx, token);
      this.seatByPeer.set(conn.peer, seatIdx);
      this.connByPeer.set(conn.peer, conn);
      this.nameBySeat.set(seatIdx, msg.name || `Player ${seatIdx + 1}`);

      this.safeSend(conn, { type: 'ASSIGN', seatIndex: seatIdx, rejoinToken: token });
      this.hostBroadcastLobby();
      this.emitLobby();
      return;
    }

    // Forward gameplay message to host listeners
    this.emitMsg(msg);
  }

  private hostOnClose(conn: DataConnection) {
    const seat = this.seatByPeer.get(conn.peer);
    this.connByPeer.delete(conn.peer);
    this.seatByPeer.delete(conn.peer);
    if (seat !== undefined && !this.locked) {
      this.nameBySeat.delete(seat);
      this.tokenBySeat.delete(seat);
      this.hostBroadcastLobby();
      this.emitLobby();
    }
  }

  private hostBroadcastLobby() {
    const l = this.getLobby();
    for (const c of this.connByPeer.values()) {
      this.safeSend(c, { type: 'LOBBY', lobby: l });
    }
  }

  hostBroadcast(msg: UnoRoomMessage) {
    for (const c of this.connByPeer.values()) {
      this.safeSend(c, msg);
    }
  }

  hostSendToSeat(seatIndex: number, msg: UnoRoomMessage) {
    for (const [peerId, seat] of this.seatByPeer.entries()) {
      if (seat === seatIndex) {
        const c = this.connByPeer.get(peerId);
        if (c) this.safeSend(c, msg);
        return;
      }
    }
  }

  startGameAsHost() {
    if (this.role !== 'host') return;
    this.locked = true;
    // Send START to clients first so their message listeners are armed
    // before the host's own status flips to 'playing' and synchronously
    // fires the initial STATE snapshot broadcast — otherwise that first
    // snapshot can be sent (and lost) before clients are listening for it.
    this.hostBroadcast({ type: 'START', initialCardCount: this.initialCardCount });
    this.emitStatus('playing');
    this.startPingLoop();
  }

  /**
   * Client joins a room
   */
  joinRoom(code: string, clientName: string, rejoinToken?: string) {
    this.cleanup();
    this.role = 'client';
    this.myName = clientName || 'Guest';
    this.roomCode = code.trim().toUpperCase();
    this.myRejoinToken = rejoinToken || '';
    this.emitStatus('connecting');

    this.peer = new Peer({
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

    this.peer.on('open', () => {
      const conn = this.peer!.connect(`${PREFIX}${this.roomCode}`, { reliable: true });
      this.hostConn = conn;

      conn.on('open', () => {
        this.safeSend(conn, {
          type: 'HELLO',
          name: this.myName,
          rejoinToken: this.myRejoinToken,
        });
      });

      conn.on('data', (raw: any) => this.clientOnData(raw));
      conn.on('close', () => this.emitStatus('disconnected'));
      conn.on('error', () => this.emitStatus('error'));
    });

    this.peer.on('error', () => this.emitStatus('error'));
  }

  private clientOnData(raw: any) {
    if (!raw || typeof raw !== 'object') return;
    const msg = raw as UnoRoomMessage;

    if (msg.type === 'PING') {
      if (this.hostConn) this.safeSend(this.hostConn, { type: 'PONG', t: msg.t });
      return;
    }
    if (msg.type === 'PONG') {
      this.latency = Math.max(1, Date.now() - msg.t);
      this.latencyCbs.forEach((c) => c(this.latency));
      return;
    }

    if (msg.type === 'ASSIGN') {
      this.mySeatIndex = msg.seatIndex;
      this.myRejoinToken = msg.rejoinToken;
      this.emitStatus('lobby');
      return;
    }

    if (msg.type === 'LOBBY') {
      this.maxPlayers = msg.lobby.maxPlayers;
      this.cardEightWild = msg.lobby.cardEightWild;
      if (msg.lobby.initialCardCount) {
        this.initialCardCount = msg.lobby.initialCardCount;
      }
      const mySeat = msg.lobby.seats.find((s) => s.index === this.mySeatIndex);
      if (mySeat) {
        this.nameBySeat.set(this.mySeatIndex!, mySeat.name);
      }
      this.emitLobby();
      return;
    }

    if (msg.type === 'START') {
      if (msg.initialCardCount) {
        this.initialCardCount = msg.initialCardCount;
      }
      this.emitStatus('playing');
      this.startPingLoop();
      this.emitMsg(msg);
      return;
    }

    if (msg.type === 'HOST_LEFT') {
      this.emitStatus('disconnected');
      return;
    }

    this.emitMsg(msg);
  }

  sendIntent(intent: {
    action: 'play' | 'draw' | 'call_uno' | 'choose_color';
    cardId?: string;
    chosenColor?: any;
  }) {
    if (this.mySeatIndex === null) return;
    const msg: UnoRoomMessage = {
      type: 'INTENT',
      seatIndex: this.mySeatIndex,
      action: intent.action,
      cardId: intent.cardId,
      chosenColor: intent.chosenColor,
    };

    if (this.role === 'host') {
      this.emitMsg(msg);
    } else if (this.hostConn && this.hostConn.open) {
      this.safeSend(this.hostConn, msg);
    }
  }

  /**
   * Client -> host: "I've loaded the dealt hand, ready for the shuffle
   * animation to play." Used to sync the shuffle screen across all players
   * instead of guessing a shared start time.
   */
  sendDealAck() {
    if (this.mySeatIndex === null) return;
    const msg: UnoRoomMessage = { type: 'DEAL_ACK', seatIndex: this.mySeatIndex };
    if (this.role === 'host') {
      this.emitMsg(msg);
    } else if (this.hostConn && this.hostConn.open) {
      this.safeSend(this.hostConn, msg);
    }
  }

  /** Host -> everyone: all seats are ready, start the shuffle animation now. */
  hostBroadcastDealGo() {
    if (this.role !== 'host') return;
    this.hostBroadcast({ type: 'DEAL_GO' });
  }

  /** Currently connected client seat indices (excludes the host's own seat 0). */
  getConnectedClientSeats(): number[] {
    return Array.from(this.seatByPeer.values());
  }

  private startPingLoop() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      const now = Date.now();
      if (this.role === 'host') {
        this.hostBroadcast({ type: 'PING', t: now });
      } else if (this.hostConn && this.hostConn.open) {
        this.safeSend(this.hostConn, { type: 'PING', t: now });
      }
    }, 4000);
  }

  private safeSend(conn: DataConnection, msg: any) {
    try {
      if (conn && conn.open) conn.send(msg);
    } catch {}
  }

  cleanup() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    try {
      if (this.role === 'host') {
        this.hostBroadcast({ type: 'HOST_LEFT' });
      }
      this.connByPeer.forEach((c) => c.close());
      this.connByPeer.clear();
      if (this.hostConn) {
        this.hostConn.close();
        this.hostConn = null;
      }
      if (this.peer) {
        this.peer.destroy();
        this.peer = null;
      }
    } catch {}

    this.role = null;
    this.status = 'idle';
    this.roomCode = '';
    this.locked = false;
    this.initialCardCount = 7;
    this.mySeatIndex = null;
    this.seatByPeer.clear();
    this.nameBySeat.clear();
    this.tokenBySeat.clear();
  }
}

export const unoRoomManager = new UnoRoomManager();
