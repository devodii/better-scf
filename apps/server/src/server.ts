import { serve } from '@hono/node-server';
import { loadEnv } from './env.js';
import { app } from './index.js';

const { PORT } = loadEnv();

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`server listening on port ${info.port}`);
});
