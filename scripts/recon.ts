/**
 * Site recon (build-spec section 4.1). Run once by the human: `pnpm recon -- round=<url> ...`.
 *
 * Opens a headed Chrome with the persistent `.profile/` directory, waits while the human logs
 * in, then visits each named page once, in order, with a pause between pages. For each page it
 * records the site's own XHR and fetch calls (method, URL pattern, status, response shape) and
 * saves a scrubbed copy of the main landmark. It never types credentials, never reads cookies,
 * tokens or storage, never clicks, scrolls or follows links, never retries, and it records only
 * header names after stripping cookie, authorization and credential-like headers.
 */
import type { Response } from 'playwright';
import { openSession, visitPages, waitForHumanLogin, writeRepoFile } from './lib/browser';
import { parseCli, SITE_HOST } from './lib/cli';
import { RECON_PROBE } from './lib/page-scripts';
import {
  type CallKind,
  callKey,
  type PageFacts,
  type ReconReport,
  type RecordedCall,
  reconProbeSchema,
  renderSummary,
} from './lib/recon-report';
import { scrubHtml, stripSensitiveHeaders } from './lib/scrub';
import { describeShape, type Shape } from './lib/shape';
import { isFirstParty, normalizeUrlPattern } from './lib/url-pattern';
import { createPageTracker, type SkippedPage } from './lib/visit';

function classify(rawUrl: string, headerNames: readonly string[], contentType: string): CallKind {
  if (headerNames.includes('next-action')) return 'server-action';
  if (contentType.includes('text/x-component') || headerNames.includes('rsc')) return 'rsc';
  if (new URL(rawUrl).searchParams.has('_rsc')) return 'rsc';
  return contentType.includes('json') ? 'json' : 'other';
}

async function recordResponse(
  response: Response,
  pageName: string,
  calls: Map<string, RecordedCall>,
): Promise<void> {
  const request = response.request();
  const resourceType = request.resourceType();
  if (resourceType !== 'xhr' && resourceType !== 'fetch') return;
  if (!isFirstParty(response.url(), SITE_HOST)) return;
  const pattern = normalizeUrlPattern(response.url());
  if (pattern === null) return;

  const rawHeaders = request.headers();
  const contentType = (response.headers()['content-type'] ?? '').split(';')[0]?.trim() ?? '';
  const kind = classify(response.url(), Object.keys(rawHeaders), contentType);
  const key = callKey({
    page: pageName,
    method: request.method(),
    pattern,
    status: response.status(),
  });
  const existing = calls.get(key);
  if (existing) {
    existing.count += 1;
    return;
  }

  let shape: Shape | null = null;
  if (kind === 'json') {
    try {
      shape = describeShape(await response.json());
    } catch {
      shape = null; // empty or redirect body: nothing to describe
    }
  }
  calls.set(key, {
    page: pageName,
    method: request.method(),
    pattern,
    status: response.status(),
    kind,
    contentType,
    requestHeaderNames: Object.keys(stripSensitiveHeaders(rawHeaders)).sort(),
    shape,
    count: 1,
  });
}

async function main(): Promise<void> {
  const { pages, delayMs, redact } = parseCli(process.argv.slice(2));
  const calls = new Map<string, RecordedCall>();
  const facts: PageFacts[] = [];
  let skipped: SkippedPage[] = [];

  if (redact.length === 0) {
    console.warn(
      '\n!!! WARNING: no --redact literals were given. Names of people and projects are NOT scrubbed automatically (only emails, addresses, ids, profile links and similar patterns are). Re-run with --redact "Name One,Name Two" or review every fixture by hand before committing.\n',
    );
  }

  const context = await openSession();
  try {
    await waitForHumanLogin(context);
    // The tracker is set by `beforeNavigate`, before the navigation starts, so every response of
    // a page is recorded under that page's name.
    const tracker = createPageTracker();
    const pending: Promise<void>[] = [];
    const first = context.pages()[0];
    first?.on('response', (response) => {
      pending.push(recordResponse(response, tracker.current(), calls).catch(() => undefined));
    });

    const result = await visitPages(context, pages, delayMs, {
      beforeNavigate: (spec) => tracker.begin(spec.name),
      onPage: async (page, spec) => {
        const probe = reconProbeSchema.parse(await page.evaluate(RECON_PROBE));
        await Promise.allSettled(pending.splice(0));

        let fixture: string | null = null;
        if (probe.landmarkHtml !== null) {
          const scrubbed = scrubHtml(probe.landmarkHtml, redact);
          fixture = `tests/fixtures/scf/${spec.name}.html`;
          await writeRepoFile(fixture, scrubbed.html);
          console.log(`  saved ${fixture}; scrubbed: ${JSON.stringify(scrubbed.counts)}`);
        } else {
          console.log(
            probe.landmarkTooLarge
              ? '  landmark too large, fixture not saved'
              : '  no main landmark found, fixture not saved',
          );
        }
        facts.push({
          page: spec.name,
          landmark: probe.landmark,
          fixture,
          hasTranche3Onchain: probe.hasTranche3Onchain,
          mentionsComments: probe.mentionsComments,
          scrollSnap: probe.scrollSnap,
          carouselLibraries: probe.carouselLibraries,
        });
      },
    });
    await Promise.allSettled(pending.splice(0));
    skipped = result.skipped;
  } finally {
    await context.close();
  }

  const report: ReconReport = { site: SITE_HOST, calls: [...calls.values()], pages: facts };
  const jsonPath = await writeRepoFile(
    'docs/site-recon.json',
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`\nWrote ${jsonPath}`);
  console.log(
    'Review the fixtures for names and other personal data before committing; pass --redact "Name One,Name Two" to replace literal strings.\n',
  );
  if (skipped.length > 0) {
    console.error(
      `WARNING: ${skipped.length} page(s) were skipped and have no fixture: ${skipped.map((s) => `${s.name} (${s.reason === 'timeout' ? 'timed out waiting for network idle' : 'error'})`).join(', ')}. The summary below is incomplete; run again for those pages.\n`,
    );
  }
  console.log(renderSummary(report));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
