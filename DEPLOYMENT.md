# Deployment Guide

This project has two deploy targets:

1. `apps/web` on Vercel
2. `apps/signaling` on Cloudflare Workers

The fastest path is to deploy the signaling worker first, then point the web app at the worker URL.

## What you need

- A GitHub repo connected to your deployments
- A Vercel account
- A Cloudflare account
- Node.js 20+ and `pnpm` if you want to test locally before deploying

## One-time setup

### 1) Create the Cloudflare KV namespace

The signaling worker needs a KV namespace for rate limiting.

1. Open the Cloudflare dashboard.
2. Create a KV namespace for the signaling worker.
3. Copy the namespace ID into [apps/signaling/wrangler.toml](apps/signaling/wrangler.toml) in place of `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.

You only need to do this once unless you recreate the namespace.

### 2) Set the production signaling URL

The web app must know the deployed WebSocket URL for signaling.

Set `NEXT_PUBLIC_SIGNALING_URL` to the worker URL, for example:

```env
NEXT_PUBLIC_SIGNALING_URL=wss://your-worker.your-subdomain.workers.dev
```

For local development, the repo uses:

```env
NEXT_PUBLIC_SIGNALING_URL=ws://localhost:8787
```

## Deploy signaling to Cloudflare Workers

### Option A: Deploy from your machine

From the repository root:

```bash
pnpm install
pnpm --filter signaling deploy
```

If this is your first time using Wrangler, log in first:

```bash
pnpm --filter signaling wrangler login
```

After deployment, note the public worker URL. You will use it in the web app environment variable.

### Option B: Deploy from CI

If you deploy from GitHub Actions or another CI system, add these secrets:

- `CF_API_TOKEN`
- `CF_ACCOUNT_ID`

Then run the same `pnpm --filter signaling deploy` command in CI.

## Deploy the web app to Vercel

### Recommended setup

1. Import the repository into Vercel.
2. Set the root directory to `apps/web`.
3. Add the environment variable `NEXT_PUBLIC_SIGNALING_URL` with the production worker URL.
4. Deploy.

That is usually enough for a clean production release.

### If you deploy from the monorepo root

If you prefer to deploy the whole repo from one Vercel project, make sure the project is configured so that the web app build runs from `apps/web` and the `NEXT_PUBLIC_SIGNALING_URL` variable is still available at build time.

## Production checklist

Before sharing the app publicly, confirm these items:

- The Cloudflare worker deploys successfully and returns a healthy response at its URL.
- `NEXT_PUBLIC_SIGNALING_URL` in Vercel points to the production worker URL, not localhost.
- The worker KV namespace ID in [apps/signaling/wrangler.toml](apps/signaling/wrangler.toml) is the real production ID.
- The web app opens and can create a room.
- A second browser tab can join the same room and connect.

## Minimal-effort deployment flow

If you want the shortest practical path, use this exact sequence:

```bash
pnpm install
pnpm --filter signaling deploy
```

Then:

1. Copy the deployed worker URL.
2. Set `NEXT_PUBLIC_SIGNALING_URL` in Vercel.
3. Deploy `apps/web` on Vercel.

## Troubleshooting

### Web app cannot connect to signaling

- Check that `NEXT_PUBLIC_SIGNALING_URL` is a `wss://` URL in production.
- Verify the worker is deployed and publicly reachable.
- Make sure the worker URL in Vercel matches the current deployment.

### Rooms fail to join or connect

- Confirm the worker has the correct KV namespace ID.
- Check Cloudflare Worker logs for errors.
- Make sure you are opening the same room URL in both tabs.

### Local dev works but production does not

- Local dev uses `ws://localhost:8787`.
- Production must use the deployed `wss://...` worker URL.
- Double-check that Vercel has the production environment variable set for both preview and production environments if needed.

## Useful commands

```bash
pnpm dev:signaling
pnpm dev:web
pnpm --filter signaling deploy
pnpm build
pnpm typecheck
```

# In-Short

Deployment steps:

1. Create a GitHub repo and push your code.
2. Create a Cloudflare account.
3. In Cloudflare, create a KV namespace for the signaling worker.
4. Put the KV namespace ID into wrangler.toml.
5. Deploy the signaling worker with pnpm --filter signaling deploy.
6. Copy the deployed worker URL, for example wss://your-worker.your-subdomain.workers.dev.
7. Create a Vercel project from the same GitHub repo.
8. Set the root directory to web.
9. Add NEXT_PUBLIC_SIGNALING_URL in Vercel and point it to the production worker URL.
10. Deploy the web app.

Open the Vercel URL, create a room, copy the link, and test it in a second tab.
After that, connect your custom domain in Vercel if you want a branded URL.
