import { z } from 'zod';
import { endpoints } from '../../site/catalog/endpoints';
import { defineTool } from './registry';

export const tool = defineTool({
  name: 'list_endpoints',
  description:
    'Lists the read-only backend endpoints backend_get can call: id, path, what it returns, the path params it needs and whether the data is personal. Optionally filter by a word.',
  input: z.object({
    filter: z.string().trim().max(60).optional().describe('Keep endpoints mentioning this word'),
  }),
  run: ({ filter }) => {
    const needle = filter?.toLowerCase();
    return endpoints
      .filter(
        (endpoint) =>
          !needle ||
          `${endpoint.id} ${endpoint.path} ${endpoint.description}`.toLowerCase().includes(needle),
      )
      .map(({ id, path, description, response, personal, params }) => ({
        id,
        path,
        description,
        response,
        personal,
        params: z.toJSONSchema(params, { io: 'input' }).properties ?? {},
      }));
  },
});
