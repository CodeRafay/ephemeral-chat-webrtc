import { Room } from './room';
import type { Env } from './types';

export { Room };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Upgrade',
        },
      });
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({
        status: 'ok',
        timestamp: Date.now(),
        endpoints: {
          health: '/health',
          websocket: '/ws/{ROOM_CODE}',
        },
      });
    }

    if (url.pathname.startsWith('/ws/')) {
      const upgrade = request.headers.get('Upgrade');
      if (!upgrade || upgrade.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket upgrade', { status: 426 });
      }

      const code = url.pathname.replace('/ws/', '');

      if (!/^[A-Z0-9]{6,10}$/.test(code)) {
        return new Response('Invalid room code format', { status: 400 });
      }

      const rateLimitDisabled = env.DISABLE_RATE_LIMIT === 'true';

      if (!rateLimitDisabled) {
        try {
          const clientIp = request.headers.get('CF-Connecting-IP') ?? 'unknown';
          const rlKey = `rl:${clientIp}`;
          const current = parseInt((await env.RATE_LIMIT_KV.get(rlKey)) ?? '0', 10);
          const max = parseInt(env.RATE_LIMIT_MAX_CONNECTIONS, 10);
          if (current >= max) {
            return new Response('Rate limited', { status: 429 });
          }
          await env.RATE_LIMIT_KV.put(rlKey, String(current + 1), {
            expirationTtl: 60,
          });
        } catch {
          // KV unavailable — continue without rate limiting
        }
      }

      const id = env.ROOMS.idFromName(code);
      const stub = env.ROOMS.get(id);
      return stub.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
