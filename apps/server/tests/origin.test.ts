import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { type OriginOptions, origin } from '../src/middleware/origin.js';

const ALLOWED_ID = 'abcdefghijklmnopabcdefghijklmnop';
const OTHER_ID = 'ponmlkjihgfedcbaponmlkjihgfedcba';

function makeApp(options: OriginOptions) {
  const app = new Hono();
  app.use(origin(options));
  app.all('/x', (c) => c.json({ reached: true }));
  return app;
}

const production: OriginOptions = { allowedExtensionIds: [ALLOWED_ID], development: false };
const development: OriginOptions = { allowedExtensionIds: [ALLOWED_ID], development: true };

describe('origin middleware', () => {
  it('accepts an allow-listed extension id and sets CORS for that origin only', async () => {
    const o = `chrome-extension://${ALLOWED_ID}`;
    const res = await makeApp(production).request('/x', { headers: { origin: o } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(o);
  });

  it('rejects an extension id not in the list with 403 and no CORS header', async () => {
    const res = await makeApp(production).request('/x', {
      headers: { origin: `chrome-extension://${OTHER_ID}` },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden_origin' });
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('rejects a missing origin', async () => {
    expect((await makeApp(production).request('/x')).status).toBe(403);
  });

  it('rejects other web origins, including a wildcard-looking one', async () => {
    for (const o of ['https://example.com', '*', 'null', 'chrome-extension://*']) {
      const res = await makeApp(production).request('/x', { headers: { origin: o } });
      expect(res.status).toBe(403);
    }
  });

  it('rejects localhost outside development', async () => {
    const res = await makeApp(production).request('/x', {
      headers: { origin: 'http://localhost:5173' },
    });
    expect(res.status).toBe(403);
  });

  it('accepts http://localhost with or without a port in development', async () => {
    for (const o of ['http://localhost:5173', 'http://localhost']) {
      const res = await makeApp(development).request('/x', { headers: { origin: o } });
      expect(res.status).toBe(200);
    }
  });

  it('does not accept lookalike localhost hosts in development', async () => {
    const lookalikes = [
      'http://localhost.evil.com',
      'https://localhost:3000',
      'http://localhost:3000@evil.com',
    ];
    for (const o of lookalikes) {
      const res = await makeApp(development).request('/x', { headers: { origin: o } });
      expect(res.status).toBe(403);
    }
  });

  it('answers preflight for an allowed origin without reaching the handler, and 403 for others', async () => {
    const ok = await makeApp(production).request('/x', {
      method: 'OPTIONS',
      headers: { origin: `chrome-extension://${ALLOWED_ID}` },
    });
    expect(ok.status).toBe(204);
    expect(ok.headers.get('access-control-allow-headers')).toContain('x-bscf-client');
    const bad = await makeApp(production).request('/x', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    expect(bad.status).toBe(403);
  });
});
