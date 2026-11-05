import type { StoreKey } from 'idb';
import {
  type ChatMessage,
  chatMessageSchema,
  type HorizonSummary,
  horizonSummarySchema,
  type NavState,
  navStateSchema,
  type Project,
  parseWith,
  projectSchema,
  type ReviewState,
  type Round,
  reviewStateSchema,
  roundSchema,
  type Submission,
  submissionSchema,
} from 'shared';
import type { z } from 'zod';
import {
  type AvatarRecord,
  avatarRecordSchema,
  type BetterScfDb,
  CACHE_STORE_NAMES,
  type Db,
  isStale,
  type OpenOptions,
  type OwnershipRecord,
  openBetterScfDb,
  ownershipRecordSchema,
  STORE_NAMES,
  type StoreName,
  TTL_MS,
} from './schema';

export interface Cached<T> {
  value: T;
  fetchedAt: number;
  stale: boolean;
}

export interface Repo {
  getSubmission(id: string): Promise<Cached<Submission> | null>;
  putSubmissions(submissions: readonly Submission[]): Promise<void>;
  listSubmissionsByRound(roundId: string): Promise<Cached<Submission>[]>;
  listSubmissionsByProject(projectId: string): Promise<Cached<Submission>[]>;

  getProject(id: string): Promise<Cached<Project> | null>;
  putProject(project: Project): Promise<void>;

  getRound(id: string): Promise<Cached<Round> | null>;
  putRound(round: Round): Promise<void>;

  getReview(submissionId: string): Promise<ReviewState | null>;
  putReview(review: ReviewState): Promise<void>;
  listReviews(): Promise<ReviewState[]>;
  markOpened(submissionId: string): Promise<ReviewState>;

  getNavState(routeKey: string): Promise<NavState | null>;
  putNavState(state: NavState): Promise<void>;

  listChat(submissionId: string): Promise<ChatMessage[]>;
  putChatMessage(message: ChatMessage): Promise<void>;
  clearChat(submissionId: string): Promise<void>;

  getHorizon(accountId: string): Promise<Cached<HorizonSummary> | null>;
  putHorizon(summary: HorizonSummary): Promise<void>;

  getAvatar(handleKey: string): Promise<Cached<AvatarRecord> | null>;
  putAvatar(avatar: AvatarRecord): Promise<void>;

  getOwnership(projectId: string): Promise<Cached<OwnershipRecord> | null>;
  putOwnership(ownership: OwnershipRecord): Promise<void>;

  clearCache(): Promise<void>;
  clearAll(): Promise<void>;
}

export function defaultReview(submissionId: string): ReviewState {
  return {
    submissionId,
    stance: 'none',
    shortlisted: false,
    note: '',
    lastOpenedAt: null,
    openedCount: 0,
  };
}

export function createRepo(db: Db): Repo {
  const now = Date.now;

  async function readOne<S extends StoreName, T>(
    store: S,
    key: StoreKey<BetterScfDb, S>,
    schema: z.ZodType<T>,
  ): Promise<T | null> {
    const raw: unknown = await db.get(store, key);
    if (raw === undefined) return null;
    const parsed = parseWith(schema, raw);
    return parsed.ok ? parsed.data : null;
  }

  function parseAll<T>(rows: readonly unknown[], schema: z.ZodType<T>): T[] {
    const out: T[] = [];
    for (const row of rows) {
      const parsed = parseWith(schema, row);
      if (parsed.ok) out.push(parsed.data);
    }
    return out;
  }

  function toCached<T>(value: T, fetchedAt: number, ttlMs: number): Cached<T> {
    return { value, fetchedAt, stale: isStale(fetchedAt, ttlMs, now()) };
  }

  const clearStores = async (stores: readonly StoreName[]): Promise<void> => {
    const tx = db.transaction([...stores], 'readwrite');
    await Promise.all([...stores.map((store) => tx.objectStore(store).clear()), tx.done]);
  };

  return {
    async getSubmission(id) {
      const value = await readOne('submissions', id, submissionSchema);
      return value && toCached(value, value.fetchedAt, TTL_MS.submissions);
    },
    async putSubmissions(submissions) {
      const tx = db.transaction('submissions', 'readwrite');
      await Promise.all([...submissions.map((s) => tx.store.put(s)), tx.done]);
    },
    async listSubmissionsByRound(roundId) {
      const rows = await db.getAllFromIndex('submissions', 'roundId', roundId);
      return parseAll(rows, submissionSchema).map((s) =>
        toCached(s, s.fetchedAt, TTL_MS.submissions),
      );
    },
    async listSubmissionsByProject(projectId) {
      const rows = await db.getAllFromIndex('submissions', 'projectId', projectId);
      return parseAll(rows, submissionSchema).map((s) =>
        toCached(s, s.fetchedAt, TTL_MS.submissions),
      );
    },

    async getProject(id) {
      const value = await readOne('projects', id, projectSchema);
      return value && toCached(value, value.fetchedAt, TTL_MS.projects);
    },
    async putProject(project) {
      await db.put('projects', project);
    },

    async getRound(id) {
      const value = await readOne('rounds', id, roundSchema);
      return value && toCached(value, value.fetchedAt, TTL_MS.rounds);
    },
    async putRound(round) {
      await db.put('rounds', round);
    },

    getReview: (submissionId) => readOne('review', submissionId, reviewStateSchema),
    async putReview(review) {
      await db.put('review', review);
    },
    async listReviews() {
      return parseAll(await db.getAll('review'), reviewStateSchema);
    },
    async markOpened(submissionId) {
      const tx = db.transaction('review', 'readwrite');
      const raw: unknown = await tx.store.get(submissionId);
      const parsed = raw === undefined ? null : parseWith(reviewStateSchema, raw);
      const current = parsed?.ok ? parsed.data : defaultReview(submissionId);
      const next: ReviewState = {
        ...current,
        lastOpenedAt: now(),
        openedCount: current.openedCount + 1,
      };
      await Promise.all([tx.store.put(next), tx.done]);
      return next;
    },

    async getNavState(routeKey) {
      const state = await readOne('navstate', routeKey, navStateSchema);
      if (!state) return null;
      if (isStale(state.ts, TTL_MS.navstate, now())) {
        await db.delete('navstate', routeKey);
        return null;
      }
      return state;
    },
    async putNavState(state) {
      await db.put('navstate', state);
    },

    async listChat(submissionId) {
      const rows = await db.getAllFromIndex('chat', 'submissionId', submissionId);
      return parseAll(rows, chatMessageSchema).sort((a, b) => a.createdAt - b.createdAt);
    },
    async putChatMessage(message) {
      await db.put('chat', message);
    },
    async clearChat(submissionId) {
      const tx = db.transaction('chat', 'readwrite');
      const keys = await tx.store.index('submissionId').getAllKeys(submissionId);
      await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done]);
    },

    async getHorizon(accountId) {
      const value = await readOne('horizon', accountId, horizonSummarySchema);
      return value && toCached(value, value.fetchedAt, TTL_MS.horizon);
    },
    async putHorizon(summary) {
      await db.put('horizon', summary);
    },

    async getAvatar(handleKey) {
      const value = await readOne('avatars', handleKey, avatarRecordSchema);
      return value && toCached(value, value.fetchedAt, TTL_MS.avatars);
    },
    async putAvatar(avatar) {
      await db.put('avatars', avatar);
    },

    async getOwnership(projectId) {
      const value = await readOne('ownership', projectId, ownershipRecordSchema);
      return value && toCached(value, value.checkedAt, TTL_MS.ownership);
    },
    async putOwnership(ownership) {
      await db.put('ownership', ownership);
    },

    clearCache: () => clearStores(CACHE_STORE_NAMES),
    clearAll: () => clearStores(STORE_NAMES),
  };
}

