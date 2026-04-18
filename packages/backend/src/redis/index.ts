import Redis from "ioredis";
import { config } from "../config.js";

// Two separate clients required by ioredis: one for pub, one for sub.
export const redis = new Redis(config.REDIS_URL, { lazyConnect: true });
export const redisSub = new Redis(config.REDIS_URL, { lazyConnect: true });

redis.on("error", (err) => console.error("Redis error:", err));
redisSub.on("error", (err) => console.error("RedisSub error:", err));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  await redisSub.connect();
  console.log("✓ Redis connected");
}
