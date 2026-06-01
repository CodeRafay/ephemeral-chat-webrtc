'use client';

import { useEffect, useRef, useState } from 'react';
import { SignalingClient } from '@/lib/signaling';
import { acquireSignalingClient, releaseSignalingClient } from '@/lib/signalingRegistry';

type SignalingStatus = 'connecting' | 'open' | 'closed' | 'error';

export function useSignaling(roomCode: string, enabled = true) {
  const [client, setClient] = useState<SignalingClient | null>(null);
  const [status, setStatus] = useState<SignalingStatus>('connecting');

  // Stable, unique ID for this hook instance. Persists across re-renders but
  // is unique per component mount, ensuring each tab / ChatBox gets its own
  // WebSocket connection to the signaling server.
  const instanceIdRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (!enabled || !roomCode) {
      setClient(null);
      setStatus('closed');
      return;
    }

    const instanceId = instanceIdRef.current;
    const signalingClient = acquireSignalingClient(roomCode, instanceId);
    setClient(signalingClient);
    setStatus(
      signalingClient.readyState === WebSocket.OPEN ? 'open' : 'connecting',
    );

    const unsubOpen = signalingClient.on('open', () => {
      setStatus('open');
      signalingClient.send({ type: 'join' });
    });

    const unsubClose = signalingClient.on('close', () => {
      setStatus('closed');
    });

    const unsubError = signalingClient.on('error', () => {
      setStatus('error');
    });

    if (signalingClient.readyState === WebSocket.OPEN) {
      signalingClient.send({ type: 'join' });
    }

    return () => {
      unsubOpen();
      unsubClose();
      unsubError();
      releaseSignalingClient(instanceId);
      setClient(null);
    };
  }, [roomCode, enabled]);

  return { client, status };
}
