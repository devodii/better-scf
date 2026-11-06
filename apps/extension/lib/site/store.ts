import { createRpcClient, type RpcClient, type RpcMessenger, sendMessage } from '../db/rpc';
import {
  findReceivedSection,
  parseRoundPayload,
  readInlineScripts,
  type SubmissionSummary,
} from './round';
import type { Route } from './routes';
import { SUBMISSION_SELECTORS as SEL, SUBMISSION_TEXT as TXT } from './selectors/submission';
import { parseSubmissionPage, type SubmissionPage } from './submission';

export type PageData =
  | {
      kind: 'round';
      roundId: string;
      roundName: string | null;
      records: readonly SubmissionSummary[] | null;
    }
  | { kind: 'submission'; submissionId: string; page: SubmissionPage | null }
  | { kind: 'roundList' | 'myProjects' | 'other' };

export interface SiteStore {
  readonly rpc: RpcClient;
  readonly send: RpcMessenger['sendMessage'];
  isReady(route: Route, region: Element): boolean;
  load(route: Route, region: Element, debug: boolean): Promise<PageData>;
  save(page: SubmissionPage): Promise<void>;
}

interface Seen {
  id: string;
  node: Element;
  text: string;
}

interface InlineRound {
  roundName: string | null;
  records: readonly SubmissionSummary[] | null;
}

const NO_RECORDS: InlineRound = { roundName: null, records: null };

const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();

function readTitle(region: Element): Omit<Seen, 'id'> | null {
  const node = region.querySelector(SEL.title);
  return node ? { node, text: clean(node.textContent) } : null;
}

function hasProjectStats(region: Element): boolean {
  for (const heading of region.querySelectorAll(SEL.sectionHeading)) {
    if (TXT.projectStats.test(clean(heading.textContent))) return true;
  }
  return false;
}

export function createSiteStore(initial: Route): SiteStore {
  const rpc = createRpcClient();
  let scripts: string[] | undefined;
  let inlineRound: InlineRound | undefined;
  let inlineSummary: { summary: SubmissionSummary } | null | undefined;
  let lastSubmission: Seen | null = null;
  let lastRound: Omit<Seen, 'text'> | null = null;

  const inlineScripts = (): string[] => {
    scripts ??= readInlineScripts(document);
    return scripts;
  };

  const roundRecords = (roundId: string): InlineRound => {
    if (initial.kind !== 'round' || initial.roundId !== roundId) return NO_RECORDS;
    if (!inlineRound) {
      const { roundName, submissions } = parseRoundPayload(inlineScripts(), roundId);
      inlineRound = roundName === null ? NO_RECORDS : { roundName, records: submissions };
    }
    return inlineRound;
  };

  const submissionPayload = (id: string): { summary: SubmissionSummary } | undefined => {
    if (initial.kind !== 'submission' || initial.submissionId !== id) return undefined;
    if (inlineSummary === undefined) {
      const summary = parseRoundPayload(inlineScripts(), null).submissions.find((r) => r.id === id);
      inlineSummary = summary ? { summary } : null;
    }
    return inlineSummary ?? undefined;
  };

  return {
    rpc,
    send: sendMessage,

    isReady(route, region) {
      if (route.kind === 'submission') {
        if (document.readyState === 'loading' || !hasProjectStats(region)) return false;
        const title = readTitle(region);
        if (!title) return false;
        const last = lastSubmission;
        return (
          !last ||
          last.id === route.submissionId ||
          last.node !== title.node ||
          last.text !== title.text
        );
      }
      if (route.kind === 'round') {
        if (document.readyState === 'loading') return false;
        const section = findReceivedSection(region);
        if (!section) return false;
        const last = lastRound;
        return !last || last.id === route.roundId || last.node !== section;
      }
      return true;
    },

    async load(route, region, debug) {
      if (route.kind === 'round') {
        const section = findReceivedSection(region);
        if (section) lastRound = { id: route.roundId, node: section };
        return { kind: 'round', roundId: route.roundId, ...roundRecords(route.roundId) };
      }
      if (route.kind === 'submission') {
        const id = route.submissionId;
        const title = readTitle(region);
        const page = await parseSubmissionPage(region, {
          id,
          payload: submissionPayload(id),
          debug,
        });
        if (title) lastSubmission = { id, ...title };
        return { kind: 'submission', submissionId: id, page };
      }
      return { kind: route.kind };
    },

    async save(page) {
      await rpc.putSubmissions([page.submission]);
      if (page.project) await rpc.mergeProject(page.project);
    },
  };
}