export function createRepoProvider(
  open: (options: OpenOptions) => Promise<Db> = openBetterScfDb,
): () => Promise<Repo> {
  let current: Promise<Repo> | undefined;
  const reset = (): void => {
    current = undefined;
  };
  return () => {
    current ??= open({ onTerminated: reset }).then(
      (db) => createRepo(db),
      (error: unknown) => {
        reset();
        throw error;
      },
    );
    return current;
  };
}

export interface RevalidateOptions<T> {
  key: string;
  read: () => Promise<Cached<T> | null>;
  fetchFresh: () => Promise<T | null>;
  write: (value: T) => Promise<void>;
  onUpdate?: (value: T) => void;
}

export interface RevalidateResult<T> {
  value: T | null;
  refresh: Promise<T | null> | null;
}

export type Revalidate = <T>(options: RevalidateOptions<T>) => Promise<RevalidateResult<T>>;

export function createRevalidator(): Revalidate {
  const inFlight = new Map<string, Promise<unknown>>();

  return async function revalidate<T>(options: RevalidateOptions<T>): Promise<RevalidateResult<T>> {
    const cached = await options.read();
    if (cached && !cached.stale) return { value: cached.value, refresh: null };

    const existing = inFlight.get(options.key);
    // cast: callers of one key always pass the same T
    let refresh = existing as Promise<T | null> | undefined;
    if (!refresh) {
      refresh = (async () => {
        try {
          const fresh = await options.fetchFresh();
          if (fresh === null) return null;
          await options.write(fresh);
          if (cached) options.onUpdate?.(fresh);
          return fresh;
        } catch {
          return null;
        } finally {
          inFlight.delete(options.key);
        }
      })();
      inFlight.set(options.key, refresh);
    }

    if (cached) return { value: cached.value, refresh };
    return { value: await refresh, refresh };
  };
}

export interface Mirror<V> {
  peek(key: string): V | undefined;
  set(key: string, value: V): void;
  delete(key: string): void;
  clear(): void;
  readThrough(key: string, load: () => Promise<V | null>): Promise<V | null>;
}

export interface MirrorTtl {
  ttlMs: number;
  now?: () => number;
}

export function createMirror<T>(ttl: MirrorTtl): Mirror<Cached<T>>;
export function createMirror<V>(): Mirror<V>;
export function createMirror(ttl?: MirrorTtl): Mirror<unknown> {
  const clock = ttl?.now ?? Date.now;
  const values = new Map<string, unknown>();
  const loading = new Map<string, Promise<unknown>>();
  const view = (entry: unknown): unknown => {
    if (!ttl) return entry;
    // cast: ttl mirrors only ever hold Cached values
    const cached = entry as Cached<unknown>;
    return { ...cached, stale: isStale(cached.fetchedAt, ttl.ttlMs, clock()) };
  };
  const isStaleHit = (entry: unknown): boolean =>
    ttl !== undefined && (view(entry) as Cached<unknown>).stale;

  return {
    peek: (key) => {
      const hit = values.get(key);
      return hit === undefined ? undefined : view(hit);
    },
    set: (key, value) => {
      values.set(key, value);
    },
    delete: (key) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
    readThrough(key, load) {
      const hit = values.get(key);
      if (hit !== undefined && !isStaleHit(hit)) return Promise.resolve(view(hit));
      const pending = loading.get(key);
      if (pending) return pending;
      const started = load()
        .then((value) => {
          if (value !== null) values.set(key, value);
          return value;
        })
        .finally(() => {
          loading.delete(key);
        });
      loading.set(key, started);
      return started;
    },
  };
}
