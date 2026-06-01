export type RoomStatus = 'WAITING' | 'CONNECTED' | 'CLOSED';

export interface PeerRecord {
  peerId: string;
  role: 'host' | 'guest';
  connectedAt: number;
  ws: WebSocket;
}

export interface Env {
  ROOMS: DurableObjectNamespace;
  RATE_LIMIT_KV: KVNamespace;
  MAX_PEERS_PER_ROOM: string;
  ROOM_LIFETIME_MS: string;
  ROOM_IDLE_TIMEOUT_MS: string;
  RATE_LIMIT_MAX_CONNECTIONS: string;
  DISABLE_RATE_LIMIT: string;
}
