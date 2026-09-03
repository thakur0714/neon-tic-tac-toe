import Peer, { DataConnection } from 'peerjs';
import {
  CarromGameMode,
  CarromLobbyState,
  CarromRoomMessage,
  CarromRoomStatus,
  CarromSeatInfo,
  CarromSnapshot,
  ShotIntent,
} from '../types/carrom';

const PREFIX = 'carrom-duel-v1-';
type Cb<T> = (v: T) => void;

class CarromRoomManager {
  private peer: Peer | null = null;
  private role: 'host' | 'client' | null = null;
  private status: CarromRoomStatus = 'idle';
  private roomCode = '';
  private gameMode: CarromGameMode = 'disc-pool';
  private myName = 'Player 1';
  private mySeat: 'player1' | 'player2' | null = null;
  private opponentName = 'Player 2';
  private myRejoinToken = '';

  // Host: connection to client
  private clientConn: DataConnection | null = null;
  // Client: connection to host
  private hostConn: DataConnection | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private latency = 0;

  private statusCbs = new Set<Cb<CarromRoomStatus>>();
  private lobbyCbs = new Set<Cb<CarromLobbyState>>();
  private msgCbs = new Set<Cb<CarromRoomMessage>>();
  private latencyCbs = new Set<Cb<number>>();

  onStatus(cb: Cb<CarromRoomStatus>) {
    this.statusCbs.add(cb);
    return () => this.statusCbs.delete(cb);
  }
  onLobby(cb: Cb<CarromLobbyState>) {
    this.lobbyCbs.add(cb);
    return () => this.lobbyCbs.delete(cb);
  }
  onMessage(cb: Cb<CarromRoomMessage>) {
    this.msgCbs.add(cb);
    return () => this.msgCbs.delete(cb);
  }
  onLatency(cb: Cb<number>) {
    this.latencyCbs.add(cb);
    return () => this.latencyCbs.delete(cb);
  }

  private emitStatus(s: CarromRoomStatus) {
    this.status = s;
    this.statusCbs.forEach((c) => c(s));
  }
  private emitLobby() {
    const l = this.getLobby();
    this.lobbyCbs.forEach((c) => c(l));
  }
  private emitMsg(m: CarromRoomMessage) {
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
    return this.mySeat;
  }
  getOpponentName() {
    return this.opponentName;
  }
  isHost() {
    return this.role === 'host';
  }
  getLatency() {
    return this.latency;
  }
  isConnected() {
    if (this.role === 'host') {
      return (this.status === 'lobby' || this.status === 'playing') && !!this.clientConn;
    }
    return !!this.hostConn && this.hostConn.open;
  }

  getLobby(): CarromLobbyState {
    const seats: CarromSeatInfo[] = [
      {
        seat: 'player1',
        name: this.role === 'host' ? this.myName : this.opponentName,
        connected: true,
        isHost: true,
        assignedType: 'white',
      },
      {
        seat: 'player2',
        name:
          this.role === 'client'
            ? this.myName
            : this.clientConn
            ? this.opponentName
            : 'Waiting for opponent…',
        connected: this.role === 'client' ? true : !!this.clientConn,
        isHost: false,
        assignedType: 'black',
      },
    ];

    return {
      roomCode: this.roomCode,
      seats,
      ready: this.role === 'host' ? !!this.clientConn : true,
      gameMode: this.gameMode,
    };
  }

