export type ConnectionState =
  | 'IDLE'
  | 'SIGNALING'
  | 'WAITING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'FAILED'
  | 'ROOM_FULL'
  | 'ROOM_NOT_FOUND'
  | 'TIMED_OUT';

export type PeerRole = 'host' | 'guest';

export interface RoomInfo {
  code: string;
  role: PeerRole | null;
  peerId: string | null;
}

export interface RoomHookReturn {
  messages: import('./message').Message[];
  connectionState: ConnectionState;
  roomInfo: RoomInfo;
  sendMessage: (text: string) => void;
  shareUrl: string;
  debug: {
    signalingStatus: 'connecting' | 'open' | 'closed' | 'error';
    wsReadyState: number | null;
  } | null;
}
