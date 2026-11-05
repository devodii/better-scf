import {
  createRevalidator,
  createRpcClient,
  PROJECT_INDEX_KEY,
  type ProjectIndexEntry,
  type ProjectIndexRecord,
  TTL_MS,
} from '../db';
import { AppError, assertNever } from '../errors';
import { SITE_ORIGIN } from './routes';

export type ProjectRecord = ProjectIndexEntry;

export type ProjectsIndexErrorKind = 'unavailable' | 'unreadable';

export class ProjectsIndexError extends AppError<ProjectsIndexErrorKind> {
  readonly status: number | undefined;

  private constructor(
    kind: ProjectsIndexErrorKind,
    message: string,
    status: number | undefined,
    cause: unknown,
  ) {
    super({ name: 'ProjectsIndexError', kind, message, cause });
    this.status = status;
  }

  static unavailable(statusOrCause?: unknown): ProjectsIndexError {
    const message = 'The projects list could not be loaded.';
    return typeof statusOrCause === 'number'
      ? new ProjectsIndexError('unavailable', message, statusOrCause, undefined)
      : new ProjectsIndexError('unavailable', message, undefined, statusOrCause);
  }

  static unreadable(): ProjectsIndexError {
    return new ProjectsIndexError(
      'unreadable',
      'The projects page had no readable project records.',
      undefined,
      undefined,
    );
  }

  userMessage(): string {
    switch (this.kind) {
      case 'unavailable':
        return 'The project list could not be loaded. Check your connection and try again.';
      case 'unreadable':
        return 'The project list could not be read. Try again later.';
      default:
        return assertNever(this.kind);
    }
  }
}

export interface MatchRange {
  start: number;
  end: number;
}

export interface ProjectMatch {
  project: ProjectRecord;
  titleRanges: MatchRange[];
  categoryRanges: MatchRange[];
}

export interface ProjectSearchResult {
  matches: ProjectMatch[];
  ready: boolean;
  error: ProjectsIndexError | null;
}

type FetchOutcome =
  | { ok: true; record: ProjectIndexRecord }
  | { ok: false; error: ProjectsIndexError };

interface Prepared {
  project: ProjectRecord;
  title: string;
  category: string;
}

interface Hit {
  rank: number;
  inTitle: boolean;
  range: MatchRange;
}

const PROJECTS_URL = `${SITE_ORIGIN}/projects`;
const FETCH_TIMEOUT_MS = 15_000;
const RETRY_AFTER_FAILURE_MS = 60_000;
const DEFAULT_LIMIT = 20;
const MAX_TOKENS = 8;
const MAX_RECORD_CHARS = 8192;
const FLIGHT_PUSH = /<script[^>]*>self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g;
const RECORD_START = /\{"id":"rec[A-Za-z0-9]+","slug":"/g;
const MARKS = /\p{M}/gu;
const WORD_CHAR = /[\p{L}\p{N}]/u;

const revalidate = createRevalidator();
const rpc = createRpcClient();

let prepared: Prepared[] | null = null;
let checkedAt = 0;
let failure: ProjectsIndexError | null = null;
let retryAt = 0;
let loading: Promise<boolean> | null = null;
let debugEnabled = false;
let reported = false;

export function setProjectsIndexDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

function debug(): void {
  if (!debugEnabled || reported) return;
  reported = true;
  console.debug('[better-scf] projects: no match for flightRecords');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeFlight(html: string): string {
  const chunks: string[] = [];
  for (const match of html.matchAll(FLIGHT_PUSH)) {
    try {
      const entry: unknown = JSON.parse(match[1] ?? '');
      if (Array.isArray(entry) && entry[0] === 1 && typeof entry[1] === 'string') {
        chunks.push(entry[1]);
      }
    } catch {}
  }
  return chunks.join('');
}

function sliceObject(text: string, start: number): string | null {
  const limit = Math.min(text.length, start + MAX_RECORD_CHARS);
  let depth = 0;
  let inString = false;
  for (let i = start; i < limit; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 92) i++;
      else if (c === 34) inString = false;
    } else if (c === 34) inString = true;
    else if (c === 123 || c === 91) depth++;
    else if (c === 125 || c === 93) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function toEntry(raw: string): ProjectRecord | null {
  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(record)) return null;
  const { id, slug, title, category, thumbnail, lastAwardedRound } = record;
  if (typeof id !== 'string' || typeof slug !== 'string' || typeof title !== 'string') return null;
  return {
    id,
    slug,
    title,
    category: typeof category === 'string' ? category : '',
    thumbnail: isObject(thumbnail) && typeof thumbnail.url === 'string' ? thumbnail.url : null,
    lastAwardedRound:
      typeof lastAwardedRound === 'number' && Number.isFinite(lastAwardedRound)
        ? lastAwardedRound
        : null,
  };
}

export function parseProjectRecords(html: string): ProjectRecord[] {
  try {
    const stream = decodeFlight(html);
    const seen = new Set<string>();
    const projects: ProjectRecord[] = [];
    for (const match of stream.matchAll(RECORD_START)) {
      const raw = sliceObject(stream, match.index);
      const project = raw ? toEntry(raw) : null;
      if (!project || seen.has(project.id)) continue;
      seen.add(project.id);
      projects.push(project);
    }
    return projects;
  } catch {
    return [];
  }
}

function foldChar(ch: string): string {
  const base = ch.normalize('NFD').replace(MARKS, '').toLowerCase();
  return base.length > 0 ? base.charAt(0) : ch;
}

function fold(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 128) out += code >= 65 && code <= 90 ? String.fromCharCode(code + 32) : text[i];
    else out += foldChar(text.charAt(i));
  }
  return out;
}

