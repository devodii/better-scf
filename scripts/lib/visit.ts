import type { PageSpec } from './cli';

export const NAVIGATION_TIMEOUT_MS = 45_000;

export interface Navigable {
  setDefaultTimeout(timeout: number): void;
  goto(url: string, options: { waitUntil: 'networkidle' }): Promise<unknown>;
}

export interface VisitHooks<TPage extends Navigable> {
  beforeNavigate(spec: PageSpec): void;
  onPage(page: TPage, spec: PageSpec): Promise<void>;
}

export interface SkippedPage {
  name: string;
  reason: 'timeout' | 'error';
  message: string;
}

export interface VisitResult {
  visited: string[];
  skipped: SkippedPage[];
}

export interface PageTracker {
  begin(name: string): void;
  current(): string;
}

export function createPageTracker(): PageTracker {
  let name = '';
  return {
    begin(next) {
      name = next;
    },
    current() {
      return name;
    },
  };
}

export function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === 'TimeoutError' || /timeout/i.test(error.message))
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((done) => setTimeout(done, ms));
}

export async function visitWith<TPage extends Navigable>(
  page: TPage,
  pages: readonly PageSpec[],
  delayMs: number,
  hooks: VisitHooks<TPage>,
): Promise<VisitResult> {
  const result: VisitResult = { visited: [], skipped: [] };
  page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
  for (const [index, spec] of pages.entries()) {
    if (index > 0) await sleep(delayMs);
    console.log(`[${index + 1}/${pages.length}] ${spec.name}: ${spec.url}`);
    hooks.beforeNavigate(spec);
    try {
      await page.goto(spec.url, { waitUntil: 'networkidle' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isTimeoutError(error)) {
        console.error(
          `  SKIPPED ${spec.name}: timed out after ${NAVIGATION_TIMEOUT_MS / 1000}s waiting for network idle. No fixture was saved and it was not retried; calls seen before the timeout stay recorded.`,
        );
        result.skipped.push({ name: spec.name, reason: 'timeout', message });
      } else {
        console.error(`  SKIPPED ${spec.name}: navigation failed, not retried: ${message}`);
        result.skipped.push({ name: spec.name, reason: 'error', message });
      }
      continue;
    }
    try {
      await hooks.onPage(page, spec);
      result.visited.push(spec.name);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`  SKIPPED ${spec.name}: reading the page failed, not retried: ${message}`);
      result.skipped.push({ name: spec.name, reason: 'error', message });
    }
  }
  return result;
}
