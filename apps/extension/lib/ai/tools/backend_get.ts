import { z } from 'zod';
import { backendGet } from '../../site/backend';
import { defineTool } from './registry';

export const tool = defineTool({
  name: 'backend_get',
  description:
    "Reads data from the Community Fund backend with the user's own session. Call it only because the user asked for something that needs it, never to look around or to repeat a request. Read only. Pass an endpoint id from list_endpoints (or its path) and the path params it needs. Results may be personal account data: share them only with the user.",
  input: z.object({
    endpoint: z.string().trim().min(1).max(200).describe('Endpoint id or allow-listed path'),
    params: z
      .record(z.string(), z.string().max(64))
      .optional()
      .describe('Path params such as { "round": "45" }'),
  }),
  run: async ({ endpoint, params }) => {
    const result = await backendGet(endpoint, params ?? {});
    if (!result.ok) {
      return result.retryAfterMs === undefined
        ? { error: result.error }
        : { error: result.error, retryAfterMs: result.retryAfterMs };
    }
    return { data: result.data, personal: result.personal, truncated: result.truncated };
  },
});
