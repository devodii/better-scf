import type { Context, MiddlewareHandler } from 'hono';

export interface RateLimits {
  clientPerMinute: number;
  clientPerDay: number;
  ipPerDay: number;
  globalPerDay: number;
}

export interface RateLimitOptions {
  limits: RateLimits;
  now?: () => number;
  getIp?: (c: Context) => string;
}

export const CLIENT_HEADER = 'x-bscf-client';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;
const SWEEP_EVERY = 500;

// Proxies append the connecting address to X-Forwarded-For: only the rightmost entry is trusted, the leftmost can be forged.
export function clientIpFromRequest(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  const real = c.req.header('x-real-ip')?.trim();
  return real ? real : 'unknown';
}

type Decision =
  | { allowed: true }
  | { allowed: false; reason: 'global' | 'client' | 'ip'; retryAfterSeconds: number };

export interface RateLimiter {
  check(clientId: string, ip: string): Decision;
}

export function createRateLimiter(limits: RateLimits, now: () => number = Date.now): RateLimiter {
  const clients = new Map<string, number[]>();
  const ips = new Map<string, number[]>();
  let global: number[] = [];
  let calls = 0;

  const prune = (stamps: number[], windowMs: number, t: number): number[] => {
    const cutoff = t - windowMs;
    let i = 0;
    while (i < stamps.length && (stamps[i] as number) <= cutoff) i += 1;
    return i === 0 ? stamps : stamps.slice(i);
  };

  const retryAfter = (stamps: number[], windowMs: number, limit: number, t: number): number => {
    const blocking = stamps[Math.max(0, stamps.length - limit)] ?? t;
    return Math.max(1, Math.ceil((blocking + windowMs - t) / 1000));
  };

  const load = (map: Map<string, number[]>, key: string, windowMs: number, t: number): number[] => {
    const stamps = prune(map.get(key) ?? [], windowMs, t);
    if (stamps.length === 0) map.delete(key);
    else map.set(key, stamps);
    return stamps;
  };

  const sweep = (t: number): void => {
    for (const map of [clients, ips]) {
      for (const key of [...map.keys()]) load(map, key, DAY_MS, t);
    }
  };

  return {
    check(clientId, ip) {
      const t = now();
      calls += 1;
      if (calls % SWEEP_EVERY === 0) sweep(t);

      global = prune(global, DAY_MS, t);
      if (global.length >= limits.globalPerDay) {
        return {
          allowed: false,
          reason: 'global',
          retryAfterSeconds: retryAfter(global, DAY_MS, limits.globalPerDay, t),
        };
      }

      const day = load(clients, clientId, DAY_MS, t);
      const minute = day.filter((stamp) => stamp > t - MINUTE_MS);
      if (minute.length >= limits.clientPerMinute) {
        return {
          allowed: false,
          reason: 'client',
          retryAfterSeconds: retryAfter(minute, MINUTE_MS, limits.clientPerMinute, t),
        };
      }
      if (day.length >= limits.clientPerDay) {
        return {
          allowed: false,
          reason: 'client',
          retryAfterSeconds: retryAfter(day, DAY_MS, limits.clientPerDay, t),
        };
      }

      const ipDay = load(ips, ip, DAY_MS, t);
      if (ipDay.length >= limits.ipPerDay) {
        return {
          allowed: false,
          reason: 'ip',
          retryAfterSeconds: retryAfter(ipDay, DAY_MS, limits.ipPerDay, t),
        };
      }

      day.push(t);
      clients.set(clientId, day);
      ipDay.push(t);
      ips.set(ip, ipDay);
      global.push(t);
      return { allowed: true };
    },
  };
}

export function createRateLimit(options: RateLimitOptions): MiddlewareHandler {
  const limiter = createRateLimiter(options.limits, options.now);
  const getIp = options.getIp ?? clientIpFromRequest;

  return async (c, next) => {
    const ip = getIp(c);
    const clientId = c.req.header(CLIENT_HEADER) ?? `ip:${ip}`;
    const decision = limiter.check(clientId, ip);
    if (decision.allowed) {
      await next();
      return;
    }
    c.header('Retry-After', String(decision.retryAfterSeconds));
    if (decision.reason === 'global') {
      return c.json(
        {
          error: 'service_busy',
          message: 'The assistant has reached its daily capacity. Please try again later.',
          retryAfterSeconds: decision.retryAfterSeconds,
        },
        503,
      );
    }
    return c.json(
      {
        error: 'rate_limited',
        message: 'You are asking too quickly. Please wait a moment and try again.',
        retryAfterSeconds: decision.retryAfterSeconds,
      },
      429,
    );
  };
}
