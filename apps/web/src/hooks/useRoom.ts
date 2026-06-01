'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TIMEOUTS } from '@/lib/constants';
import { isValidRoomCode } from '@/lib/roomId';
import type { ServerMessage } from '@/types/signaling';
import { useSignaling } from './useSignaling';
import { useWebRTC } from './useWebRTC';
import type { ConnectionState, PeerRole, RoomHookReturn } from '@/types/room';

export function useRoom(code: string): RoomHookReturn {
  const normalizedCode = code.toUpperCase();
  const invalidCode = !isValidRoomCode(normalizedCode);

  const { client, status } = useSignaling(normalizedCode, !invalidCode);

  const [role, setRole] = useState<PeerRole | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [overrideState, setOverrideState] = useState<ConnectionState | null>(null);
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { connectionState: webrtcState, messages, sendMessage } = useWebRTC(
    invalidCode ? null : client,
    invalidCode ? null : role,
  );

  useEffect(() => {
    if (!client) {
      return;
    }

    const handleRoomMessage = (msg: ServerMessage) => {
      if (msg.type === 'assigned-role') {
        setRole(msg.role);
        setPeerId(msg.peerId);
        setOverrideState(msg.role === 'host' ? 'WAITING' : null);
        return;
      }

      if (msg.type === 'peer-joined') {
        setOverrideState(null);
        return;
      }

      if (msg.type === 'room-full') {
        setOverrideState('ROOM_FULL');
        return;
      }

      if (msg.type === 'room-not-found') {
        setOverrideState('ROOM_NOT_FOUND');
        return;
      }

      if (msg.type === 'room-expired') {
        setOverrideState('TIMED_OUT');
      }
    };

    return client.on('message', handleRoomMessage);
  }, [client]);

  useEffect(() => {
    if (waitTimerRef.current !== null) {
      clearTimeout(waitTimerRef.current);
      waitTimerRef.current = null;
    }

    if (role !== 'host' || webrtcState === 'CONNECTING' || webrtcState === 'CONNECTED') {
      return;
    }

    if (overrideState !== 'WAITING') {
      return;
    }

    waitTimerRef.current = setTimeout(() => {
      setOverrideState('TIMED_OUT');
      client?.disconnect();
    }, TIMEOUTS.ROOM_WAIT_TIMEOUT_MS);

    return () => {
      if (waitTimerRef.current !== null) {
        clearTimeout(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [role, webrtcState, overrideState, client]);

  const connectionState: ConnectionState = useMemo(() => {
    if (invalidCode) {
      return 'ROOM_NOT_FOUND';
    }
    if (status === 'error') {
      return 'FAILED';
    }
    if (status === 'closed' && !role) {
      return 'FAILED';
    }
    if (overrideState) {
      if (
        overrideState === 'ROOM_FULL' ||
        overrideState === 'ROOM_NOT_FOUND' ||
        overrideState === 'TIMED_OUT'
      ) {
        return overrideState;
      }
    }
    if (status === 'connecting') {
      return 'SIGNALING';
    }
    if (
      overrideState === 'WAITING' &&
      webrtcState !== 'CONNECTED' &&
      webrtcState !== 'CONNECTING' &&
      webrtcState !== 'RECONNECTING'
    ) {
      return 'WAITING';
    }
    if (webrtcState !== 'IDLE') {
      return webrtcState;
    }
    if (role) {
      return role === 'host' ? 'WAITING' : 'SIGNALING';
    }
    return 'SIGNALING';
  }, [invalidCode, overrideState, status, webrtcState, role]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/room/${normalizedCode}`
      : '';

  return {
    messages,
    connectionState,
    roomInfo: {
      code: normalizedCode,
      role,
      peerId,
    },
    sendMessage,
    shareUrl,
    debug: client
      ? {
          signalingStatus: status,
          wsReadyState: client.readyState,
        }
      : null,
  };
}
