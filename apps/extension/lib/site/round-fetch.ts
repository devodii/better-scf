import { parseRoundPayload, readInlineScripts, type SubmissionSummary } from './round';
import { SITE_ORIGIN } from './routes';

export interface FetchedRound {
  roundName: string | null;
  records: readonly SubmissionSummary[] | null;
}

const NONE: FetchedRound = { roundName: null, records: null };
const known = new Map<string, Promise<FetchedRound>>();

export function fetchRoundRecords(roundId: string): Promise<FetchedRound> {
  const cached = known.get(roundId);
  if (cached) return cached;
  const next = fetch(`${SITE_ORIGIN}/dashboard/award-rounds/${encodeURIComponent(roundId)}`, {
    credentials: 'include',
    headers: { Accept: 'text/html' },
  })
    .then(async (response): Promise<FetchedRound> => {
      if (!response.ok) return NONE;
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const { roundName, submissions } = parseRoundPayload(readInlineScripts(doc), roundId);
      return roundName === null ? NONE : { roundName, records: submissions };
    })
    .catch((): FetchedRound => NONE);
  known.set(roundId, next);
  next.then((round) => {
    if (round.records === null) known.delete(roundId);
  });
  return next;
}
