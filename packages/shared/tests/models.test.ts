import { describe, expect, it } from 'vitest';
import {
  chatMessageSchema,
  parseHorizonSummary,
  parseNavState,
  parseReviewState,
  parseSubmission,
  parseWith,
  projectSchema,
  proposalContextSchema,
  roundSchema,
  trackSchema,
} from '../src/index';

const submission = {
  id: 'rec1',
  roundId: '46',
  projectId: 'p1',
  title: 'Sendzz',
  byLine: 'by Team',
  budgetUsd: 87000,
  status: 'Received',
  kind: 'build',
  track: 'integration',
  trackSource: 'api',
  category: null,
  tranches: [
    { index: 0, title: 'T1', totalUsd: null, deliverables: [{ title: 'D', totalUsd: 10 }] },
  ],
  onchainMetric: null,
  team: [{ name: 'A', role: null, github: 'a', x: null, linkedin: null }],
  teamSize: null,
  totalAwardedUsd: null,
  awardedSubmissions: null,
  links: { website: null, architecture: null, github: null, video: null },
  stellarAccounts: [],
  stellarContracts: [],
  sections: [
    { id: 's', title: 'S', anchorY: 10 },
    { id: 't', title: 'T' },
  ],
  contentHash: 'h',
  fetchedAt: 1,
};

describe('Submission', () => {
  it('parses a valid submission with nullable fields', () => {
    expect(parseSubmission(submission).ok).toBe(true);
  });

  it('rejects bad enums, missing fields and wrong types, without throwing', () => {
    expect(parseSubmission({ ...submission, track: 'weird' }).ok).toBe(false);
    expect(parseSubmission({ ...submission, trackSource: 'guess' }).ok).toBe(false);
    expect(parseSubmission({ ...submission, kind: 'x' }).ok).toBe(false);
    expect(parseSubmission({ ...submission, budgetUsd: '5' }).ok).toBe(false);
    expect(parseSubmission({ ...submission, budgetUsd: Number.NaN }).ok).toBe(false);
    expect(parseSubmission({ ...submission, id: '' }).ok).toBe(false);
    expect(parseSubmission({ ...submission, links: undefined }).ok).toBe(false);
    expect(parseSubmission(null).ok).toBe(false);
  });

  it('reports an error message on failure', () => {
    const r = parseSubmission({ ...submission, track: 'weird' });
    expect(!r.ok && r.error).toContain('track');
  });
});

describe('Track', () => {
  it('accepts the four tracks only', () => {
    for (const t of ['open', 'integration', 'rfp', 'unknown'])
      expect(trackSchema.safeParse(t).success).toBe(true);
    expect(trackSchema.safeParse('RFP').success).toBe(false);
  });
});

describe('Project and Round', () => {
  it('parse valid shapes and reject invalid ones', () => {
    const project = {
      id: 'p',
      name: 'N',
      submissionIds: ['a'],
      totalAwardedUsd: 120000,
      awardedSubmissions: 2,
      fetchedAt: 1,
    };
    expect(projectSchema.safeParse(project).success).toBe(true);
    expect(projectSchema.safeParse({ ...project, awardedSubmissions: -1 }).success).toBe(false);
    const round = {
      id: '46',
      name: 'SCF #46',
      phases: [{ name: 'Vote', startsAt: null, endsAt: 5 }],
      submissionIds: [],
      fetchedAt: 1,
    };
    expect(roundSchema.safeParse(round).success).toBe(true);
    expect(roundSchema.safeParse({ ...round, phases: [{ name: 'Vote' }] }).success).toBe(false);
  });
});

describe('ReviewState', () => {
  const review = {
    submissionId: 'r',
    stance: 'none',
    shortlisted: false,
    note: '',
    lastOpenedAt: null,
    openedCount: 0,
  };
  it('parses valid states and rejects invalid ones', () => {
    expect(parseReviewState(review).ok).toBe(true);
    expect(
      parseReviewState({ ...review, stance: 'support', lastOpenedAt: 5, openedCount: 2 }).ok,
    ).toBe(true);
    expect(parseReviewState({ ...review, stance: 'maybe' }).ok).toBe(false);
    expect(parseReviewState({ ...review, openedCount: 1.5 }).ok).toBe(false);
    expect(parseReviewState({ ...review, shortlisted: 'yes' }).ok).toBe(false);
  });
});

describe('NavState', () => {
  const nav = { routeKey: '/rounds/46?x=1', scrollY: 120, carouselIndex: 2, gridMode: true, ts: 1 };
  it('parses valid states and rejects invalid ones', () => {
    expect(parseNavState(nav).ok).toBe(true);
    expect(parseNavState({ ...nav, routeKey: '' }).ok).toBe(false);
    expect(parseNavState({ ...nav, carouselIndex: -1 }).ok).toBe(false);
    expect(parseNavState({ ...nav, scrollY: Number.POSITIVE_INFINITY }).ok).toBe(false);
  });
});

describe('ChatMessage', () => {
  it('parses with and without promptId, rejects a bad role', () => {
    const msg = { id: 'm', submissionId: 's', role: 'assistant', content: 'x', createdAt: 1 };
    expect(chatMessageSchema.safeParse(msg).success).toBe(true);
    expect(chatMessageSchema.safeParse({ ...msg, promptId: 'summarize-5' }).success).toBe(true);
    expect(chatMessageSchema.safeParse({ ...msg, role: 'system' }).success).toBe(false);
  });
});

describe('HorizonSummary', () => {
  const h = {
    accountId: 'G',
    createdAt: null,
    lastModifiedLedger: 10,
    xlmBalance: '100.0000000',
    trustlines: 3,
    lastActiveAt: null,
    fetchedAt: 1,
  };
  it('parses valid summaries and rejects invalid ones', () => {
    expect(parseHorizonSummary(h).ok).toBe(true);
    expect(parseHorizonSummary({ ...h, trustlines: -1 }).ok).toBe(false);
    expect(parseHorizonSummary({ ...h, xlmBalance: 100 }).ok).toBe(false);
  });
});

describe('ProposalContext', () => {
  it('enforces the context limit and page enum', () => {
    const ctx = { submissionId: 's', contentHash: 'h', page: 'round', context: 'x' };
    expect(proposalContextSchema.safeParse(ctx).success).toBe(true);
    expect(proposalContextSchema.safeParse({ ...ctx, context: 'x'.repeat(24001) }).success).toBe(
      false,
    );
    expect(proposalContextSchema.safeParse({ ...ctx, page: 'home' }).success).toBe(false);
  });
});

describe('parseWith', () => {
  it('returns a tagged result and never throws', () => {
    expect(parseWith(trackSchema, 'open')).toEqual({ ok: true, data: 'open' });
    expect(parseWith(trackSchema, 1).ok).toBe(false);
  });
});