function prepare(project: ProjectRecord): Prepared {
  return { project, title: fold(project.title), category: fold(project.category) };
}

function adopt(record: ProjectIndexRecord): void {
  prepared = record.projects.map(prepare);
}

async function fetchProjects(): Promise<FetchOutcome> {
  try {
    const response = await fetch(PROJECTS_URL, {
      credentials: 'omit',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return { ok: false, error: ProjectsIndexError.unavailable(response.status) };
    const projects = parseProjectRecords(await response.text());
    if (projects.length === 0) {
      debug();
      return { ok: false, error: ProjectsIndexError.unreadable() };
    }
    return { ok: true, record: { key: PROJECT_INDEX_KEY, projects, fetchedAt: Date.now() } };
  } catch (cause) {
    return { ok: false, error: ProjectsIndexError.unavailable(cause) };
  }
}

async function run(): Promise<boolean> {
  const fetched: { error: ProjectsIndexError | null } = { error: null };
  try {
    const { value } = await revalidate<ProjectIndexRecord>({
      key: PROJECT_INDEX_KEY,
      read: () => rpc.getProjectIndex(),
      fetchFresh: async () => {
        const outcome = await fetchProjects();
        if (outcome.ok) return outcome.record;
        fetched.error = outcome.error;
        return null;
      },
      write: (record) => rpc.putProjectIndex(record),
      onUpdate: adopt,
    });
    if (value) {
      adopt(value);
      failure = null;
    } else if (!prepared) {
      failure = fetched.error ?? ProjectsIndexError.unavailable();
    }
  } catch (cause) {
    if (!prepared) failure = ProjectsIndexError.unavailable(cause);
  }
  checkedAt = Date.now();
  if (failure) retryAt = checkedAt + RETRY_AFTER_FAILURE_MS;
  return prepared !== null;
}

function needsLoad(now: number): boolean {
  if (prepared) return now - checkedAt >= TTL_MS.projectIndex;
  return failure === null || now >= retryAt;
}

export function loadProjectsIndex(): Promise<boolean> {
  if (loading) return loading;
  if (!needsLoad(Date.now())) return Promise.resolve(prepared !== null);
  loading = run().finally(() => {
    loading = null;
  });
  return loading;
}

export function reloadProjectsIndex(): Promise<boolean> {
  failure = null;
  retryAt = 0;
  return loadProjectsIndex();
}

function tokenize(query: string): string[] {
  const tokens = new Set<string>();
  for (const token of fold(query).split(/\s+/)) {
    if (token) tokens.add(token);
    if (tokens.size === MAX_TOKENS) break;
  }
  return [...tokens];
}

function locate(text: string, token: string): { at: number; prefix: boolean } | null {
  const first = text.indexOf(token);
  if (first < 0) return null;
  for (let at = first; at >= 0; at = text.indexOf(token, at + 1)) {
    if (at === 0 || !WORD_CHAR.test(text.charAt(at - 1))) return { at, prefix: true };
  }
  return { at: first, prefix: false };
}

function bestHit(item: Prepared, token: string): Hit | null {
  const title = locate(item.title, token);
  const category = locate(item.category, token);
  const range = (at: number): MatchRange => ({ start: at, end: at + token.length });
  if (title?.prefix) return { rank: 0, inTitle: true, range: range(title.at) };
  if (category?.prefix) return { rank: 1, inTitle: false, range: range(category.at) };
  if (title) return { rank: 2, inTitle: true, range: range(title.at) };
  if (category) return { rank: 3, inTitle: false, range: range(category.at) };
  return null;
}

function mergeRanges(ranges: MatchRange[]): MatchRange[] {
  const sorted = ranges.sort((a, b) => a.start - b.start);
  const merged: MatchRange[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push(range);
  }
  return merged;
}

function scoreItem(
  item: Prepared,
  tokens: readonly string[],
): (ProjectMatch & { rank: number }) | null {
  let rank = 0;
  const titleRanges: MatchRange[] = [];
  const categoryRanges: MatchRange[] = [];
  for (const token of tokens) {
    const hit = bestHit(item, token);
    if (!hit) return null;
    rank += hit.rank;
    (hit.inTitle ? titleRanges : categoryRanges).push(hit.range);
  }
  return {
    project: item.project,
    titleRanges: mergeRanges(titleRanges),
    categoryRanges: mergeRanges(categoryRanges),
    rank,
  };
}

export function searchProjects(query: string, limit: number = DEFAULT_LIMIT): ProjectSearchResult {
  try {
    const tokens = tokenize(query);
    if (tokens.length === 0) return { matches: [], ready: prepared !== null, error: failure };
    if (needsLoad(Date.now())) void loadProjectsIndex();
    if (!prepared) return { matches: [], ready: false, error: failure };
    const scored: (ProjectMatch & { rank: number })[] = [];
    for (const item of prepared) {
      const match = scoreItem(item, tokens);
      if (match) scored.push(match);
    }
    scored.sort(
      (a, b) =>
        a.rank - b.rank || (b.project.lastAwardedRound ?? -1) - (a.project.lastAwardedRound ?? -1),
    );
    const cap = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : DEFAULT_LIMIT;
    const matches = scored.slice(0, cap).map(({ project, titleRanges, categoryRanges }) => ({
      project,
      titleRanges,
      categoryRanges,
    }));
    return { matches, ready: true, error: null };
  } catch (cause) {
    return { matches: [], ready: prepared !== null, error: ProjectsIndexError.unavailable(cause) };
  }
}
