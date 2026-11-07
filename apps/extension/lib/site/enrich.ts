import type { Submission } from "shared";
import { browser } from "wxt/browser";
import { z } from "zod";
import { createRpcClient } from "../db";
import { settingsItem } from "../settings";
import { SITE_ORIGIN } from "./routes";
import { PARSER_VERSION } from "./selectors/submission";
import { parseSubmissionPage } from "./submission";

export const ENRICH_CONCURRENCY = 20;
const BLOCK_MS = 15 * 60_000;
const MAX_FAILURES = 3;
const STATE_KEY = "enrichState";
const PATH_PREFIX = "/dashboard/submissions/";
const CAPTCHA = /captcha|cf-challenge|challenge-platform|just a moment/i;

const blockReasonSchema = z.enum([
  "signed-out",
  "forbidden",
  "rate-limited",
  "captcha",
  "unavailable",
  "redirected",
]);
export type EnrichBlock = z.infer<typeof blockReasonSchema>;

const stateSchema = z
  .object({
    failures: z.number().int().min(0).catch(0),
    block: z
      .object({ reason: blockReasonSchema, until: z.number() })
      .nullable()
      .catch(null),
  })
  .catch({ failures: 0, block: null });
type State = z.infer<typeof stateSchema>;

export interface EnrichedBuilder {
  name: string;
  role: string | null;
  linkedin: string | null;
  github: string | null;
  x: string | null;
}

export interface Enrichment {
  id: string;
  track: Exclude<Submission["track"], "unknown"> | null;
  trackSource: Submission["trackSource"];
  builders: EnrichedBuilder[];
  builderCount: number;
  awardedUsd: number | null;
  awardedCount: number | null;
  projectGithub: string | null;
}

const BLOCK_STATUS: Record<number, EnrichBlock> = {
  401: "signed-out",
  403: "forbidden",
  429: "rate-limited",
};

const BLOCK_MESSAGES: Record<EnrichBlock, string> = {
  "signed-out": "Stopped: you are signed out of the site.",
  forbidden: "Stopped: the site refused the request (403).",
  "rate-limited": "Stopped: the site asked us to slow down (429).",
  captcha: "Stopped: the site showed a captcha.",
  unavailable: "Stopped: the site failed three requests in a row.",
  redirected: "Stopped: the site sent us to another address.",
};

export function enrichBlockMessage(reason: EnrichBlock): string {
  return BLOCK_MESSAGES[reason];
}

const rpc = createRpcClient();
const inflight = new Map<string, Promise<Enrichment | null>>();
const blockListeners = new Set<(reason: EnrichBlock) => void>();

export function toEnrichment(submission: Submission): Enrichment {
  return {
    id: submission.id,
    track: submission.track === "unknown" ? null : submission.track,
    trackSource: submission.trackSource,
    builders: submission.team.map(({ name, role, linkedin, github, x }) => ({
      name,
      role,
      linkedin,
      github,
      x,
    })),
    builderCount: submission.team.length,
    awardedUsd: submission.totalAwardedUsd,
    awardedCount: submission.awardedSubmissions,
    projectGithub: submission.links.github,
  };
}

async function readState(): Promise<State> {
  const now = Date.now();
  const state = stateSchema.parse(
    (await browser.storage.local.get(STATE_KEY))[STATE_KEY] ?? {},
  );
  return {
    failures: state.failures,
    block: state.block && state.block.until > now ? state.block : null,
  };
}

function writeState(state: State): Promise<void> {
  return browser.storage.local.set({ [STATE_KEY]: state });
}

export async function readEnrichBlock(): Promise<EnrichBlock | null> {
  return (await readState()).block?.reason ?? null;
}

export function onEnrichBlock(
  listener: (reason: EnrichBlock) => void,
): () => void {
  blockListeners.add(listener);
  return () => blockListeners.delete(listener);
}

async function stopFor(reason: EnrichBlock): Promise<void> {
  const state = await readState();
  await writeState({
    ...state,
    failures: 0,
    block: { reason, until: Date.now() + BLOCK_MS },
  });
  for (const listener of blockListeners) listener(reason);
}

async function recordOutcome(failed: boolean): Promise<void> {
  const state = await readState();
  const failures = failed ? state.failures + 1 : 0;
  if (failures >= MAX_FAILURES) {
    await stopFor("unavailable");
    return;
  }
  if (failures !== state.failures) await writeState({ ...state, failures });
}

async function allowed(signal: AbortSignal): Promise<boolean> {
  if (signal.aborted || !(await settingsItem.get()).loadProposalPages)
    return false;
  return (await readState()).block === null;
}

async function readResponse(
  response: Response,
  id: string,
  frozen: boolean,
): Promise<Enrichment | null> {
  const url = new URL(response.url);
  if (response.redirected && url.origin !== SITE_ORIGIN) {
    await stopFor("redirected");
    return null;
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const reason = CAPTCHA.test(body)
      ? "captcha"
      : BLOCK_STATUS[response.status];
    if (reason) await stopFor(reason);
    else await recordOutcome(response.status >= 500);
    return null;
  }
  if (response.redirected && !url.pathname.startsWith(PATH_PREFIX)) {
    await stopFor("signed-out");
    return null;
  }
  const html = await response.text();
  const page = await parseSubmissionPage(
    new DOMParser().parseFromString(html, "text/html"),
    {
      id,
    },
  );
  if (!page) {
    if (CAPTCHA.test(html)) await stopFor("captcha");
    else await recordOutcome(false);
    return null;
  }
  await recordOutcome(false);
  if (frozen) await rpc.putSubmissions([page.submission]).catch(() => {});
  return toEnrichment(page.submission);
}

async function fetchOne(
  id: string,
  signal: AbortSignal,
  frozen: boolean,
): Promise<Enrichment | null> {
  if (!(await allowed(signal))) return null;
  try {
    const response = await fetch(
      `${SITE_ORIGIN}${PATH_PREFIX}${encodeURIComponent(id)}`,
      {
        credentials: "include",
        headers: { Accept: "text/html" },
        signal,
      },
    );
    return await readResponse(response, id, frozen);
  } catch {
    if (!signal.aborted) await recordOutcome(true).catch(() => {});
    return null;
  }
}

async function run(
  id: string,
  signal: AbortSignal,
  frozen: boolean,
  force: boolean,
): Promise<Enrichment | null> {
  if (frozen && !force) {
    const saved = await rpc.getSubmission(id).catch(() => null);
    if (saved && saved.value.parserVersion >= PARSER_VERSION)
      return toEnrichment(saved.value);
  }
  return fetchOne(id, signal, frozen);
}

export function enrichSubmission(
  id: string,
  signal: AbortSignal,
  frozen = false,
  force = false,
): Promise<Enrichment | null> {
  const pending = inflight.get(id);
  if (pending) return pending;
  const next = run(id, signal, frozen, force).finally(() =>
    inflight.delete(id),
  );
  inflight.set(id, next);
  return next;
}
