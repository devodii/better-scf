import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';
import { REPO_ROOT, run, writeRepoFile } from './lib/browser';

const STATIC_DIR = resolve(REPO_ROOT, 'apps/extension/storybook-static');
const OUT_DIR = 'docs/verification';
const SHOT_PREFIX = 'pw-shot-';
const PORT = 5140;
const HOST = '127.0.0.1';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8',
};

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: string;
  exportName?: string;
}

interface StoryIndex {
  entries: Record<string, IndexEntry>;
}

async function readStories(): Promise<IndexEntry[]> {
  const raw = await readFile(join(STATIC_DIR, 'index.json'), 'utf8').catch(() => {
    throw new Error(`No Storybook build at ${STATIC_DIR}; run pnpm build-storybook first.`);
  });
  const index = JSON.parse(raw) as StoryIndex;
  return Object.values(index.entries).filter((entry) => entry.type === 'story');
}

function matches(story: IndexEntry, filters: readonly string[]): boolean {
  if (filters.length === 0) return true;
  const haystack = `${story.id} ${story.title} ${story.name}`.toLowerCase();
  return filters.some((filter) => haystack.includes(filter.toLowerCase()));
}

function serve(): Promise<Server> {
  const server = createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url ?? '/', `http://${HOST}`).pathname);
    const file = resolve(
      STATIC_DIR,
      `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`,
    );
    if (file !== STATIC_DIR && !file.startsWith(`${STATIC_DIR}${sep}`)) {
      res.writeHead(403).end();
      return;
    }
    stat(file)
      .then((info) => {
        if (!info.isFile()) throw new Error('not a file');
        res.writeHead(200, {
          'content-type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
        });
        createReadStream(file).pipe(res);
      })
      .catch(() => res.writeHead(404).end());
  });
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(PORT, HOST, () => done(server));
  });
}

function fileSegment(text: string): string {
  return text.replace(/[^A-Za-z0-9]+/g, '');
}

function shotName(story: IndexEntry): string {
  const component = fileSegment(story.title.split('/').at(-1) ?? story.title);
  return `${SHOT_PREFIX}${component}-${fileSegment(story.exportName ?? story.name)}.png`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderIndex(stories: readonly IndexEntry[]): string {
  const cards = stories
    .map(
      (story) => `    <figure>
      <figcaption><strong>${escapeHtml(story.title)}</strong> / ${escapeHtml(story.name)} <code>${escapeHtml(story.id)}</code></figcaption>
      <img src="${escapeHtml(shotName(story))}" alt="${escapeHtml(`${story.title} ${story.name}`)}">
    </figure>`,
    )
    .join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Story screenshots</title>
  <style>
    body { margin: 2rem; background: #0f0f0f; color: #fff; font-family: system-ui, sans-serif; }
    figure { margin: 0 0 2rem; }
    figcaption { margin-bottom: 0.5rem; }
    code { color: #b8a2ff; }
    img { display: block; max-width: 100%; border: 1px solid #282630; }
  </style>
</head>
<body>
  <h1>Story screenshots (${stories.length})</h1>
${cards}
</body>
</html>
`;
}

async function main(): Promise<void> {
  const { positionals } = parseArgs({
    args: process.argv.slice(2).filter((arg) => arg !== '--'),
    allowPositionals: true,
  });
  const stories = await readStories();
  const selected = stories.filter((story) => matches(story, positionals));
  if (selected.length === 0) {
    throw new Error(
      positionals.length === 0
        ? 'The Storybook build has no stories.'
        : `No story matches ${positionals.join(', ')}.`,
    );
  }

  const server = await serve();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failed: string[] = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    for (const story of selected) {
      await page.goto(`http://${HOST}:${PORT}/iframe.html?id=${story.id}&viewMode=story`);
      await page.locator('body.sb-show-main, body.sb-show-errordisplay').waitFor();
      await page.waitForLoadState('networkidle');
      const target = resolve(REPO_ROOT, OUT_DIR, shotName(story));
      const rendered = await page.locator('body.sb-show-main').count();
      if (rendered === 0) failed.push(story.id);
      const root = page.locator('#storybook-root');
      const box = rendered === 0 ? null : await root.boundingBox();
      if (box !== null && box.width > 0 && box.height > 0) {
        await root.screenshot({ path: target });
      } else {
        await page.screenshot({ path: target, fullPage: true });
      }
      console.log(`${rendered === 0 ? 'ERROR' : 'ok   '} ${story.id}`);
    }
  } finally {
    await browser.close();
    await new Promise((done) => server.close(done));
  }

  const files = new Set(await readdir(resolve(REPO_ROOT, OUT_DIR)));
  const indexed = stories.filter((story) => files.has(shotName(story)));
  const indexPath = await writeRepoFile(`${OUT_DIR}/stories.html`, renderIndex(indexed));
  console.log(`${selected.length} screenshot(s) in ${OUT_DIR}, index at ${indexPath}`);
  if (failed.length > 0) throw new Error(`Stories that failed to render: ${failed.join(', ')}`);
}

run(main);
