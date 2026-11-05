import type { ProposalContext } from 'shared';
import {
  buildPageRequest,
  buildRoundContext,
  buildSubmissionContext,
  computeContentHash,
  readPageSnapshot,
} from '../../../../lib/ai/context';
import type { PageData } from '../../../../lib/site/store';

export interface PageRequest {
  request: ProposalContext;
  cacheable: boolean;
}

const ROUND_NUMBER = /#\s*(\d+)/;

async function build(page: PageData): Promise<PageRequest> {
  if (page.kind === 'submission' && page.page) {
    const { submission, sectionTexts } = page.page;
    return {
      request: {
        submissionId: submission.id,
        contentHash: submission.contentHash,
        page: 'submission',
        context: buildSubmissionContext(submission, sectionTexts),
      },
      cacheable: true,
    };
  }
  if (page.kind === 'round' && page.records && page.records.length > 0) {
    const number = ROUND_NUMBER.exec(page.roundName ?? page.records[0]?.roundName ?? '')?.[1];
    if (number) {
      const context = buildRoundContext(
        number,
        page.records.map((record) => ({
          id: record.id,
          title: record.title,
          byLine: record.projectName ?? '',
          budgetUsd: record.budget,
          track: 'unknown',
        })),
      );
      return {
        request: {
          submissionId: `round:${page.roundId}`,
          contentHash: await computeContentHash([{ id: 'round', title: 'round', text: context }]),
          page: 'round',
          context,
        },
        cacheable: false,
      };
    }
  }
  return { request: await buildPageRequest(readPageSnapshot()), cacheable: false };
}

export function createRequestSource(page: PageData): () => Promise<PageRequest> {
  const cache = new Map<string, Promise<PageRequest>>();
  return () => {
    const path = location.pathname;
    let hit = cache.get(path);
    if (!hit) {
      hit = build(page);
      cache.set(path, hit);
    }
    return hit;
  };
}
