import type { MiddlewareHandler } from "hono";
import { chatError } from "shared";

const DAY_MS = 24 * 60 * 60_000;
const SWEEP_EVERY = 200;

interface Spend {
  at: number;
  tokens: number;
}

export interface TokenBudget {
  middleware: MiddlewareHandler;
  add(clientId: string, tokens: number): void;
}

export function createTokenBudget(
  perClientPerDay: number,
  now: () => number = Date.now,
): TokenBudget {
  const spends = new Map<string, Spend[]>();
  let calls = 0;

  const recent = (clientId: string, t: number): Spend[] => {
    const list = (spends.get(clientId) ?? []).filter(
      (spend) => spend.at > t - DAY_MS,
    );
    if (list.length === 0) spends.delete(clientId);
    else spends.set(clientId, list);
    return list;
  };

  return {
    add(clientId, tokens) {
      const t = now();
      const list = recent(clientId, t);
      list.push({ at: t, tokens });
      spends.set(clientId, list);
      calls += 1;
      if (calls % SWEEP_EVERY === 0)
        for (const key of [...spends.keys()]) recent(key, t);
    },
    middleware: async (c, next) => {
      const clientId = c.req.header("x-bscf-client");
      if (clientId) {
        const t = now();
        const list = recent(clientId, t);
        let total = 0;
        for (const spend of list) total += spend.tokens;
        if (total >= perClientPerDay) {
          const first = list[0];
          const retryAfterSeconds = Math.max(
            1,
            Math.ceil(((first?.at ?? t) + DAY_MS - t) / 1000),
          );
          c.header("Retry-After", String(retryAfterSeconds));
          return c.json(
            chatError(
              "daily_limit",
              "You have used up the assistant for today. Try again tomorrow.",
              retryAfterSeconds,
            ),
            429,
          );
        }
      }
      await next();
      return undefined;
    },
  };
}
