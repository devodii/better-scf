import { Redis } from "ioredis";

export function createRedis(url: string): Redis {
  const redis = new Redis(url, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
  });
  let down = false;
  redis.on("error", (error: Error) => {
    if (down) return;
    down = true;
    console.error(`redis unavailable: ${error.message}`);
  });
  redis.on("ready", () => {
    if (down) console.log("redis available again");
    down = false;
  });
  return redis;
}
