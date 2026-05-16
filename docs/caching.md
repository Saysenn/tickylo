# Redis Caching

Redis caching is wired up in `lib/infra/cache.ts` but is **inactive until `REDIS_URL` is set**.
Without it, routes fall back to hitting the DB on every request — everything still works, just uncached.

## Routes currently cached

| Route | Cache key | TTL |
|---|---|---|
| `GET /api/v1/reports` | `reports:<orgId>` | 120s |
| `GET /api/v1/time/team-summary` | `team-summary:<orgId>:<from>:<to>:<tzOffset>:<search>` | 30s |

## Enabling Redis

Pick a provider (all have free tiers) and add `REDIS_URL` to `.env.local`:

| Provider | Notes |
|---|---|
| **Upstash** | upstash.com — serverless, no always-on server, best for Vercel |
| **Railway** | railway.app → Add service → Redis |
| **Render** | render.com → New → Redis |
| **Local** | `brew install redis && redis-server` → `REDIS_URL=redis://localhost:6379` |

**Upstash is the best fit if deploying to Vercel** — it's HTTP-based so it works in serverless/edge functions without persistent connections. Use `rediss://` (with double-s) for TLS on Upstash.

## How it works

`cached(key, ttlSeconds, fn)` in `lib/infra/cache.ts`:

1. If `REDIS_URL` is not set → calls `fn()` directly, no Redis touched
2. Checks Redis for `key` — if hit, returns cached value instantly
3. On miss → calls `fn()`, stores result in Redis with the given TTL, returns result
4. Any Redis error → falls through to `fn()` silently

Invalidation is TTL-based (data expires automatically). No manual invalidation is needed for these routes since the data changes infrequently and the TTLs are short.
