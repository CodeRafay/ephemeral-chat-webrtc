import type { Env, PeerRecord, RoomStatus } from './types';

const ROOM_LIFETIME_MS = 30 * 60 * 1000;
const ROOM_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

type PeerAttachment = {
  peerId: string;
  role: 'host' | 'guest';
};

export class Room implements DurableObject {
  private peers = new Map<WebSocket, PeerRecord>();
  private status: RoomStatus = 'WAITING';
  private readonly createdAt = Date.now();
  private lastActivityAt = Date.now();

  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.rehydratePeers();
  }

  async fetch(request: Request): Promise<Response> {
    const upgrade = request.headers.get('Upgrade');
    if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    if (this.status === 'CLOSED') {
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({ type: 'room-not-found' }));
      server.close(4001, 'Room closed');
      return new Response(null, { status: 101, webSocket: client });
    }

    this.ctx.acceptWebSocket(server);
    await this.handleNewPeer(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
    let parsed: { type?: string };
    try {
      parsed = JSON.parse(text) as { type?: string };
    } catch {
      ws.send(
        JSON.stringify({
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: 'Invalid JSON',
        }),
      );
      return;
    }

    if (!this.peers.has(ws)) {
      return;
    }

    this.lastActivityAt = Date.now();
    await this.scheduleExpiry();

    const msgType = parsed.type;
    if (msgType === 'join') {
      return;
    }

    if (msgType === 'leave') {
      await this.handlePeerLeave(ws);
      return;
    }

    if (msgType === 'offer' || msgType === 'answer' || msgType === 'ice-candidate') {
      const other = this.getOtherPeer(ws);
      if (other) {
        other.ws.send(text);
      }
      return;
    }

    ws.send(
      JSON.stringify({
        type: 'error',
        code: 'INVALID_MESSAGE',
        message: 'Unknown type',
      }),
    );
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    console.log('[Room] webSocketClose — peers before:', this.peers.size);
    await this.handlePeerLeave(ws);
    console.log('[Room] webSocketClose — peers after:', this.peers.size);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('[Room] WebSocket error in room:', error);
    await this.handlePeerLeave(ws);
  }

  async alarm(): Promise<void> {
    for (const peer of this.peers.values()) {
      try {
        peer.ws.send(JSON.stringify({ type: 'room-expired' }));
        peer.ws.close(1000, 'Room expired');
      } catch {
        // peer may already be gone
      }
    }
    this.peers.clear();
    this.status = 'CLOSED';
  }

  private async handleNewPeer(ws: WebSocket): Promise<void> {
    const maxPeers = parseInt(this.env.MAX_PEERS_PER_ROOM, 10);

    console.log('[Room] handleNewPeer — peers.size:', this.peers.size, 'maxPeers:', maxPeers, 'status:', this.status);

    if (this.peers.size >= maxPeers) {
      ws.send(JSON.stringify({ type: 'room-full' }));
      ws.close(4000, 'Room full');
      return;
    }

    const role = this.peers.size === 0 ? 'host' : 'guest';
    const peerId = crypto.randomUUID();
    const record: PeerRecord = {
      peerId,
      role,
      connectedAt: Date.now(),
      ws,
    };
    this.peers.set(ws, record);
    ws.serializeAttachment({ peerId, role } satisfies PeerAttachment);

    console.log('[Room] Assigned role:', role, 'peerId:', peerId, 'peers.size now:', this.peers.size);

    ws.send(JSON.stringify({ type: 'assigned-role', role, peerId }));

    if (role === 'guest') {
      for (const peer of this.peers.values()) {
        if (peer.ws !== ws) {
          console.log('[Room] Notifying host of peer-joined');
          peer.ws.send(JSON.stringify({ type: 'peer-joined' }));
        }
      }
      this.status = 'CONNECTED';
    } else {
      this.status = 'WAITING';
    }

    this.lastActivityAt = Date.now();
    await this.scheduleExpiry();
  }

  private rehydratePeers(): void {
    const sockets = this.ctx.getWebSockets();
    if (sockets.length === 0) {
      return;
    }

    for (const ws of sockets) {
      const attachment = ws.deserializeAttachment() as PeerAttachment | undefined;
      if (!attachment || !attachment.peerId || !attachment.role) {
        try {
          ws.close(1011, 'Missing peer metadata');
        } catch {
          // ignore
        }
        continue;
      }

      this.peers.set(ws, {
        peerId: attachment.peerId,
        role: attachment.role,
        connectedAt: Date.now(),
        ws,
      });
    }

    if (this.peers.size >= 2) {
      this.status = 'CONNECTED';
    } else if (this.peers.size === 1) {
      this.status = 'WAITING';
    }
    this.lastActivityAt = Date.now();
  }

  private async handlePeerLeave(ws: WebSocket): Promise<void> {
    if (!this.peers.has(ws)) {
      return;
    }

    const leaving = this.peers.get(ws)!;
    console.log('[Room] handlePeerLeave — removing peer:', leaving.peerId, 'role:', leaving.role);

    const remaining = this.getOtherPeer(ws);
    this.peers.delete(ws);
    if (remaining) {
      remaining.ws.send(JSON.stringify({ type: 'peer-left' }));
    }

    if (this.peers.size === 0) {
      this.status = 'CLOSED';
      await this.ctx.storage.setAlarm(Date.now() + ROOM_IDLE_TIMEOUT_MS);
    } else {
      this.lastActivityAt = Date.now();
      await this.scheduleExpiry();
    }
  }

  private async scheduleExpiry(): Promise<void> {
    const lifetimeEnd = this.createdAt + ROOM_LIFETIME_MS;
    const idleEnd = this.lastActivityAt + ROOM_IDLE_TIMEOUT_MS;
    const alarmAt = Math.min(lifetimeEnd, idleEnd);
    await this.ctx.storage.setAlarm(alarmAt);
  }

  private getOtherPeer(ws: WebSocket): PeerRecord | undefined {
    for (const [socket, record] of this.peers) {
      if (socket !== ws) {
        return record;
      }
    }
    return undefined;
  }

  private getPeerByRole(role: 'host' | 'guest'): PeerRecord | undefined {
    for (const record of this.peers.values()) {
      if (record.role === role) {
        return record;
      }
    }
    return undefined;
  }
}
