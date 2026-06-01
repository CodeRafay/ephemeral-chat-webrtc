export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // TODO: V1.1 — Add TURN credentials here
];

export const TIMEOUTS = {
  ICE_TIMEOUT_MS: 15_000,
  RECONNECT_TIMEOUT_MS: 30_000,
  ICE_RESTART_DELAY_MS: 2_000,
  ROOM_WAIT_TIMEOUT_MS: 600_000,
  WS_RECONNECT_DELAYS_MS: [1_000, 2_000, 4_000] as const,
  COPY_FEEDBACK_MS: 2_000,
} as const;

export const LIMITS = {
  MAX_MESSAGE_LENGTH: 1_000,
  CHAR_COUNTER_THRESHOLD: 900,
  MAX_ROOM_PEERS: 2,
  ROOM_CODE_LENGTH: 8,
} as const;

export const ROOM_CODE_REGEX = /^[A-Z0-9]{6,10}$/;

export const DATACHANNEL_LABEL = 'chat';

export const WS_CLOSE_CODES = {
  ROOM_FULL: 4000,
  ROOM_NOT_FOUND: 4001,
  INVALID_MESSAGE: 4002,
  RATE_LIMITED: 4003,
} as const;
