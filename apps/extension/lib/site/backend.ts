import {
  buildEndpointPath,
  type EndpointEntry,
  endpoints,
  isAllowedBackendPath,
  type TrimRule,
} from './catalog/endpoints';
import { matchPath, type PathParams, patternToRegex } from './catalog/pattern';
import { SITE_ORIGIN } from './routes';
import { getSession } from './session';

export type BackendErrorKind = 'not-logged-in' | 'not-allowed' | 'rate-limited' | 'failed';

export interface BackendSuccess {
  ok: true;
  data: unknown;
  personal: boolean;
  truncated: boolean;
}

export interface BackendFailure {
  ok: false;
  error: BackendErrorKind;
  retryAfterMs?: number;
}

export type BackendResult = BackendSuccess | BackendFailure;

interface TrimState {
  strip: ReadonlySet<string>;
  maxItems: number;
  cut: boolean;
}

const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 64;
const MAX_IN_FLIGHT = 2;
const MAX_PER_WINDOW = 6;
const WINDOW_MS = 60_000;
const BACKOFF_START_MS = 5_000;
const BACKOFF_MAX_MS = 300_000;
const TIMEOUT_MS = 15_000;
const MAX_CHARS = 24_000;
const MAX_DEPTH = 12;

const compiled = endpoints.map((endpoint: EndpointEntry) => ({
  endpoint,
  regex: patternToRegex(endpoint.path),
}));

const cache = new Map<string, { at: number; result: BackendSuccess }>();
const sharing = new Map<string, Promise<BackendResult>>();
const waiters: Array<() => void> = [];
const sentAt: number[] = [];
let active = 0;
let blockedUntil = 0;
let backoffMs = 0;

export function findEndpointByPath(path: string): EndpointEntry | undefined {
  return compiled.find(({ regex }) => matchPath(regex, path))?.endpoint;
}

function fail(error: BackendErrorKind, retryAfterMs?: number): BackendFailure {
  return retryAfterMs === undefined ? { ok: false, error } : { ok: false, error, retryAfterMs };
}

function trimValue(value: unknown, state: TrimState, depth: number): unknown {
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= MAX_DEPTH) {
    state.cut = true;
    return null;
  }
  if (Array.isArray(value)) {
    const over = value.length > state.maxItems;
    const items = (over ? value.slice(0, state.maxItems) : value).map((item) =>
      trimValue(item, state, depth + 1),
    );
    if (!over) return items;
    state.cut = true;
    return { items, total: value.length };
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !state.strip.has(key.toLowerCase()))
      .map(([key, item]) => [key, trimValue(item, state, depth + 1)]),
  );
}

function trimForModel(raw: unknown, rule: TrimRule): { data: unknown; truncated: boolean } {
  const strip = new Set(rule.strip.map((key) => key.toLowerCase()));
  let maxItems = Math.max(1, rule.maxItems);
  for (;;) {
    const state: TrimState = { strip, maxItems, cut: false };
    const data = trimValue(raw, state, 0);
    const text = JSON.stringify(data);
    if (text.length <= MAX_CHARS) return { data, truncated: state.cut };
    if (maxItems === 1) {
      return {
        data: { text: text.slice(0, MAX_CHARS), totalChars: text.length },
        truncated: true,
      };
    }
    maxItems = Math.max(1, Math.floor(maxItems / 2));
  }
}

function acquire(): Promise<void> {
  if (active < MAX_IN_FLIGHT) {
    active++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}

function release(): void {
  const next = waiters.shift();
  if (next) next();
  else active--;
}

function reserve(now: number): number {
  if (now < blockedUntil) return blockedUntil - now;
  while (sentAt.length > 0 && now - (sentAt[0] ?? 0) >= WINDOW_MS) sentAt.shift();
  if (sentAt.length >= MAX_PER_WINDOW) return WINDOW_MS - (now - (sentAt[0] ?? now));
  sentAt.push(now);
  return 0;
}

function retryAfterHeader(value: string | null): number {
  const seconds = value === null ? Number.NaN : Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

function remember(path: string, result: BackendSuccess): void {
  cache.delete(path);
  cache.set(path, { at: Date.now(), result });
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
}

async function request(path: string, entry: EndpointEntry): Promise<BackendResult> {
  await acquire();
  try {
    const wait = reserve(Date.now());
    if (wait > 0) return fail('rate-limited', wait);
    const session = await getSession();
    if (session.status === 'not-logged-in') {
      cache.clear();
      return fail('not-logged-in');
    }
    if (session.status !== 'ok') return fail('failed');
    const response = await fetch(`${SITE_ORIGIN}${path}`, {
      method: 'GET',
      credentials: 'same-origin',
      redirect: 'error',
      headers: { Accept: 'application/json', Authorization: `Bearer ${session.token}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 429) {
      backoffMs = Math.min(BACKOFF_MAX_MS, Math.max(backoffMs * 2, BACKOFF_START_MS));
      const wait429 = Math.min(
        BACKOFF_MAX_MS,
        Math.max(backoffMs, retryAfterHeader(response.headers.get('retry-after'))),
      );
      blockedUntil = Date.now() + wait429;
      return fail('rate-limited', wait429);
    }
    if (response.status === 401) {
      cache.clear();
      return fail('not-logged-in');
    }
    if (response.status === 403) return fail('not-allowed');
    if (!response.ok) return fail('failed');
    backoffMs = 0;
    const raw: unknown = await response.json();
    const { data, truncated } = trimForModel(raw, entry.trim);
    const result: BackendSuccess = { ok: true, data, personal: entry.personal, truncated };
    remember(path, result);
    return result;
  } catch {
    return fail('failed');
  } finally {
    release();
  }
}

export async function backendGet(
  pathOrEndpointId: string,
  params: PathParams = {},
): Promise<BackendResult> {
  try {
    const path = pathOrEndpointId.startsWith('/')
      ? pathOrEndpointId
      : buildEndpointPath(pathOrEndpointId, params);
    if (path === null || !isAllowedBackendPath(path)) return fail('not-allowed');
    const entry = findEndpointByPath(path);
    if (!entry) return fail('not-allowed');

    const hit = cache.get(path);
    if (hit) {
      if (Date.now() - hit.at < CACHE_TTL_MS) return hit.result;
      cache.delete(path);
    }
    const shared = sharing.get(path);
    if (shared) return shared;

    const running = request(path, entry).finally(() => {
      sharing.delete(path);
    });
    sharing.set(path, running);
    return running;
  } catch {
    return fail('failed');
  }
}
