import { createMiddleware } from 'hono/factory';
import { z } from 'zod';

const clientIdSchema = z.uuidv4();

export interface ClientVariables {
  clientId: string;
}

export const client = createMiddleware<{ Variables: ClientVariables }>(async (c, next) => {
  const parsed = clientIdSchema.safeParse(c.req.header('x-bscf-client'));
  if (!parsed.success) {
    return c.json({ error: 'invalid_client' }, 400);
  }
  c.set('clientId', parsed.data);
  await next();
  return undefined;
});
