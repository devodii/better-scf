import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium, type Page } from 'playwright';
import { type PageSpec, SITE_HOST } from './cli';
import { type VisitHooks, type VisitResult, visitWith } from './visit';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export async function writeRepoFile(relativePath: string, content: string): Promise<string> {
  const target = resolve(REPO_ROOT, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  return target;
}

/**
 * Opens the machine's Chrome, headed, with the persistent `.profile/` directory so a login made
 * by the human survives between runs. The script never reads the profile's cookies or storage.
 */
export async function openSession(): Promise<BrowserContext> {
  return chromium.launchPersistentContext(resolve(REPO_ROOT, '.profile'), {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 800 },
  });
}

/**
 * Opens the site's front page once and waits for the human to log in by hand. Nothing is typed
 * or read on their behalf.
 */
export async function waitForHumanLogin(context: BrowserContext): Promise<void> {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`https://${SITE_HOST}/`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Log in in the browser window, then press Enter here to continue. ');
  rl.close();
}

/** Visits the pages in the session's first tab; see `visitWith` for the rules. */
export async function visitPages(
  context: BrowserContext,
  pages: readonly PageSpec[],
  delayMs: number,
  hooks: VisitHooks<Page>,
): Promise<VisitResult> {
  const page = context.pages()[0] ?? (await context.newPage());
  return visitWith(page, pages, delayMs, hooks);
}
