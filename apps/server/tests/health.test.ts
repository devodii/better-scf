import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { parseEnv } from '../src/env.js';
import { createApp, SERVER_VERSION } from '../src/index.js';

function makeApp(source: Record<string, string> = {}) {
  const result = parseEnv({ NODE_ENV: 'test', ...source });
  if (!result.ok) {
    throw new Error(result.message);
  }
  return createApp(result.env);
}

describe('GET /health', () => {
  it('returns ok, version and model with no origin or client header', async () => {
    const res = await makeApp({ MODEL: 'test-model' }).request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: SERVER_VERSION, model: 'test-model' });
  });

  it('is open to any origin', async () => {
    const res = await makeApp().request('/health', {
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(200);
  });

  it('reports the version from package.json', () => {
    const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
    // JSON.parse yields unknown shape; the test only reads version.
    const pkg = JSON.parse(raw) as { version: string };
    expect(SERVER_VERSION).toBe(pkg.version);
  });
});

describe('guards on /v1', () => {
  it('answers 403 before anything else for a foreign origin', async () => {
    const res = await makeApp().request('/v1/anything', {
      headers: { origin: 'https://evil.example' },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'forbidden_origin' });
  });

  it('answers 404 with a stable shape for unknown routes', async () => {
    const res = await makeApp().request('/nope');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });
});

describe('onError', () => {
  it('returns only an error code, never the thrown message or a stack', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = makeApp();
    app.get('/boom', () => {
      throw new Error('secret-detail sk-ant-123');
    });
    const res = await app.request('/boom');
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: 'internal_error' });
    expect(text).not.toContain('secret-detail');
    expect(spy.mock.calls.flat().join(' ')).not.toContain('sk-ant');
    spy.mockRestore();
  });
});
