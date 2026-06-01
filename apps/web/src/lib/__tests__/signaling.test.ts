import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignalingClient } from '../signaling';

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    queueMicrotask(() => this.onopen?.());
  }

  send = vi.fn();
  close = vi.fn();
}

describe('SignalingClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.stubGlobal('WebSocket', MockWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('connect() opens a WebSocket to the given url', () => {
    const client = new SignalingClient('ws://localhost:8787/ws/TEST');
    client.connect();
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0]?.url).toBe('ws://localhost:8787/ws/TEST');
  });

  it('send() serializes and sends when open', () => {
    const client = new SignalingClient('ws://test');
    client.connect();
    const ws = MockWebSocket.instances[0]!;
    client.send({ type: 'join' });
    expect(ws.send).toHaveBeenCalledWith(JSON.stringify({ type: 'join' }));
  });

  it('disconnect() closes with code 1000', () => {
    const client = new SignalingClient('ws://test');
    client.connect();
    const ws = MockWebSocket.instances[0]!;
    client.disconnect();
    expect(ws.close).toHaveBeenCalledWith(1000, 'Client leaving');
  });

  it('dispatches parsed server messages to listeners', () => {
    const client = new SignalingClient('ws://test');
    const handler = vi.fn();
    client.on('message', handler);
    client.connect();
    const ws = MockWebSocket.instances[0]!;
    const payload = { type: 'assigned-role', role: 'host', peerId: 'abc' };
    ws.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('replays buffered messages to late subscribers', () => {
    const client = new SignalingClient('ws://test');
    client.connect();
    const ws = MockWebSocket.instances[0]!;
    const payload = { type: 'peer-joined' };
    ws.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent);

    const lateHandler = vi.fn();
    client.on('message', lateHandler);
    expect(lateHandler).toHaveBeenCalledWith(payload);
  });
});
