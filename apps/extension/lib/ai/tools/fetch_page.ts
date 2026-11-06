import { z } from 'zod';
import { decodeFlight, parseObject, readInlineScripts, sliceObject } from '../../site/round';
import { SITE_ORIGIN } from '../../site/routes';
import { describeShapes, saveItem } from '../scratchpad';
import { defineTool } from './registry';

const MAX_TEXT_CHARS = 300_000;
const MAX_OBJECTS = 4000;
const MAX_HEADINGS = 30;
const MIN_GAP_MS = 400;
const RECORD_START = /\{"id":"(rec[A-Za-z0-9]{14})"/g;
const BLOCKED = /^\/(api|backend|_next)(\/|$)/;

let lastAt = 0;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function visibleText(doc: Document): string {
  const clone = doc.body.cloneNode(true);
  if (clone instanceof Element) {
    for (const node of clone.querySelectorAll('script,style,noscript,template,svg')) node.remove();
  }
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_CHARS);
}

function readObjects(stream: string): Record<string, unknown>[] {
  const seen = new Set<string>();
  const objects: Record<string, unknown>[] = [];
  for (const match of stream.matchAll(RECORD_START)) {
    const id = match[1];
    if (!id || seen.has(id)) continue;
    const raw = sliceObject(stream, match.index);
    const object = raw ? parseObject(raw) : null;
    if (!object) continue;
    seen.add(id);
    objects.push(object);
    if (objects.length >= MAX_OBJECTS) break;
  }
  return objects;
}

export const tool = defineTool({
  name: 'fetch_page',
  description:
    "Reads one page of the Community Fund site with the user's session and saves it in the scratchpad under a name. Returns an outline: headings, and the kinds of records found in the page data (keys, counts, one example). Then use run_js with data.<name> to count, filter or compare. Pages: /dashboard/award-rounds (all rounds with stats), /dashboard/award-rounds/<round id> (its submissions), /dashboard/submissions/<id>, /projects. GET only.",
  input: z.object({
    path: z.string().trim().min(1).max(200).describe('Site path such as /dashboard/award-rounds'),
    as: z.string().trim().min(1).max(40).describe('Name to save it under, e.g. rounds'),
  }),
  run: async ({ path, as }) => {
    if (!path.startsWith('/') || path.startsWith('//') || BLOCKED.test(path)) {
      return {
        ok: false,
        error: 'Only site pages are allowed, for example /dashboard/award-rounds.',
      };
    }
    const wait = lastAt + MIN_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    const response = await fetch(`${SITE_ORIGIN}${path}`, {
      credentials: 'include',
      headers: { Accept: 'text/html' },
    });
    if (new URL(response.url).pathname.includes('login')) {
      return { ok: false, error: 'The page needs a login and the user appears to be signed out.' };
    }
    if (!response.ok)
      return { ok: false, error: `The site answered ${response.status} for ${path}.` };
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const flight = decodeFlight(readInlineScripts(doc));
    const records = readObjects(flight);
    const headings = [...doc.querySelectorAll('h1,h2,h3,h4')]
      .map((heading) => (heading.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .slice(0, MAX_HEADINGS);
    const name = saveItem(as, { path, headings, records, flight, text: visibleText(doc) });
    return {
      ok: true,
      savedAs: `data.${name}`,
      fields:
        'data.<name> has: path, headings[], records[] (every record with an id found in the page data), flight (the raw page data text), text (visible text).',
      path,
      headings,
      recordCount: records.length,
      recordKinds: describeShapes(records),
    };
  },
});
