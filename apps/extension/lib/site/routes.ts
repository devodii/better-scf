export const SITE_ORIGIN = 'https://communityfund.stellar.org';

export type Route =
  | { kind: 'landing' }
  | { kind: 'roundList' }
  | { kind: 'round'; roundId: string }
  | { kind: 'submission'; submissionId: string }
  | { kind: 'myProjects' }
  | { kind: 'other' };

export type RouteKind = Route['kind'];

const ROUND_LIST = /^\/dashboard\/award-rounds$/;
const ROUND = /^\/dashboard\/award-rounds\/(rec[A-Za-z0-9]+)$/;
const SUBMISSION = /^\/dashboard\/submissions\/(rec[A-Za-z0-9]+)$/;
const MY_PROJECTS = /^\/dashboard\/projects$/;

const OTHER: Route = { kind: 'other' };

export function parseRoute(input: string | URL): Route {
  let url: URL;
  try {
    url = typeof input === 'string' ? new URL(input, SITE_ORIGIN) : input;
  } catch {
    return OTHER;
  }
  if (url.origin !== SITE_ORIGIN) return OTHER;
  const path = url.pathname.replace(/\/+$/, '');
  if (path === '') return { kind: 'landing' };
  if (ROUND_LIST.test(path)) return { kind: 'roundList' };
  const round = ROUND.exec(path)?.[1];
  if (round) return { kind: 'round', roundId: round };
  const submission = SUBMISSION.exec(path)?.[1];
  if (submission) return { kind: 'submission', submissionId: submission };
  if (MY_PROJECTS.test(path)) return { kind: 'myProjects' };
  return OTHER;
}
