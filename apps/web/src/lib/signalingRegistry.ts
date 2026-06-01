import { SignalingClient } from './signaling';

/**
 * Registry that manages SignalingClient instances.
 *
 * Each hook instance (identified by a unique `instanceId`) gets its own
 * WebSocket connection. The registry still guards against React Strict Mode
 * double-mounting by ref-counting per instanceId — if the same instanceId
 * acquires twice before releasing, it reuses the existing client.
 *
 * Previously, the registry keyed on `roomCode` alone, which caused every
 * browser tab that joined the *same* room to share a single WebSocket.
 * The signaling server therefore only ever saw one peer and both tabs were
 * assigned the "host" role.
 */
const clients = new Map<string, SignalingClient>();
const refCounts = new Map<string, number>();

function buildSignalingUrl(roomCode: string): string {
  const base = process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'ws://localhost:8787';
  const normalized = base.replace(/\/$/, '');
  return `${normalized}/ws/${roomCode}`;
}

export function acquireSignalingClient(
  roomCode: string,
  instanceId: string,
): SignalingClient {
  const existing = clients.get(instanceId);
  if (existing) {
    refCounts.set(instanceId, (refCounts.get(instanceId) ?? 0) + 1);
    return existing;
  }

  const client = new SignalingClient(buildSignalingUrl(roomCode));
  clients.set(instanceId, client);
  refCounts.set(instanceId, 1);
  client.connect();
  return client;
}

export function releaseSignalingClient(instanceId: string): void {
  const count = refCounts.get(instanceId);
  if (count === undefined) {
    return;
  }

  if (count > 1) {
    refCounts.set(instanceId, count - 1);
    return;
  }

  refCounts.delete(instanceId);
  const client = clients.get(instanceId);
  if (client) {
    client.disconnect();
    clients.delete(instanceId);
  }
}
