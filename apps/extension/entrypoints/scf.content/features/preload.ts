import { ENRICH_CONCURRENCY, enrichSubmission } from '../../../lib/site/enrich';
import { readOpenRoundIds } from '../../../lib/site/round';
import { publishFacts, readFacts } from '../../../lib/site/round-facts';
import { fetchRoundRecords } from '../../../lib/site/round-fetch';
import type { Feature } from '../../../lib/ui/feature';

const START_DELAY_MS = 1500;

async function preload(signal: AbortSignal): Promise<void> {
  const queue: string[] = [];
  for (const roundId of readOpenRoundIds()) {
    const { records } = await fetchRoundRecords(roundId);
    if (signal.aborted) return;
    for (const record of records ?? []) queue.push(record.id);
  }
  const known = readFacts();
  const pending = [...new Set(queue)].filter((id) => !known.has(id));
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (!signal.aborted) {
      const id = pending[cursor++];
      if (id === undefined) return;
      const data = await enrichSubmission(id, signal);
      if (signal.aborted) return;
      if (data) publishFacts(data);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(ENRICH_CONCURRENCY, pending.length) }, () => worker()),
  );
}

export const feature: Feature = {
  pages: ['roundList'],
  toggles: ['loadProposalPages'],
  mount({ signal, warn }) {
    const timer = window.setTimeout(() => {
      preload(signal).catch((error: unknown) => warn('preload', error));
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  },
};
