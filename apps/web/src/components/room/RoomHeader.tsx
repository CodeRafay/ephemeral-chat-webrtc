'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TIMEOUTS } from '@/lib/constants';
import type { ConnectionState } from '@/types/room';
import { ConnectionStatus } from './ConnectionStatus';

interface RoomHeaderProps {
  code: string;
  connectionState: ConnectionState;
  debugInfo?: {
    role: 'host' | 'guest' | null;
    peerId: string | null;
    signalingStatus: 'connecting' | 'open' | 'closed' | 'error';
    wsReadyState: number | null;
  };
}

export function RoomHeader({ code, connectionState, debugInfo }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), TIMEOUTS.COPY_FEEDBACK_MS);
  };

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-gray-200 px-4 py-3">
      <Link href="/" className="text-sm text-gray-600 hover:text-gray-900" aria-label="Back to home">
        ← Home
      </Link>
      <span className="font-mono text-sm font-semibold text-gray-900">Room: {code}</span>
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        {copied ? '✓ Copied!' : '📋 Copy Link'}
      </Button>
      {process.env.NODE_ENV !== 'production' && debugInfo ? (
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
          role={debugInfo.role ?? 'none'} | peer={debugInfo.peerId ?? 'none'} | sig=
          {debugInfo.signalingStatus} | ws={formatReadyState(debugInfo.wsReadyState)}
        </span>
      ) : null}
      <div className="ml-auto">
        <ConnectionStatus state={connectionState} />
      </div>
    </header>
  );
}

function formatReadyState(state: number | null): string {
  switch (state) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'open';
    case WebSocket.CLOSING:
      return 'closing';
    case WebSocket.CLOSED:
      return 'closed';
    default:
      return 'unknown';
  }
}
