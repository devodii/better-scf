import { z } from 'zod';
import { ENRICH_CONCURRENCY, enrichSubmission } from '../../site/enrich';
import { publishFacts, readFacts } from '../../site/round-facts';
import { defineTool } from './registry';

const DEADLINE_MS = 65_000;

export const tool = defineTool({
  name: 'read_proposals',
  description:
    'Reads many proposals at once (up to 200 ids) so their derived facts, such as track (open, integration, rfp), team and funding history, become available in run_js as tracks and facts. Use it before answering anything about tracks or teams across a round. Takes up to a minute for a large round. Get the ids from a round page via fetch_page.',
  timeoutMs: DEADLINE_MS + 3000,
  input: z.object({
    ids: z
      .array(z.string().regex(/^rec[A-Za-z0-9]{14}$/))
      .min(1)
      .max(200),
  }),
  run: async ({ ids }) => {
    const known = readFacts();
    const pending = [...new Set(ids)].filter((id) => !known.has(id));
    const control = new AbortController();
    const timer = setTimeout(() => control.abort(), DEADLINE_MS);
    let cursor = 0;
    let loaded = 0;
    const worker = async (): Promise<void> => {
      while (!control.signal.aborted) {
        const id = pending[cursor++];
        if (id === undefined) return;
        const data = await enrichSubmission(id, control.signal);
        if (data) {
          publishFacts(data);
          loaded += 1;
        }
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(ENRICH_CONCURRENCY, pending.length) }, () => worker()),
    );
    clearTimeout(timer);
    const tracks: Record<string, number> = {};
    for (const id of ids) {
      const track = readFacts().get(id)?.track ?? 'unknown';
      tracks[track] = (tracks[track] ?? 0) + 1;
    }
    return {
      requested: ids.length,
      alreadyKnown: ids.length - pending.length,
      loaded,
      notLoaded: pending.length - loaded,
      tracks,
      note: 'Track counts include "unknown" for proposals without a determinable track. Use run_js with tracks and facts to join them to your records.',
    };
  },
});
