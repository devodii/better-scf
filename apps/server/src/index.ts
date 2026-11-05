import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type Env, loadEnv } from './env.js';
import { client } from './middleware/client.js';
import { origin } from './middleware/origin.js';
import { createHealthRoute } from './routes/health.js';

// Keep in sync with package.json (a test asserts it).
export const SERVER_VERSION = '0.1.0';

export function createApp(env: Env) {
  const app = new Hono();

  // Open to any origin: deploy checks call it.
  app.route('/health', createHealthRoute({ version: SERVER_VERSION, model: env.MODEL }));

  // Guarded routes live under /v1. Order: origin, client, (rate limit, added by a later task), handler.
  const v1 = new Hono();
  v1.use(
    origin({
      allowedExtensionIds: env.ALLOWED_EXTENSION_IDS,
      development: env.NODE_ENV === 'development',
    }),
  );
  v1.use(client);
  app.route('/v1', v1);

  app.notFound((c) => c.json({ error: 'not_found' }, 404));

  // Never returns a stack or a thrown message; logs only the error name.
  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return c.json({ error: 'http_error' }, err.status);
    }
    console.error(`unhandled error: ${err.name}`);
    return c.json({ error: 'internal_error' }, 500);
  });

  return app;
}

export const app = createApp(loadEnv());
