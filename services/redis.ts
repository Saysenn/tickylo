export class RedisService {
	private static instance: RedisService;
	private redis: any;

	private constructor() {
		this.redis = require("ioredis");
	}

	public static getInstance(): RedisService {
		if (!RedisService.instance) {
			RedisService.instance = new RedisService();
		}
		return RedisService.instance;
	}

	public getRedis() {
		return this.redis;
	}

	public set(key: string, value: string) {
		return this.redis.set(key, value);
	}

	public get(key: string) {
		return this.redis.get(key);
	}
}

const redisService = RedisService.getInstance();
export default redisService;
