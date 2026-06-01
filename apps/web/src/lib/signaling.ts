import { TIMEOUTS } from './constants';
import type { ClientMessage, ServerMessage } from '@/types/signaling';

type SignalingEventMap = {
  message: ServerMessage;
  open: void;
  close: CloseEvent;
  error: Event;
};

type SignalingListener<K extends keyof SignalingEventMap> = (
  payload: SignalingEventMap[K],
) => void;

const MAX_MESSAGE_BUFFER = 32;

function isServerMessage(value: unknown): value is ServerMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
}

export class SignalingClient {
  private ws: WebSocket | null = null;
  private intentionalClose = false;
  private hadSuccessfulOpen = false;
  private retryCount = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Map<string, Set<SignalingListener<keyof SignalingEventMap>>>();
  private messageBuffer: ServerMessage[] = [];

  constructor(private readonly url: string) {}

  connect(): void {
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.intentionalClose = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.hadSuccessfulOpen = true;
      this.retryCount = 0;
      this.emit('open', undefined);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const parsed: unknown = JSON.parse(event.data as string);
        if (isServerMessage(parsed)) {
          this.bufferMessage(parsed);
          this.emit('message', parsed);
        }
      } catch {
        console.warn('SignalingClient: failed to parse message');
      }
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.ws = null;
      this.emit('close', event);
      if (this.hadSuccessfulOpen && !this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event: Event) => {
      this.emit('error', event);
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.warn('SignalingClient: cannot send, WebSocket not open');
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.ws) {
      try {
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'leave' }));
        }
      } catch {
        // socket may already be closing
      }
      this.ws.close(1000, 'Client leaving');
      this.ws = null;
    }
    this.messageBuffer = [];
  }

  getBufferedMessages(): readonly ServerMessage[] {
    return this.messageBuffer;
  }

  on<K extends keyof SignalingEventMap>(
    event: K,
    listener: SignalingListener<K>,
  ): () => void {
    const key = event as string;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const set = this.listeners.get(key)!;
    set.add(listener as SignalingListener<keyof SignalingEventMap>);

    if (event === 'message') {
      for (const msg of this.messageBuffer) {
        (listener as SignalingListener<'message'>)(msg);
      }
    }

    return () => {
      set.delete(listener as SignalingListener<keyof SignalingEventMap>);
    };
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  private bufferMessage(msg: ServerMessage): void {
    this.messageBuffer.push(msg);
    if (this.messageBuffer.length > MAX_MESSAGE_BUFFER) {
      this.messageBuffer.shift();
    }
  }

  private emit<K extends keyof SignalingEventMap>(
    event: K,
    payload: SignalingEventMap[K],
  ): void {
    const set = this.listeners.get(event as string);
    if (!set) {
      return;
    }
    for (const listener of set) {
      (listener as SignalingListener<K>)(payload);
    }
  }

  private scheduleReconnect(): void {
    if (this.intentionalClose) {
      return;
    }

    const delays = TIMEOUTS.WS_RECONNECT_DELAYS_MS;
    if (this.retryCount >= delays.length) {
      return;
    }

    const delay = delays[this.retryCount];
    if (delay === undefined) {
      return;
    }

    this.retryCount += 1;
    this.hadSuccessfulOpen = false;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }
}
