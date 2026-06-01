import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebRTCManager } from '../webrtc';

describe('WebRTCManager', () => {
  let mockSend: ReturnType<typeof vi.fn>;
  let mockDc: {
    readyState: string;
    send: ReturnType<typeof vi.fn>;
    onopen: (() => void) | null;
    onclose: (() => void) | null;
    onerror: (() => void) | null;
    onmessage: ((event: MessageEvent) => void) | null;
    close: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockSend = vi.fn();
    mockDc = {
      readyState: 'open',
      send: mockSend,
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
      close: vi.fn(),
    };

    const mockPc = {
      iceConnectionState: 'new',
      connectionState: 'new',
      localDescription: { type: 'offer', sdp: 'mock-sdp' } as RTCSessionDescription,
      onicecandidate: null as ((event: RTCPeerConnectionIceEvent) => void) | null,
      oniceconnectionstatechange: null as (() => void) | null,
      onconnectionstatechange: null as (() => void) | null,
      ondatachannel: null as ((event: RTCDataChannelEvent) => void) | null,
      createDataChannel: vi.fn(() => mockDc),
      createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'offer' })),
      createAnswer: vi.fn(async () => ({ type: 'answer', sdp: 'answer' })),
      setLocalDescription: vi.fn(async () => undefined),
      setRemoteDescription: vi.fn(async () => undefined),
      addIceCandidate: vi.fn(async () => undefined),
      restartIce: vi.fn(),
      close: vi.fn(),
    };

    vi.stubGlobal(
      'RTCPeerConnection',
      vi.fn(() => mockPc) as unknown as typeof RTCPeerConnection,
    );
  });

  it('sendMessage does not call dc.send for empty trimmed text', () => {
    const onEvent = vi.fn();
    const manager = new WebRTCManager('host', onEvent);
    manager.sendMessage('   ');
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('buffers ICE candidates until remote description is set', async () => {
    const onEvent = vi.fn();
    const manager = new WebRTCManager('host', onEvent);
    const candidate = { candidate: 'test', sdpMid: '0', sdpMLineIndex: 0 };

    await manager.handleIceCandidate(candidate);
    const pc = (RTCPeerConnection as unknown as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value as { addIceCandidate: ReturnType<typeof vi.fn> };
    expect(pc.addIceCandidate).not.toHaveBeenCalled();

    await manager.handleAnswer({ type: 'answer', sdp: 'answer-sdp' });
    expect(pc.addIceCandidate).toHaveBeenCalledWith(candidate);
  });

  it('drains buffered candidates after handleAnswer', async () => {
    const onEvent = vi.fn();
    const manager = new WebRTCManager('guest', onEvent);
    const c1 = { candidate: 'c1' };
    const c2 = { candidate: 'c2' };

    await manager.handleIceCandidate(c1);
    await manager.handleIceCandidate(c2);

    const pc = (RTCPeerConnection as unknown as ReturnType<typeof vi.fn>).mock.results[0]
      ?.value as { addIceCandidate: ReturnType<typeof vi.fn> };

    await manager.handleOffer({ type: 'offer', sdp: 'offer-sdp' });
    expect(pc.addIceCandidate).toHaveBeenCalledTimes(2);
  });
});
