import redisClient from "./redis";

const redisEnabled = !!process.env.REDIS_URL;

/**
 * Cache-aside helper. Returns cached value if present, otherwise calls fn,
 * stores the result, and returns it.
 * No-ops silently when REDIS_URL is not configured.
 */
export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
	if (!redisEnabled) return fn();

	try {
		const hit = await redisClient.get(key);
		if (hit !== null) return hit as T;
	} catch {
		return fn();
	}

	const result = await fn();

	try {
		await redisClient.set(key, result, ttlSeconds);
	} catch {
		// ignore — result is already computed
	}

	return result;
}

export async function invalidate(key: string) {
	if (!redisEnabled) return;
	try { await redisClient.del(key); } catch { /* ignore */ }
}

export async function invalidatePattern(keys: string[]) {
	if (!redisEnabled) return;
	try { await redisClient.delMany(keys); } catch { /* ignore */ }
}
