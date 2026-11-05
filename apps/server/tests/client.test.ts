import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { type ClientVariables, client } from '../src/middleware/client.js';

function makeApp() {
  const app = new Hono<{ Variables: ClientVariables }>();
  app.use(client);
  app.get('/x', (c) => c.json({ clientId: c.get('clientId') }));
  return app;
}

const V4 = '3f8c1c0e-6d2a-4b7e-9a51-2c4d5e6f7a8b';

describe('client middleware', () => {
  it('passes a uuid v4 through and exposes it', async () => {
    const res = await makeApp().request('/x', { headers: { 'X-BSCF-Client': V4 } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ clientId: V4 });
  });

  it('answers 400 when the header is missing', async () => {
    const res = await makeApp().request('/x');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_client' });
  });

  it('answers 400 for non-uuid and non-v4 values without echoing them', async () => {
    const values = [
      'not-a-uuid',
      '',
      '3f8c1c0e-6d2a-1b7e-9a51-2c4d5e6f7a8b',
      '3f8c1c0e-6d2a-4b7e-0a51-2c4d5e6f7a8b',
    ];
    for (const value of values) {
      const res = await makeApp().request('/x', { headers: { 'X-BSCF-Client': value } });
      expect(res.status).toBe(400);
      const text = await res.text();
      expect(text).toBe('{"error":"invalid_client"}');
    }
  });
});
