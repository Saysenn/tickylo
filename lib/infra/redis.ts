// lib/RedisService.ts
import type { Redis } from "ioredis";
import RedisConstructor from "ioredis";

export class RedisService {
	private static instance: RedisService;
	private redis: Redis;
	private redisUrl: string;

	private constructor() {
		this.redisUrl = process.env.REDIS_URL || "";
		this.redis = new RedisConstructor(this.redisUrl, {
			lazyConnect: true,
			maxRetriesPerRequest: null,
		});

		// Prevent "Unhandled error event"
		this.redis.on("error", (err) => {
			if (process.env.NODE_ENV !== "production") {
				console.warn("Redis connection issue:", err.message);
			}
		});
	}

	public static getInstance(): RedisService {
		if (!RedisService.instance) {
			RedisService.instance = new RedisService();
		}
		return RedisService.instance;
	}

	private async ensureConnection() {
		if (this.redis.status === "wait") {
			await this.redis.connect();
		}
	}

	public async set(key: string, value: string, seconds?: number) {
		await this.ensureConnection();

		if (seconds) {
			return this.redis.setex(key, seconds, value);
		}
		return this.redis.set(key, value);
	}

	public async get(key: string) {
		await this.ensureConnection();
		return this.redis.get(key);
	}

	public async del(key: string) {
		await this.ensureConnection();
		return this.redis.del(key);
	}

	public async delByPattern(pattern: string) {
		await this.ensureConnection();

		const keys = await this.redis.keys(pattern);
		if (keys.length > 0) {
			await this.redis.del(...keys);
		}
	}
}

export default RedisService.getInstance();
