import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { createRateLimit, type RateLimits } from '../src/middleware/ratelimit.js';

const limits: RateLimits = { clientPerMinute: 3, clientPerDay: 5, ipPerDay: 7, globalPerDay: 100 };

function setup(overrides: Partial<RateLimits> = {}) {
  const clock = { t: 1_000_000 };
  const app = new Hono();
  app.use('*', createRateLimit({ limits: { ...limits, ...overrides }, now: () => clock.t }));
  app.get('/x', (c) => c.text('ok'));
  const hit = (client: string, ip = '1.1.1.1') =>
    app.request('/x', { headers: { 'X-BSCF-Client': client, 'X-Forwarded-For': ip } });
  return { clock, hit };
}

describe('rate limit', () => {
  it('allows up to the burst then answers 429 with Retry-After', async () => {
    const { hit } = setup();
    for (let i = 0; i < 3; i += 1) expect((await hit('a')).status).toBe(200);
    const res = await hit('a');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(await res.json()).toMatchObject({ error: 'rate_limited', retryAfterSeconds: 60 });
  });

  it('computes Retry-After from the oldest entry and reopens exactly at the edge', async () => {
    const { clock, hit } = setup();
    await hit('a');
    clock.t += 20_000;
    await hit('a');
    await hit('a');
    clock.t += 39_999; // oldest is 59.999s old: still blocked
    const blocked = await hit('a');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBe('1');
    clock.t += 1; // oldest is exactly 60s old: slot is free
    expect((await hit('a')).status).toBe(200);
  });

  it('does not count denied requests', async () => {
    const { clock, hit } = setup();
    for (let i = 0; i < 10; i += 1) await hit('a');
    clock.t += 60_000;
    expect((await hit('a')).status).toBe(200);
  });

  it('limits clients per day and sets Retry-After to the day window', async () => {
    const { clock, hit } = setup();
    for (let i = 0; i < 5; i += 1) {
      expect((await hit('a')).status).toBe(200);
      clock.t += 61_000;
    }
    const res = await hit('a');
    expect(res.status).toBe(429);
    const wait = Number(res.headers.get('Retry-After'));
    expect(wait).toBeGreaterThan(80_000);
    clock.t += wait * 1000;
    expect((await hit('a')).status).toBe(200);
  });

  it('keeps clients independent', async () => {
    const { hit } = setup();
    for (let i = 0; i < 3; i += 1) await hit('a');
    expect((await hit('a')).status).toBe(429);
    expect((await hit('b')).status).toBe(200);
  });

  it('limits per IP per day across client ids, using the rightmost forwarded address', async () => {
    const { hit } = setup();
    for (let i = 0; i < 7; i += 1) expect((await hit(`c${i}`, '9.9.9.9')).status).toBe(200);
    const res = await hit('c8', 'spoofed, 9.9.9.9');
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    expect((await hit('c9', '8.8.8.8')).status).toBe(200);
  });

  it('answers a friendly 503 at the global cap and recovers after the day', async () => {
    const { clock, hit } = setup({ globalPerDay: 2 });
    expect((await hit('a', '1.1.1.1')).status).toBe(200);
    expect((await hit('b', '2.2.2.2')).status).toBe(200);
    const res = await hit('c', '3.3.3.3');
    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('86400');
    expect(await res.json()).toMatchObject({ error: 'service_busy' });
    clock.t += 86_400_000;
    expect((await hit('c', '3.3.3.3')).status).toBe(200);
  });
});
