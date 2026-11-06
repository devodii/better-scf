import type { Submission } from 'shared';
import { browser } from 'wxt/browser';
import { z } from 'zod';
import { createRpcClient } from '../db';
import { settingsItem } from '../settings';
import { SITE_ORIGIN } from './routes';
import { parseSubmissionPage } from './submission';

export const ENRICH_MIN_GAP_MS = 1200;
export const ENRICH_MAX_PER_MINUTE = 12;
const WINDOW_MS = 60_000;
const BLOCK_MS = 15 * 60_000;
const MAX_QUEUED = 3;
const STATE_KEY = 'enrichState';
const PATH_PREFIX = '/dashboard/submissions/';
const CAPTCHA = /captcha|cf-challenge|challenge-platform|just a moment/i;

const blockReasonSchema = z.enum(['signed-out', 'forbidden', 'rate-limited', 'captcha']);
export type EnrichBlock = z.infer<typeof blockReasonSchema>;

const stateSchema = z
  .object({
    starts: z.array(z.number()).catch([]),
    block: z.object({ reason: blockReasonSchema, until: z.number() }).nullable().catch(null),
  })
  .catch({ starts: [], block: null });
type State = z.infer<typeof stateSchema>;

export interface EnrichedBuilder {
  name: string;
  role: string | null;
  linkedin: string | null;
}

export interface Enrichment {
  id: string;
  track: Exclude<Submission['track'], 'unknown'> | null;
  trackSource: Submission['trackSource'];
  builders: EnrichedBuilder[];
  builderCount: number;
  awardedUsd: number | null;
  awardedCount: number | null;
}

const BLOCK_STATUS: Record<number, EnrichBlock> = {
  401: 'signed-out',
  403: 'forbidden',
  429: 'rate-limited',
};

const BLOCK_MESSAGES: Record<EnrichBlock, string> = {
  'signed-out': 'Stopped: you are signed out of the site.',
  forbidden: 'Stopped: the site refused the request (403).',
  'rate-limited': 'Stopped: the site asked us to slow down (429).',
  captcha: 'Stopped: the site showed a captcha.',
};

export function enrichBlockMessage(reason: EnrichBlock): string {
  return BLOCK_MESSAGES[reason];
}

const rpc = createRpcClient();
const inflight = new Map<string, Promise<Enrichment | null>>();
const blockListeners = new Set<(reason: EnrichBlock) => void>();
let tail: Promise<unknown> = Promise.resolve();
let queued = 0;

export function toEnrichment(submission: Submission): Enrichment {
  return {
    id: submission.id,
    track: submission.track === 'unknown' ? null : submission.track,
    trackSource: submission.trackSource,
    builders: submission.team.map(({ name, role, linkedin }) => ({ name, role, linkedin })),
    builderCount: submission.team.length,
    awardedUsd: submission.totalAwardedUsd,
    awardedCount: submission.awardedSubmissions,
  };
}

async function readState(): Promise<State> {
  const now = Date.now();
  const state = stateSchema.parse((await browser.storage.local.get(STATE_KEY))[STATE_KEY] ?? {});
  return {
    starts: state.starts.filter((at) => at <= now && now - at < WINDOW_MS).sort((a, b) => a - b),
    block: state.block && state.block.until > now ? state.block : null,
  };
}

function writeState(state: State): Promise<void> {
  return browser.storage.local.set({ [STATE_KEY]: state });
}

export async function readEnrichBlock(): Promise<EnrichBlock | null> {
  return (await readState()).block?.reason ?? null;
}

export function onEnrichBlock(listener: (reason: EnrichBlock) => void): () => void {
  blockListeners.add(listener);
  return () => blockListeners.delete(listener);
}

async function stopFor(reason: EnrichBlock): Promise<void> {
  const state = await readState();
  await writeState({ ...state, block: { reason, until: Date.now() + BLOCK_MS } });
  for (const listener of blockListeners) listener(reason);
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const done = (): void => {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener('abort', done, { once: true });
  });
}

async function takeSlot(signal: AbortSignal): Promise<boolean> {
  for (;;) {
    if (signal.aborted || !(await settingsItem.get()).loadProposalPages) return false;
    const state = await readState();
    if (state.block) return false;
    const now = Date.now();
    const last = state.starts[state.starts.length - 1] ?? 0;
    const oldest = state.starts[0] ?? now;
    const gapWait = last + ENRICH_MIN_GAP_MS - now;
    const capWait = state.starts.length >= ENRICH_MAX_PER_MINUTE ? oldest + WINDOW_MS - now : 0;
    const wait = Math.max(gapWait, capWait);
    if (wait <= 0) {
      await writeState({ ...state, starts: [...state.starts, now] });
      return true;
    }
    await sleep(wait, signal);
  }
}

async function fetchOne(id: string, signal: AbortSignal): Promise<Enrichment | null> {
  try {
    if (!(await takeSlot(signal))) return null;
    const response = await fetch(`${SITE_ORIGIN}${PATH_PREFIX}${encodeURIComponent(id)}`, {
      credentials: 'include',
      headers: { Accept: 'text/html' },
      signal,
    });
    const blocked = BLOCK_STATUS[response.status];
    if (blocked) {
      await stopFor(blocked);
      return null;
    }
    if (!response.ok) return null;
    if (response.redirected && !new URL(response.url).pathname.startsWith(PATH_PREFIX)) {
      await stopFor('signed-out');
      return null;
    }
    const html = await response.text();
    const page = await parseSubmissionPage(new DOMParser().parseFromString(html, 'text/html'), {
      id,
    });
    if (!page) {
      if (CAPTCHA.test(html)) await stopFor('captcha');
      return null;
    }
    await rpc.putSubmissions([page.submission]).catch(() => {});
    return toEnrichment(page.submission);
  } catch {
    return null;
  }
}

async function run(id: string, signal: AbortSignal): Promise<Enrichment | null> {
  const cached = await rpc.getSubmission(id).catch(() => null);
  if (cached && !cached.stale) return toEnrichment(cached.value);
  if (signal.aborted || queued >= MAX_QUEUED) return null;
  queued += 1;
  const turn = tail.then(() => fetchOne(id, signal));
  tail = turn;
  try {
    return await turn;
  } finally {
    queued -= 1;
  }
}

export function enrichSubmission(id: string, signal: AbortSignal): Promise<Enrichment | null> {
  const pending = inflight.get(id);
  if (pending) return pending;
  const next = run(id, signal).finally(() => inflight.delete(id));
  inflight.set(id, next);
  return next;
}
