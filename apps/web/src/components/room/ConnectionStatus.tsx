import type { ConnectionState } from '@/types/room';

interface ConnectionStatusProps {
  state: ConnectionState;
}

const stateConfig: Partial<
  Record<ConnectionState, { label: string; className: string }>
> = {
  SIGNALING: { label: 'Connecting...', className: 'text-yellow-600 motion-safe:animate-pulse' },
  WAITING: {
    label: 'Waiting for peer...',
    className: 'text-blue-600 motion-safe:animate-pulse',
  },
  CONNECTING: { label: 'Connecting...', className: 'text-yellow-600 motion-safe:animate-pulse' },
  CONNECTED: { label: '● Connected', className: 'text-green-600' },
  RECONNECTING: {
    label: 'Reconnecting...',
    className: 'text-orange-600 motion-safe:animate-pulse',
  },
  DISCONNECTED: { label: '● Disconnected', className: 'text-red-600' },
  FAILED: { label: '● Connection failed', className: 'text-red-600' },
};

export function ConnectionStatus({ state }: ConnectionStatusProps) {
  const config = stateConfig[state];
  if (!config) {
    return null;
  }

  return (
    <span
      role="status"
      aria-label={`Connection status: ${config.label}`}
      className={`text-sm font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
