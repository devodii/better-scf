import type { Context, MiddlewareHandler } from "hono";
import { chatError } from "shared";

export interface RateLimitOptions {
  perClientPerDay: number;
  now?: () => number;
  getIp?: (c: Context) => string;
}

const CLIENT_HEADER = "x-bscf-client";
const DAY_MS = 24 * 60 * 60_000;
const SWEEP_EVERY = 500;

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
  const now = options.now ?? Date.now;
  const getIp = options.getIp ?? clientIpFromRequest;
  const clients = new Map<string, number[]>();
  let calls = 0;

  const recent = (clientId: string, t: number): number[] => {
    const stamps = (clients.get(clientId) ?? []).filter(
      (stamp) => stamp > t - DAY_MS,
    );
    if (stamps.length === 0) clients.delete(clientId);
    else clients.set(clientId, stamps);
    return stamps;
  };

  return async (c, next) => {
    const t = now();
    calls += 1;
    if (calls % SWEEP_EVERY === 0) {
      for (const key of [...clients.keys()]) recent(key, t);
    }
    const clientId = c.req.header(CLIENT_HEADER) ?? `ip:${getIp(c)}`;
    const stamps = recent(clientId, t);
    if (stamps.length >= options.perClientPerDay) {
      const retryAfter = Math.max(
        1,
        Math.ceil(((stamps[0] ?? t) + DAY_MS - t) / 1000),
      );
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
    }
    stamps.push(t);
    clients.set(clientId, stamps);
    await next();
  };
}
