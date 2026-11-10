import { AppError, assertNever, type ToolErrorResult } from "../errors";
import {
  buildEndpointPath,
  type EndpointEntry,
  endpoints,
  isAllowedBackendPath,
  type TrimRule,
} from "./catalog/endpoints";
import { matchPath, type PathParams, patternToRegex } from "./catalog/pattern";
import { SITE_ORIGIN } from "./routes";
import { getSession, type SessionError } from "./session";

export type BackendErrorKind =
  "not-logged-in" | "not-allowed" | "rate-limited" | "failed";

export interface BackendToolResult extends ToolErrorResult<BackendErrorKind> {
  retryAfterMs?: number;
}

interface BackendErrorDetail {
  status?: number;
  path?: string;
  retryAfterMs?: number;
  cause?: unknown;
}

const MAX_PATH_CHARS = 120;

class BackendError extends AppError<BackendErrorKind> {
  readonly status: number | undefined;
  readonly path: string | undefined;
  readonly retryAfterMs: number | undefined;

  private constructor(
    kind: BackendErrorKind,
    message: string,
    detail: BackendErrorDetail,
  ) {
    super({ name: "BackendError", kind, message, cause: detail.cause });
    this.status = detail.status;
    this.path = detail.path;
    this.retryAfterMs = detail.retryAfterMs;
  }

  static notLoggedIn(): BackendError {
    return new BackendError(
      "not-logged-in",
      "The user is not signed in to the Community Fund.",
      {},
    );
  }

