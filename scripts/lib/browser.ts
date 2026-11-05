import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { type BrowserContext, chromium, type Page } from 'playwright';
import { type PageSpec, SITE_HOST } from './cli';
import { type VisitHooks, type VisitResult, visitWith } from './visit';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export interface Session {
  page: Page;
  attached: boolean;
  end(): Promise<void>;
}

export async function writeRepoFile(relativePath: string, content: string): Promise<string> {
  const target = resolve(REPO_ROOT, relativePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, 'utf8');
  return target;
}

async function attach(cdpUrl: string): Promise<Session> {
  const browser = await chromium.connectOverCDP(cdpUrl);
  const page = browser.contexts()[0]?.pages()[0];
  if (page === undefined) throw new Error(`The browser at ${cdpUrl} has no open page to use.`);
  return { page, attached: true, end: () => Promise.resolve() };
}

async function launch(): Promise<Session> {
  const context: BrowserContext = await chromium.launchPersistentContext(
    resolve(REPO_ROOT, '.profile'),
    { channel: 'chrome', headless: false, viewport: { width: 1280, height: 800 } },
  );
  const page = context.pages()[0] ?? (await context.newPage());
  return { page, attached: false, end: () => context.close() };
}

export function openSession(): Promise<Session> {
  const cdpUrl = process.env.BSCF_CDP;
  return cdpUrl ? attach(cdpUrl) : launch();
}

export async function waitForHumanLogin(session: Session): Promise<void> {
  if (session.attached) return;
  await session.page.goto(`https://${SITE_HOST}/`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  await rl.question('Log in in the browser window, then press Enter here to continue. ');
  rl.close();
}

export function visitPages(
  session: Session,
  pages: readonly PageSpec[],
  delayMs: number,
  hooks: VisitHooks<Page>,
): Promise<VisitResult> {
  return visitWith(session.page, pages, delayMs, hooks);
}

export function run(main: () => Promise<void>): void {
  main()
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    // An attached CDP connection is never closed, so it would keep Node alive without this.
    .finally(() => process.exit());
}
