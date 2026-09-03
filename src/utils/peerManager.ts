import Peer, { DataConnection } from 'peerjs';
import { MultiplayerGameType, MultiplayerMessage, MultiplayerRole, MultiplayerStatus } from '../types';

type MessageCallback = (msg: MultiplayerMessage) => void;
type StatusCallback = (status: MultiplayerStatus, detail?: string) => void;
type LatencyCallback = (ms: number) => void;

class PeerManager {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private role: MultiplayerRole = null;
  private roomCode: string = '';
  private status: MultiplayerStatus = 'idle';
  private gameType: MultiplayerGameType = 'tictactoe';
  private pingInterval: any = null;
  private lastPingTime: number = 0;
  private lastPongTime: number = 0;
  private latency: number = 0;
  private readonly PONG_TIMEOUT_MS = 12000;

  private onMessageCallbacks: Set<MessageCallback> = new Set();
  private onStatusCallbacks: Set<StatusCallback> = new Set();
  private onLatencyCallbacks: Set<LatencyCallback> = new Set();

  private readonly PEER_PREFIX = 'neon-arcade-v2-';

  public getStatus(): MultiplayerStatus {
    return this.status;
  }

  public getRole(): MultiplayerRole {
    return this.role;
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getGameType(): MultiplayerGameType {
    return this.gameType;
  }

  public getLatency(): number {
    return this.latency;
  }

  public isConnected(): boolean {
    return this.status === 'connected' && this.conn !== null && this.conn.open;
  }

  public onMessage(cb: MessageCallback) {
    this.onMessageCallbacks.add(cb);
    return () => {
      this.onMessageCallbacks.delete(cb);
    };
  }

  public onStatus(cb: StatusCallback) {
    this.onStatusCallbacks.add(cb);
    return () => {
      this.onStatusCallbacks.delete(cb);
    };
  }

  public onLatency(cb: LatencyCallback) {
    this.onLatencyCallbacks.add(cb);
    return () => {
      this.onLatencyCallbacks.delete(cb);
    };
  }

  private setStatus(status: MultiplayerStatus, detail?: string) {
    this.status = status;
    this.onStatusCallbacks.forEach((cb) => cb(status, detail));
  }

  public generateRoomCode(): string {
    // Generate a clean 4-digit code e.g. 7482
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${num}`;
  }

  /**
   * Host creates a new room
   */
  public async createRoom(gameType: MultiplayerGameType = 'tictactoe'): Promise<string> {
    this.cleanup();
    this.role = 'host';
    this.gameType = gameType;
    this.setStatus('creating');

    const code = this.generateRoomCode();
    this.roomCode = code;
    const peerId = `${this.PEER_PREFIX}${code}`;

    try {
      this.peer = new Peer(peerId, {
        debug: 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        this.setStatus('waiting');
      });

      this.peer.on('connection', (connection) => {
        if (this.conn) {
          // If already connected to another player, close extra connections
          connection.close();
          return;
        }
        this.setupConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.warn('Peer host error:', err);
        // If code already taken, retry with another code
        if (err.type === 'unavailable-id') {
          this.createRoom(gameType);
        } else {
          this.setStatus('error', err.message || 'Connection error');
        }
      });

      this.peer.on('disconnected', () => {
        if (this.status !== 'connected') {
          this.peer?.reconnect();
        }
      });

      return code;
    } catch (err: any) {
      this.setStatus('error', err?.message || 'Failed to create peer');
      throw err;
    }
  }

  /**
   * Client joins an existing room by code
   */
  public async joinRoom(code: string, gameType: MultiplayerGameType = 'tictactoe'): Promise<void> {
    this.cleanup();
    const cleanCode = code.trim().replace(/^CYB-?/i, '');
    this.role = 'client';
    this.roomCode = cleanCode;
    this.gameType = gameType;
    this.setStatus('connecting');

    const hostPeerId = `${this.PEER_PREFIX}${cleanCode}`;

    try {
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
        if (!this.peer) return;
        const connection = this.peer.connect(hostPeerId, {
          reliable: true,
        });
        this.setupConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.warn('Peer client error:', err);
        this.setStatus('error', 'Room not found or host offline');
      });
    } catch (err: any) {
      this.setStatus('error', err?.message || 'Failed to join peer');
      throw err;
    }
  }

  private setupConnection(connection: DataConnection) {
    this.conn = connection;

    this.conn.on('open', () => {
      this.setStatus('connected');
      this.startHeartbeat();

      // Handshake
      this.sendMessage({
        type: 'HANDSHAKE',
        gameType: this.gameType,
        timestamp: Date.now(),
      });
    });

    this.conn.on('data', (data: any) => {
      if (!data || typeof data !== 'object') return;
      const msg = data as MultiplayerMessage;

      if (msg.type === 'PING') {
        this.sendMessage({ type: 'PONG', timestamp: msg.timestamp });
        return;
      }

      if (msg.type === 'PONG') {
        this.lastPongTime = Date.now();
        if (msg.timestamp) {
          this.latency = Math.max(1, Math.round(Date.now() - msg.timestamp));
          this.onLatencyCallbacks.forEach((cb) => cb(this.latency));
        }
        return;
      }

      // Notify listeners
      this.onMessageCallbacks.forEach((cb) => cb(msg));
    });

    this.conn.on('close', () => {
      this.setStatus('disconnected', 'Opponent disconnected');
      this.stopHeartbeat();
    });

    this.conn.on('error', (err) => {
      console.warn('Connection error:', err);
      this.setStatus('error', 'Connection lost');
      this.stopHeartbeat();
    });
  }

  public sendMessage(msg: MultiplayerMessage): boolean {
    if (!this.conn || !this.conn.open) return false;
    try {
      this.conn.send(msg);
      return true;
    } catch (err) {
      console.warn('Send error:', err);
      return false;
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongTime = Date.now();
    this.pingInterval = setInterval(() => {
      if (this.isConnected()) {
        // No PONG for too long → treat opponent as gone (crash / network drop)
        if (Date.now() - this.lastPongTime > this.PONG_TIMEOUT_MS) {
          this.setStatus('disconnected', 'Opponent connection lost');
          this.stopHeartbeat();
          try { this.conn?.close(); } catch { /* noop */ }
          return;
        }
        this.lastPingTime = Date.now();
        this.sendMessage({ type: 'PING', timestamp: this.lastPingTime });
      }
    }, 4000);
  }

  /** Explicitly leave: tell opponent while the channel is still open, then tear down. */
  public leaveRoom() {
    if (this.conn && this.conn.open) {
      this.sendMessage({ type: 'OPPONENT_LEFT' });
    }
    this.cleanup();
  }

  private stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public cleanup() {
    this.stopHeartbeat();
    if (this.conn) {
      try {
        this.conn.close();
      } catch {}
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {}
      this.peer = null;
    }
    this.role = null;
    this.roomCode = '';
    this.setStatus('idle');
  }
}

export const peerManager = new PeerManager();
