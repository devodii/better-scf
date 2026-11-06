import { createMiddleware } from 'hono/factory';
import { chatError } from 'shared';
import { z } from 'zod';

const clientIdSchema = z.uuidv4();

export interface ClientVariables {
  clientId: string;
}

export const client = createMiddleware<{ Variables: ClientVariables }>(async (c, next) => {
  const parsed = clientIdSchema.safeParse(c.req.header('x-bscf-client'));
  if (!parsed.success) {
    return c.json(chatError('missing_client', 'A valid client id is required.'), 400);
  }
  c.set('clientId', parsed.data);
  await next();
  return undefined;
});
