import { DATACHANNEL_LABEL, ICE_SERVERS, LIMITS, TIMEOUTS } from './constants';
import type { Message } from '@/types/message';
import type { ConnectionState } from '@/types/room';
import type { DataChannelPayload } from '@/types/signaling';

export type WebRTCEventMap = {
  message: Message;
  stateChange: ConnectionState;
  offer: RTCSessionDescriptionInit;
  answer: RTCSessionDescriptionInit;
  iceCandidate: RTCIceCandidateInit;
};

function isDataChannelPayload(value: unknown): value is DataChannelPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as DataChannelPayload).id === 'string' &&
    typeof (value as DataChannelPayload).text === 'string' &&
    typeof (value as DataChannelPayload).timestamp === 'number'
  );
}

export class WebRTCManager {
  private pc: RTCPeerConnection;
  private dc: RTCDataChannel | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private iceRestartTimer: ReturnType<typeof setTimeout> | null = null;
  private iceFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly seenMessageIds = new Set<string>();

  constructor(
    private role: 'host' | 'guest',
    private onEvent: <K extends keyof WebRTCEventMap>(
      event: K,
      payload: WebRTCEventMap[K],
    ) => void,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.setupPeerConnection();
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return this.pc.localDescription!;
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc.setRemoteDescription(sdp);
    this.remoteDescSet = true;
    await this.drainPendingCandidates();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return this.pc.localDescription!;
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc.setRemoteDescription(sdp);
    this.remoteDescSet = true;
    await this.drainPendingCandidates();
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.remoteDescSet) {
      this.pendingCandidates.push(candidate);
      return;
    }
    await this.pc.addIceCandidate(candidate);
  }

  sendMessage(text: string): void {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > LIMITS.MAX_MESSAGE_LENGTH) {
      return;
    }

    if (this.dc?.readyState !== 'open') {
      return;
    }

    const payload: DataChannelPayload = {
      id: crypto.randomUUID(),
      text: trimmed,
      timestamp: Date.now(),
    };

    this.dc.send(JSON.stringify(payload));
    this.onEvent('message', {
      id: payload.id,
      text: payload.text,
      sender: 'self',
      timestamp: payload.timestamp,
    });
  }

  close(): void {
    if (this.iceRestartTimer !== null) {
      clearTimeout(this.iceRestartTimer);
      this.iceRestartTimer = null;
    }
    if (this.iceFallbackTimer !== null) {
      clearTimeout(this.iceFallbackTimer);
      this.iceFallbackTimer = null;
    }
    this.dc?.close();
    this.pc.close();
    this.dc = null;
  }

  private setupPeerConnection(): void {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.onEvent('iceCandidate', event.candidate.toJSON());
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      void this.handleIceStateChange();
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc.connectionState === 'failed') {
        this.onEvent('stateChange', 'FAILED');
      }
    };

    if (this.role === 'host') {
      this.dc = this.pc.createDataChannel(DATACHANNEL_LABEL, { ordered: true });
      this.setupDataChannel(this.dc);
    } else {
      this.pc.ondatachannel = (event) => {
        this.dc = event.channel;
        this.setupDataChannel(this.dc);
      };
    }
  }

  private setupDataChannel(dc: RTCDataChannel): void {
    dc.onopen = () => {
      this.onEvent('stateChange', 'CONNECTED');
    };

    dc.onclose = () => {
      this.onEvent('stateChange', 'DISCONNECTED');
    };

    dc.onerror = () => {
      this.onEvent('stateChange', 'DISCONNECTED');
    };

    dc.onmessage = (event) => {
      try {
        const parsed: unknown = JSON.parse(event.data as string);
        if (!isDataChannelPayload(parsed)) {
          return;
        }
        if (this.seenMessageIds.has(parsed.id)) {
          return;
        }
        this.seenMessageIds.add(parsed.id);
        this.onEvent('message', {
          id: parsed.id,
          text: parsed.text,
          sender: 'peer',
          timestamp: parsed.timestamp,
        });
      } catch {
        console.warn('WebRTCManager: failed to parse DataChannel message');
      }
    };
  }

  private async handleIceStateChange(): Promise<void> {
    const state = this.pc.iceConnectionState;

    switch (state) {
      case 'checking':
        this.onEvent('stateChange', 'CONNECTING');
        break;
      case 'connected':
      case 'completed':
        break;
      case 'failed':
        this.onEvent('stateChange', 'FAILED');
        break;
      case 'disconnected':
        this.onEvent('stateChange', 'RECONNECTING');
        await this.handleIceDisconnect();
        break;
      case 'closed':
        this.onEvent('stateChange', 'DISCONNECTED');
        break;
      default:
        break;
    }
  }

  private async handleIceDisconnect(): Promise<void> {
    if (this.role !== 'host') {
      return;
    }

    if (this.iceRestartTimer !== null) {
      clearTimeout(this.iceRestartTimer);
    }

    this.iceRestartTimer = setTimeout(() => {
      void this.performIceRestart();
    }, TIMEOUTS.ICE_RESTART_DELAY_MS);
  }

  private async performIceRestart(): Promise<void> {
    this.iceRestartTimer = null;

    if (this.pc.iceConnectionState !== 'disconnected') {
      return;
    }

    try {
      this.pc.restartIce();
      const offer = await this.pc.createOffer({ iceRestart: true });
      await this.pc.setLocalDescription(offer);
      this.onEvent('offer', this.pc.localDescription!);
    } catch {
      this.onEvent('stateChange', 'DISCONNECTED');
      return;
    }

    if (this.iceFallbackTimer !== null) {
      clearTimeout(this.iceFallbackTimer);
    }

    this.iceFallbackTimer = setTimeout(() => {
      const iceState = this.pc.iceConnectionState;
      if (iceState !== 'connected' && iceState !== 'completed') {
        this.onEvent('stateChange', 'DISCONNECTED');
      }
    }, TIMEOUTS.RECONNECT_TIMEOUT_MS);
  }

  private async drainPendingCandidates(): Promise<void> {
    const pending = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const candidate of pending) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch {
        console.warn('WebRTCManager: failed to add buffered ICE candidate');
      }
    }
  }
}
