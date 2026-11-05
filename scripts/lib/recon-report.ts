import { z } from 'zod';
import { findKeyPaths, type Shape } from './shape';

export const reconProbeSchema = z.object({
  landmark: z.string().nullable(),
  landmarkHtml: z.string().nullable(),
  landmarkTooLarge: z.boolean(),
  hasTranche3Onchain: z.boolean(),
  mentionsComments: z.boolean(),
  scrollSnap: z.boolean(),
  carouselLibraries: z.array(z.string()),
});
export type ReconProbe = z.infer<typeof reconProbeSchema>;

export type CallKind = 'json' | 'rsc' | 'server-action' | 'other';

export interface RecordedCall {
  page: string;
  method: string;
  pattern: string;
  status: number;
  kind: CallKind;
  contentType: string;
  requestHeaderNames: string[];
  shape: Shape | null;
  count: number;
}

export interface PageFacts {
  page: string;
  landmark: string | null;
  fixture: string | null;
  hasTranche3Onchain: boolean;
  mentionsComments: boolean;
  scrollSnap: boolean;
  carouselLibraries: string[];
}

export interface ReconReport {
  site: string;
  calls: RecordedCall[];
  pages: PageFacts[];
}

export function callKey(
  call: Pick<RecordedCall, 'page' | 'method' | 'pattern' | 'status'>,
): string {
  return `${call.page} ${call.method} ${call.pattern} ${call.status}`;
}

const TRACK_KEYS = /track|category|type|kind|program/i;
const COMMENT_KEYS = /comment|discussion|reply|replies/i;

function pathsIn(calls: readonly RecordedCall[], pattern: RegExp): string[] {
  const found: string[] = [];
  for (const call of calls) {
    if (call.shape === null) continue;
    for (const path of findKeyPaths(call.shape, pattern)) found.push(`${call.pattern}: ${path}`);
  }
  return found;
}

function bullets(items: readonly string[], limit = 12): string[] {
  const shown = items.slice(0, limit).map((item) => `  - \`${item}\``);
  if (items.length > limit) shown.push(`  - ... and ${items.length - limit} more`);
  return shown;
}

export function renderSummary(report: ReconReport): string {
  const lines: string[] = [`# Site recon: ${report.site}`, '', '## Pages', ''];
  for (const page of report.pages) {
    lines.push(
      `- **${page.page}**: landmark ${page.landmark ?? 'none found'}, fixture ${page.fixture ?? 'not saved'}`,
    );
  }

  lines.push('', '## First-party XHR and fetch calls', '');
  if (report.calls.length === 0) {
    lines.push('None recorded.');
  } else {
    lines.push('| Page | Method | Pattern | Status | Kind | Count |', '|---|---|---|---|---|---|');
    for (const c of report.calls) {
      lines.push(
        `| ${c.page} | ${c.method} | \`${c.pattern}\` | ${c.status} | ${c.kind} | ${c.count} |`,
      );
    }
  }

  const trackPaths = pathsIn(report.calls, TRACK_KEYS);
  const commentPaths = pathsIn(report.calls, COMMENT_KEYS);
  const submissionPages = report.pages.filter((p) => p.hasTranche3Onchain);
  const commentPages = report.pages.filter((p) => p.mentionsComments);
  const snapPages = report.pages.filter((p) => p.scrollSnap);
  const libraries = [...new Set(report.pages.flatMap((p) => p.carouselLibraries))];
  const rscCalls = report.calls.filter((c) => c.kind === 'rsc' || c.kind === 'server-action');

  lines.push('', '## Open questions (build-spec section 12)', '');
  lines.push('1. Track field in the API or DOM?');
  lines.push(
    trackPaths.length > 0
      ? '  - Candidate key paths in JSON responses (check the real values in the browser):'
      : '  - No key named like track, category, type, kind or program in a recorded JSON response.',
    ...bullets(trackPaths),
  );
  if (rscCalls.length > 0) {
    lines.push(
      `  - ${rscCalls.length} call(s) are RSC or server actions, whose bodies are not JSON and were not inspected.`,
    );
  }
  lines.push(
    `  - "Tranche 3 Onchain Metric" heading present on: ${submissionPages.map((p) => p.page).join(', ') || 'no recorded page'}.`,
  );

  lines.push('2. Comments on submissions?');
  lines.push(
    commentPaths.length > 0
      ? '  - Candidate key paths:'
      : '  - No key named like comment, discussion or reply in a recorded JSON response.',
    ...bullets(commentPaths),
  );
  lines.push(
    `  - The word "comment" appears in the text of: ${commentPages.map((p) => p.page).join(', ') || 'no recorded page'}.`,
  );

  lines.push('3. Carousel implementation?');
  lines.push(
    `  - scroll-snap in use on: ${snapPages.map((p) => p.page).join(', ') || 'no recorded page'}.`,
    `  - Class names containing a known carousel library: ${libraries.join(', ') || 'none'}.`,
  );

  lines.push(
    '4. Does Chrome send `Origin` on content script fetches?',
    '  - Not answerable from a page visit; test it with the built extension against our own server.',
    '5. Model choice and per-client daily cap?',
    '  - A decision for the human, not something the site shows.',
    '',
  );
  return lines.join('\n');
}