  // ── Host Flow ──────────────────────────────────────────────────
  async createRoom(hostName: string, mode: CarromGameMode = 'disc-pool'): Promise<string> {
    this.cleanup();
    this.role = 'host';
    this.myName = hostName || 'Player 1';
    this.mySeat = 'player1';
    this.gameMode = mode;
    this.myRejoinToken = Math.random().toString(36).slice(2, 10);
    this.emitStatus('creating');

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.roomCode = code;
    const peerId = `${PREFIX}${code}`;

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer(peerId, { debug: 0 });
        this.peer = peer;

        peer.on('open', () => {
          this.emitStatus('lobby');
          this.emitLobby();
          resolve(code);
        });

        peer.on('connection', (conn) => {
          if (this.clientConn && this.clientConn.open) {
            // Room is full for 1v1
            conn.close();
            return;
          }

          this.clientConn = conn;
          conn.on('open', () => {
            conn.send({ type: 'LOBBY', lobby: this.getLobby() } as CarromRoomMessage);
          });

          conn.on('data', (raw: unknown) => {
            const msg = raw as CarromRoomMessage;
            this.handleHostMessage(conn, msg);
          });

          conn.on('close', () => {
            if (this.clientConn === conn) {
              this.clientConn = null;
              this.opponentName = 'Player 2';
              this.emitLobby();
            }
          });
        });

        peer.on('error', (err) => {
          this.emitStatus('error');
          reject(err);
        });
      } catch (err) {
        this.emitStatus('error');
        reject(err);
      }
    });
  }

  private handleHostMessage(conn: DataConnection, msg: CarromRoomMessage) {
    if (msg.type === 'HELLO') {
      this.opponentName = msg.name || 'Opponent';
      conn.send({
        type: 'ASSIGN',
        seat: 'player2',
        assignedType: 'black',
        rejoinToken: Math.random().toString(36).slice(2, 10),
      } as CarromRoomMessage);
      this.emitLobby();
      return;
    }

    if (msg.type === 'PING') {
      conn.send({ type: 'PONG', t: msg.t } as CarromRoomMessage);
      return;
    }

    if (msg.type === 'PONG') {
      this.latency = Math.max(1, Math.round((Date.now() - msg.t) / 2));
      this.latencyCbs.forEach((c) => c(this.latency));
      return;
    }

    // Forward game messages to internal subscribers
    this.emitMsg(msg);
  }

  startGame() {
    if (this.role !== 'host') return;
    this.emitStatus('playing');
    this.broadcast({ type: 'START' });
    this.startPingLoop();
  }

  // ── Client Flow ────────────────────────────────────────────────
  async joinRoom(roomCode: string, playerName: string): Promise<void> {
    this.cleanup();
    const cleanCode = roomCode.trim();
    this.roomCode = cleanCode;
    this.role = 'client';
    this.myName = playerName || 'Player 2';
    this.mySeat = 'player2';
    this.emitStatus('connecting');

    const hostPeerId = `${PREFIX}${cleanCode}`;

    return new Promise((resolve, reject) => {
      try {
        const peer = new Peer({ debug: 0 });
        this.peer = peer;

        peer.on('open', () => {
          const conn = peer.connect(hostPeerId, { reliable: true });
          this.hostConn = conn;

          conn.on('open', () => {
            this.emitStatus('lobby');
            conn.send({
              type: 'HELLO',
              name: this.myName,
              rejoinToken: this.myRejoinToken,
            } as CarromRoomMessage);
            resolve();
          });

          conn.on('data', (raw: unknown) => {
            const msg = raw as CarromRoomMessage;
            this.handleClientMessage(msg);
          });

          conn.on('close', () => {
            this.emitStatus('disconnected');
            this.emitMsg({ type: 'HOST_LEFT' });
          });
        });

        peer.on('error', (err) => {
          this.emitStatus('error');
          reject(err);
        });
      } catch (err) {
        this.emitStatus('error');
        reject(err);
      }
    });
  }

  private handleClientMessage(msg: CarromRoomMessage) {
    if (msg.type === 'LOBBY') {
      this.gameMode = msg.lobby.gameMode;
      const hostSeat = msg.lobby.seats.find((s) => s.isHost);
      if (hostSeat) this.opponentName = hostSeat.name;
      this.lobbyCbs.forEach((c) => c(msg.lobby));
      return;
    }

    if (msg.type === 'ASSIGN') {
      this.mySeat = msg.seat;
      this.myRejoinToken = msg.rejoinToken;
      return;
    }

    if (msg.type === 'START') {
      this.emitStatus('playing');
      this.startPingLoop();
    }

    if (msg.type === 'PING') {
      this.sendToHost({ type: 'PONG', t: msg.t });
      return;
    }

    if (msg.type === 'PONG') {
      this.latency = Math.max(1, Math.round((Date.now() - msg.t) / 2));
      this.latencyCbs.forEach((c) => c(this.latency));
      return;
    }

    this.emitMsg(msg);
  }

  // ── Network Operations ──────────────────────────────────────────
  sendStrikeAction(intent: ShotIntent) {
    const seat = this.mySeat || 'player1';
    const msg: CarromRoomMessage = { type: 'STRIKE_ACTION', intent, seat };
    if (this.role === 'host') {
      this.broadcast(msg);
    } else {
      this.sendToHost(msg);
    }
  }

  sendStateSync(snapshot: CarromSnapshot) {
    if (this.role !== 'host') return;
    this.broadcast({ type: 'SYNC_STATE', snapshot });
  }

  sendRematchReq() {
    const msg: CarromRoomMessage = { type: 'REMATCH_REQ' };
    if (this.role === 'host') this.broadcast(msg);
    else this.sendToHost(msg);
  }

  sendRematchAccept() {
    const msg: CarromRoomMessage = { type: 'REMATCH_ACCEPT' };
    if (this.role === 'host') this.broadcast(msg);
    else this.sendToHost(msg);
  }

  private broadcast(msg: CarromRoomMessage) {
    if (this.clientConn && this.clientConn.open) {
      try {
        this.clientConn.send(msg);
      } catch {}
    }
  }

  private sendToHost(msg: CarromRoomMessage) {
    if (this.hostConn && this.hostConn.open) {
      try {
        this.hostConn.send(msg);
      } catch {}
    }
  }

  private startPingLoop() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      const now = Date.now();
      if (this.role === 'host' && this.clientConn && this.clientConn.open) {
        this.clientConn.send({ type: 'PING', t: now } as CarromRoomMessage);
      } else if (this.role === 'client' && this.hostConn && this.hostConn.open) {
        this.hostConn.send({ type: 'PING', t: now } as CarromRoomMessage);
      }
    }, 2500);
  }

  cleanup() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.clientConn) {
      try {
        this.clientConn.close();
      } catch {}
      this.clientConn = null;
    }
    if (this.hostConn) {
      try {
        this.hostConn.close();
      } catch {}
      this.hostConn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.status = 'idle';
    this.role = null;
    this.mySeat = null;
    this.roomCode = '';
  }
}

export const carromRoomManager = new CarromRoomManager();
