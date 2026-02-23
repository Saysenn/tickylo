import redis from "@/configs/redis.config";

const redisClient = {
	set: async (key: string, value: any, ex: number = 60) => {
		try {
			const valueToStore =
				typeof value === "string" ? value : JSON.stringify(value);
			return await redis.set(key, valueToStore, "EX", ex);
		} catch (error) {
			console.error("Redis set error:", error);
			throw error;
		}
	},

	get: async (key: string) => {
		try {
			const data = await redis.get(key);
			return data ? JSON.parse(data) : null;
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
			return await redis.del(...keys);
		} catch (error) {
			console.error("Redis delMany error:", error);
			throw error;
		}
	},
};

export default redisClient;
