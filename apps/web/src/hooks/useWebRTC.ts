'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { TIMEOUTS } from '@/lib/constants';
import { SignalingClient } from '@/lib/signaling';
import { WebRTCManager, type WebRTCEventMap } from '@/lib/webrtc';
import type { Message } from '@/types/message';
import type { ConnectionState, PeerRole } from '@/types/room';
import type { ServerMessage } from '@/types/signaling';

const WEBRTC_SIGNAL_TYPES = new Set([
  'peer-joined',
  'offer',
  'answer',
  'ice-candidate',
  'peer-left',
  'room-full',
  'room-not-found',
  'room-expired',
]);

function isWebRTCSignalMessage(msg: ServerMessage): boolean {
  return WEBRTC_SIGNAL_TYPES.has(msg.type);
}

export function useWebRTC(signalingClient: SignalingClient | null, role: PeerRole | null) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('IDLE');
  const [messages, setMessages] = useState<Message[]>([]);
  const managerRef = useRef<WebRTCManager | null>(null);
  const iceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processedSignalsRef = useRef<Set<string>>(new Set());

  const clearIceTimeout = useCallback(() => {
    if (iceTimeoutRef.current !== null) {
      clearTimeout(iceTimeoutRef.current);
      iceTimeoutRef.current = null;
    }
  }, []);

  const startIceTimeout = useCallback(() => {
    clearIceTimeout();
    iceTimeoutRef.current = setTimeout(() => {
      setConnectionState((current) => (current === 'CONNECTED' ? current : 'FAILED'));
    }, TIMEOUTS.ICE_TIMEOUT_MS);
  }, [clearIceTimeout]);

  const appendMessage = useCallback((msg: Message) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) {
        return prev;
      }
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    if (!role || !signalingClient) {
      return;
    }

    processedSignalsRef.current.clear();

    const signalKey = (msg: ServerMessage): string => JSON.stringify(msg);

    const handleManagerEvent = <K extends keyof WebRTCEventMap>(
      event: K,
      payload: WebRTCEventMap[K],
    ) => {
      if (event === 'message') {
        appendMessage(payload as Message);
        return;
      }
      if (event === 'stateChange') {
        setConnectionState(payload as ConnectionState);
        if (payload === 'CONNECTING') {
          startIceTimeout();
        }
        if (payload === 'CONNECTED') {
          clearIceTimeout();
        }
        return;
      }
      if (event === 'offer') {
        signalingClient.send({ type: 'offer', sdp: payload as RTCSessionDescriptionInit });
        return;
      }
      if (event === 'iceCandidate') {
        signalingClient.send({
          type: 'ice-candidate',
          candidate: payload as RTCIceCandidateInit,
        });
      }
    };

    const manager = new WebRTCManager(role, handleManagerEvent);
    managerRef.current = manager;

    const handleSignalingMessage = async (msg: ServerMessage) => {
      if (!isWebRTCSignalMessage(msg)) {
        return;
      }

      const key = signalKey(msg);
      if (processedSignalsRef.current.has(key)) {
        return;
      }
      processedSignalsRef.current.add(key);

      try {
        switch (msg.type) {
          case 'peer-joined': {
            if (role !== 'host') {
              break;
            }
            const sdp = await manager.createOffer();
            signalingClient.send({ type: 'offer', sdp });
            setConnectionState('CONNECTING');
            startIceTimeout();
            break;
          }
          case 'offer': {
            const answer = await manager.handleOffer(msg.sdp);
            signalingClient.send({ type: 'answer', sdp: answer });
            setConnectionState('CONNECTING');
            startIceTimeout();
            break;
          }
          case 'answer': {
            await manager.handleAnswer(msg.sdp);
            break;
          }
          case 'ice-candidate': {
            await manager.handleIceCandidate(msg.candidate);
            break;
          }
          case 'peer-left':
            setConnectionState('DISCONNECTED');
            break;
          case 'room-full':
            setConnectionState('ROOM_FULL');
            break;
          case 'room-not-found':
            setConnectionState('ROOM_NOT_FOUND');
            break;
          case 'room-expired':
            setConnectionState('TIMED_OUT');
            break;
          default:
            break;
        }
      } catch {
        setConnectionState('FAILED');
      }
    };

    const unsub = signalingClient.on('message', (msg) => {
      void handleSignalingMessage(msg);
    });

    return () => {
      unsub();
      manager.close();
      managerRef.current = null;
      clearIceTimeout();
    };
    // Do NOT include lastMessage — it updates on every ICE candidate and was
    // tearing down the peer connection on each message.
  }, [role, signalingClient, appendMessage, startIceTimeout, clearIceTimeout]);

  const sendMessage = useCallback((text: string) => {
    managerRef.current?.sendMessage(text);
  }, []);

  return { connectionState, messages, sendMessage };
}
