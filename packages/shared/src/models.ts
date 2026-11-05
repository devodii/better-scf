import { z } from 'zod';
import { CHAT_LIMITS } from './constants';

/** Data models of spec section 5.3. Everything scraped is nullable; parsers never throw. */

export const trackSchema = z.enum(['open', 'integration', 'rfp', 'unknown']);
export type Track = z.infer<typeof trackSchema>;

export const stanceSchema = z.enum(['none', 'support', 'unsure', 'against']);
export type Stance = z.infer<typeof stanceSchema>;

export const pageKindSchema = z.enum(['submission', 'round']);
export type PageKind = z.infer<typeof pageKindSchema>;

const usd = z.number().nullable();
const nullableString = z.string().nullable();

export const deliverableSchema = z.object({
  title: z.string(),
  totalUsd: usd,
});

export const trancheSchema = z.object({
  index: z.number().int().nonnegative(),
  title: z.string(),
  totalUsd: usd,
  deliverables: z.array(deliverableSchema),
});

export const teamMemberSchema = z.object({
  name: z.string(),
  role: nullableString,
  github: nullableString,
  x: nullableString,
  linkedin: nullableString,
});

export const submissionLinksSchema = z.object({
  website: nullableString,
  architecture: nullableString,
  github: nullableString,
  video: nullableString,
});

export const sectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  anchorY: z.number().optional(),
});

export const submissionSchema = z.object({
  id: z.string().min(1),
  roundId: z.string(),
  projectId: z.string(),
  title: z.string(),
  byLine: z.string(),
  budgetUsd: usd,
  status: z.string(),
  kind: z.enum(['build', 'other']),
  track: trackSchema,
  trackSource: z.enum(['api', 'heuristic', 'unknown']),
  category: nullableString,
  tranches: z.array(trancheSchema),
  onchainMetric: nullableString,
  team: z.array(teamMemberSchema),
  teamSize: z.number().int().nonnegative().nullable(),
  totalAwardedUsd: usd,
  awardedSubmissions: z.number().int().nonnegative().nullable(),
  links: submissionLinksSchema,
  stellarAccounts: z.array(z.string()),
  stellarContracts: z.array(z.string()),
  sections: z.array(sectionSchema),
  /** sha256 of normalized body text, used by the chat cache. */
  contentHash: z.string(),
  fetchedAt: z.number(),
});
export type Submission = z.infer<typeof submissionSchema>;

export const projectSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  submissionIds: z.array(z.string()),
  totalAwardedUsd: usd,
  awardedSubmissions: z.number().int().nonnegative().nullable(),
  fetchedAt: z.number(),
});
export type Project = z.infer<typeof projectSchema>;

export const roundSchema = z.object({
  /** For example "46". */
  id: z.string().min(1),
  name: z.string(),
  phases: z.array(
    z.object({
      name: z.string(),
      /** Epoch ms parsed from the visible date; null when the cell says TBD. */
      startsAt: z.number().nullable(),
      endsAt: z.number().nullable(),
    }),
  ),
  submissionIds: z.array(z.string()),
  fetchedAt: z.number(),
});
export type Round = z.infer<typeof roundSchema>;

export const reviewStateSchema = z.object({
  submissionId: z.string().min(1),
  stance: stanceSchema,
  shortlisted: z.boolean(),
  note: z.string(),
  lastOpenedAt: z.number().nullable(),
  openedCount: z.number().int().nonnegative(),
});
export type ReviewState = z.infer<typeof reviewStateSchema>;

export const navStateSchema = z.object({
  /** pathname + search */
  routeKey: z.string().min(1),
  scrollY: z.number(),
  carouselIndex: z.number().int().nonnegative(),
  gridMode: z.boolean(),
  ts: z.number(),
});
export type NavState = z.infer<typeof navStateSchema>;

export const chatMessageSchema = z.object({
  id: z.string().min(1),
  submissionId: z.string().min(1),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  promptId: z.string().optional(),
  createdAt: z.number(),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const horizonSummarySchema = z.object({
  accountId: z.string().min(1),
  /** ISO date of account creation, when Horizon reports it. */
  createdAt: nullableString,
  lastModifiedLedger: z.number().int().nonnegative().nullable(),
  /** Native balance as the string Horizon returns, for example "100.0000000". */
  xlmBalance: nullableString,
  trustlines: z.number().int().nonnegative().nullable(),
  /** ISO time of the last activity, when known. */
  lastActiveAt: nullableString,
  fetchedAt: z.number(),
});
export type HorizonSummary = z.infer<typeof horizonSummarySchema>;

/** What the extension sends the server about the page: the context document and its identity. */
export const proposalContextSchema = z.object({
  submissionId: z.string().min(1).max(CHAT_LIMITS.maxIdChars),
  contentHash: z.string().min(1).max(CHAT_LIMITS.maxIdChars),
  page: pageKindSchema,
  context: z.string().max(CHAT_LIMITS.maxContextChars),
});
export type ProposalContext = z.infer<typeof proposalContextSchema>;

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** Never throws: returns a tagged result. */
export function parseWith<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    error: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
  };
}

export const parseSubmission = (input: unknown): ParseResult<Submission> =>
  parseWith(submissionSchema, input);
export const parseReviewState = (input: unknown): ParseResult<ReviewState> =>
  parseWith(reviewStateSchema, input);
export const parseNavState = (input: unknown): ParseResult<NavState> =>
  parseWith(navStateSchema, input);
export const parseHorizonSummary = (input: unknown): ParseResult<HorizonSummary> =>
  parseWith(horizonSummarySchema, input);
