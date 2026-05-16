import { NextResponse } from "next/server";
import redisClient from "@/lib/infra/redis";

const redisEnabled = !!process.env.REDIS_URL;

/**
 * Fixed-window rate limiter backed by Redis.
 * No-ops silently (allows all requests) when REDIS_URL is not configured.
 *
 * @param key      Unique key — use `ip:endpoint` for public routes, `uid:endpoint` for authed routes
 * @param max      Max requests allowed in the window
 * @param windowSec Window duration in seconds
 * @returns NextResponse 429 if rate limited, null if allowed
 */
export async function rateLimit(
	key: string,
	max: number,
	windowSec: number,
): Promise<NextResponse | null> {
	if (!redisEnabled) return null;

	try {
		const redisKey = `rl:${key}`;
		const count = await redisClient.incr(redisKey);
		if (count === 1) {
			await redisClient.expire(redisKey, windowSec);
		}
		if (count > max) {
			return NextResponse.json(
				{ error: "Too many requests. Please slow down and try again later." },
				{
					status: 429,
					headers: {
						"Retry-After": String(windowSec),
						"X-RateLimit-Limit":     String(max),
						"X-RateLimit-Remaining": "0",
					},
				},
			);
		}
	} catch {
		// Redis failure → fail open, never block legitimate users
	}

	return null;
}

/**
 * Extract best-effort IP from request headers.
 * Prefers Vercel/Cloudflare forwarded IP, falls back to a fixed string.
 */
export function getIP(req: Request | { headers: Headers }): string {
	const h = req.headers;
	return (
		h.get("x-vercel-forwarded-for") ??
		h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
		h.get("cf-connecting-ip") ??
		"unknown"
	);
}