  static notAllowed(path: string): BackendError {
    return new BackendError(
      "not-allowed",
      "That backend path is not on the read-only allow-list.",
      {
        path: path.replace(/[?#].*$/s, "").slice(0, MAX_PATH_CHARS),
      },
    );
  }

  static rateLimited(retryAfterMs: number): BackendError {
    return new BackendError(
      "rate-limited",
      "The backend is rate limited. Wait before asking again.",
      {
        retryAfterMs,
      },
    );
  }

  static failed(statusOrCause?: unknown): BackendError {
    const message = "The backend request failed.";
    return typeof statusOrCause === "number"
      ? new BackendError("failed", message, { status: statusOrCause })
      : new BackendError("failed", message, { cause: statusOrCause });
  }

  userMessage(): string {
    switch (this.kind) {
      case "not-logged-in":
        return "You're not signed in to the Community Fund. Sign in on the site, then try again.";
      case "not-allowed":
        return "That data can't be read from the Community Fund.";
      case "rate-limited":
        return `The Community Fund asked us to slow down. Try again in ${Math.ceil((this.retryAfterMs ?? 0) / 1000)} seconds.`;
      case "failed":
        return "The Community Fund data could not be loaded. Please try again.";
      default:
        return assertNever(this.kind);
    }
  }

  override toToolResult(): BackendToolResult {
    const result = super.toToolResult();
    return this.retryAfterMs === undefined
      ? result
      : { ...result, retryAfterMs: this.retryAfterMs };
  }
}

export interface BackendSuccess {
  ok: true;
  data: unknown;
  full?: unknown;
  personal: boolean;
  truncated: boolean;
}

export interface BackendFailure {
  ok: false;
  error: BackendError;
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

interface VerifiedSession {
  token: string;
  owner: string;
}

const cache = new Map<
  string,
  { at: number; owner: string; result: BackendSuccess }
>();
const sharing = new Map<string, Promise<BackendResult>>();
const waiters: Array<() => void> = [];
const sentAt: number[] = [];
let active = 0;
let blockedUntil = 0;
let backoffMs = 0;
let cacheOwner = "";

function findEndpointByPath(path: string): EndpointEntry | undefined {
  return compiled.find(({ regex }) => matchPath(regex, path))?.endpoint;
}

function fail(error: BackendError): BackendFailure {
  return { ok: false, error };
}

function dropCache(): void {
  cache.clear();
  cacheOwner = "";
}

async function fingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return Array.from(new Uint8Array(digest).slice(0, 12), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function verifySession(): Promise<
  ({ ok: true } & VerifiedSession) | BackendFailure
> {
  const session = await getSession();
  if (!session.ok) return fail(fromSession(session.error));
  const owner = await fingerprint(session.token);
  if (owner !== cacheOwner) {
    cache.clear();
    cacheOwner = owner;
  }
  return { ok: true, token: session.token, owner };
}

function fromSession(error: SessionError): BackendError {
  switch (error.kind) {
    case "not-logged-in":
      dropCache();
      return BackendError.notLoggedIn();
    case "failed":
      return BackendError.failed(error);
    default:
      return assertNever(error.kind);
  }
}

function trimValue(value: unknown, state: TrimState, depth: number): unknown {
  if (typeof value !== "object" || value === null) return value;
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

function trimForModel(
  raw: unknown,
  rule: TrimRule,
): { data: unknown; truncated: boolean } {
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
  while (sentAt.length > 0 && now - (sentAt[0] ?? 0) >= WINDOW_MS)
    sentAt.shift();
  if (sentAt.length >= MAX_PER_WINDOW)
    return WINDOW_MS - (now - (sentAt[0] ?? now));
  sentAt.push(now);
  return 0;
}

function retryAfterHeader(value: string | null): number {
  const seconds = value === null ? Number.NaN : Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0;
}

function remember(path: string, owner: string, result: BackendSuccess): void {
  if (owner !== cacheOwner) return;
  cache.delete(path);
  cache.set(path, { at: Date.now(), owner, result });
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
}

async function request(
  path: string,
  entry: EndpointEntry,
  verified?: VerifiedSession,
): Promise<BackendResult> {
  await acquire();
  try {
    const wait = reserve(Date.now());
    if (wait > 0) return fail(BackendError.rateLimited(wait));
    const session = verified
      ? { ok: true as const, ...verified }
      : await verifySession();
    if (!session.ok) return session;
    const response = await fetch(`${SITE_ORIGIN}${path}`, {
      method: "GET",
      credentials: "same-origin",
      redirect: "error",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.status === 429) {
      backoffMs = Math.min(
        BACKOFF_MAX_MS,
        Math.max(backoffMs * 2, BACKOFF_START_MS),
      );
      const wait429 = Math.min(
        BACKOFF_MAX_MS,
        Math.max(
          backoffMs,
          retryAfterHeader(response.headers.get("retry-after")),
        ),
      );
      blockedUntil = Date.now() + wait429;
      return fail(BackendError.rateLimited(wait429));
    }
    if (response.status === 401) {
      dropCache();
      return fail(BackendError.notLoggedIn());
    }
    if (response.status === 403) return fail(BackendError.notAllowed(path));
    if (!response.ok) return fail(BackendError.failed(response.status));
    backoffMs = 0;
    const raw: unknown = await response.json();
    const { data, truncated } = trimForModel(raw, entry.trim);
    const result: BackendSuccess = {
      ok: true,
      data,
      full: entry.personal ? undefined : raw,
      personal: entry.personal,
      truncated,
    };
    remember(path, session.owner, result);
    return result;
  } catch (cause) {
    return fail(BackendError.failed(cause));
  } finally {
    release();
  }
}

export async function backendGet(
  pathOrEndpointId: string,
  params: PathParams = {},
): Promise<BackendResult> {
  try {
    const path = pathOrEndpointId.startsWith("/")
      ? pathOrEndpointId
      : buildEndpointPath(pathOrEndpointId, params);
    if (path === null || !isAllowedBackendPath(path)) {
      return fail(BackendError.notAllowed(path ?? pathOrEndpointId));
    }
    const entry = findEndpointByPath(path);
    if (!entry) return fail(BackendError.notAllowed(path));

    let verified: VerifiedSession | undefined;
    if (entry.personal) {
      const session = await verifySession();
      if (!session.ok) return session;
      verified = { token: session.token, owner: session.owner };
    }

    const hit = cache.get(path);
    if (hit) {
      if (
        Date.now() - hit.at < CACHE_TTL_MS &&
        (!verified || hit.owner === verified.owner)
      ) {
        return hit.result;
      }
      cache.delete(path);
    }
    const key = verified ? `${verified.owner}:${path}` : path;
    const shared = sharing.get(key);
    if (shared) return shared;

    const running = request(path, entry, verified).finally(() => {
      sharing.delete(key);
    });
    sharing.set(key, running);
    return running;
  } catch (cause) {
    return fail(BackendError.failed(cause));
  }
}
