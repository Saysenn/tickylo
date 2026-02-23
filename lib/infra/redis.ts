import redis from "@/configs/redis.config";

const redisClient = {
	set: async (key: string, value: string, ex: number = 60) => {
		try {
			return await redis.set(key, value, "EX", ex);
		} catch (error) {
			console.error("Redis set error:", error);
			throw error;
		}
	},

	get: async (key: string) => {
		try {
			return await redis.get(key);
		} catch (error) {
			console.error("Redis get error:", error);
			throw error;
		}
	},

	del: async (key: string) => {
		try {
			return await redis.del(key);
		} catch (error) {
			console.error("Redis del error:", error);
			throw error;
		}
	},

	delMany: async (keys: string[]) => {
		try {
			if (keys.length > 0) return await redis.del(...keys);
		} catch (error) {
			console.error("Redis delMany error:", error);
			throw error;
		}
	},
};

export default redisClient;
