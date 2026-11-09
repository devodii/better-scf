import type { Context, MiddlewareHandler } from "hono";
import type { Redis } from "ioredis";
import { chatError } from "shared";

export interface RateLimitOptions {
  redis: Redis;
  perClientPerDay: number;
  getIp?: (c: Context) => string;
}

const CLIENT_HEADER = "x-bscf-client";
const KEY_PREFIX = "bscf:questions:";
const DAY_SECONDS = 24 * 60 * 60;

function clientIpFromRequest(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  const real = c.req.header("x-real-ip")?.trim();
  return real ? real : "unknown";
}

export function createRateLimit(options: RateLimitOptions): MiddlewareHandler {
  const getIp = options.getIp ?? clientIpFromRequest;

  const retryAfterSeconds = async (key: string): Promise<number | null> => {
    try {
      const replies = await options.redis
        .multi()
        .set(key, 0, "EX", DAY_SECONDS, "NX")
        .incr(key)
        .ttl(key)
        .exec();
      const count = Number(replies?.[1]?.[1]);
      const ttl = Number(replies?.[2]?.[1]);
      if (!Number.isFinite(count) || count <= options.perClientPerDay)
        return null;
      return Math.max(1, Number.isFinite(ttl) ? ttl : DAY_SECONDS);
    } catch {
      return null;
    }
  };

  return async (c, next) => {
    const clientId = c.req.header(CLIENT_HEADER) ?? `ip:${getIp(c)}`;
    const retryAfter = await retryAfterSeconds(`${KEY_PREFIX}${clientId}`);
    if (retryAfter === null) {
      await next();
      return;
    }
    console.warn(
      JSON.stringify({
        event: "limit",
        limit: "DAILY_CAP_PER_CLIENT",
        clientId,
      }),
    );
    c.header("Retry-After", String(retryAfter));
    return c.json(
      chatError(
        "daily_limit",
        "You have reached the daily question limit.",
        retryAfter,
      ),
      429,
    );
  };
}
