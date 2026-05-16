import Redis from "ioredis";

const redis = process.env.REDIS_URL
	? new Redis(process.env.REDIS_URL)
	: new Redis({ lazyConnect: true });

// Suppress unhandled connection errors — rate limiter fails open without Redis
redis.on("error", () => {});

export default redis;
