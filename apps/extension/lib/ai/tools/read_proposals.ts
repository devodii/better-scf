import { z } from "zod";
import { ENRICH_CONCURRENCY, enrichSubmission } from "../../site/enrich";
import {
  loadSavedFacts,
  publishFacts,
  readFacts,
} from "../../site/round-facts";
import { fetchRoundRecords } from "../../site/round-fetch";
import { defineTool } from "./registry";

const DEADLINE_MS = 65_000;

export const tool = defineTool({
  name: "read_proposals",
  description:
    "Reads proposals so their derived facts (track open, integration or rfp, team, funding history) become available in run_js as tracks and facts, and returns track counts. For a whole round pass only roundId (the rec id in the round page path): do not list ids, it is far faster. Otherwise pass up to 200 ids. Use it before answering anything about tracks or teams across a round.",
  timeoutMs: DEADLINE_MS + 3000,
  input: z.object({
    roundId: z
      .string()
      .regex(/^rec[A-Za-z0-9]{14}$/)
      .optional(),
    ids: z
      .array(z.string().regex(/^rec[A-Za-z0-9]{14}$/))
      .min(1)
      .max(200)
      .optional(),
  }),
  run: async ({ roundId, ids: listed }) => {
    const round = roundId ? await fetchRoundRecords(roundId) : null;
    const ids = [
      ...new Set(listed ?? round?.records?.map((record) => record.id) ?? []),
    ];
    if (ids.length === 0)
      return {
        error: roundId
          ? "That round could not be read. Check the round id."
          : "Pass roundId or ids.",
      };
    await loadSavedFacts();
    const known = readFacts();
    const pending = ids.filter((id) => !known.has(id));
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
      Array.from({ length: Math.min(ENRICH_CONCURRENCY, pending.length) }, () =>
        worker(),
      ),
    );
    clearTimeout(timer);
    const tracks: Record<string, number> = {};
    for (const id of ids) {
      const track = readFacts().get(id)?.track ?? "unknown";
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
