import { createHash } from 'node:crypto';
import Database from 'better-sqlite3';

/**
 * Answer cache for the quick prompts. Keyed by sha256(submissionId, contentHash,
 * promptId). Always an in-memory LRU; when a SQLite file path is passed in, answers
 * are also persisted there and read back after a restart. This module never reads
 * process.env: the caller passes the path.
 */

export interface CacheKeyParts {
  submissionId: string;
  contentHash: string;
  promptId: string;
}

export interface AnswerCache {
  get(key: string): string | undefined;
  set(key: string, answer: string): void;
  /** Releases the SQLite handle, if any. */
  close(): void;
}

export interface AnswerCacheOptions {
  /** Entries kept in memory. Defaults to 2000. */
  maxEntries?: number;
  /** SQLite file path. Omit to stay memory-only. */
  sqlitePath?: string | undefined;
  /**
   * Called with the error name only when the SQLite store cannot be opened and the
   * cache falls back to memory. Defaults to a fixed `console.warn` message.
   */
  onSqliteFallback?: (errorName: string) => void;
}

export const DEFAULT_MAX_ENTRIES = 2000;

export function cacheKey(parts: CacheKeyParts): string {
  // NUL separators keep ("ab","c") and ("a","bc") from colliding.
  return createHash('sha256')
    .update([parts.submissionId, parts.contentHash, parts.promptId].join('\0'))
    .digest('hex');
}

export function createMemoryCache(maxEntries: number = DEFAULT_MAX_ENTRIES): AnswerCache {
  // A Map iterates in insertion order, so the first key is the least recently used.
  const entries = new Map<string, string>();
  return {
    get(key) {
      const value = entries.get(key);
      if (value === undefined) return undefined;
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key, answer) {
      entries.delete(key);
      entries.set(key, answer);
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next();
        if (oldest.done) break;
        entries.delete(oldest.value);
      }
    },
    close() {
      entries.clear();
    },
  };
}

export function createSqliteCache(path: string): AnswerCache {
  const db = new Database(path);
  let select: ReturnType<typeof db.prepare<[string], { answer: string }>>;
  let upsert: ReturnType<typeof db.prepare<[string, string]>>;
  try {
    db.pragma('journal_mode = WAL');
    db.exec('CREATE TABLE IF NOT EXISTS answers (key TEXT PRIMARY KEY, answer TEXT NOT NULL)');
    select = db.prepare<[string], { answer: string }>('SELECT answer FROM answers WHERE key = ?');
    upsert = db.prepare<[string, string]>(
      'INSERT INTO answers (key, answer) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET answer = excluded.answer',
    );
  } catch (error) {
    db.close(); // a half-opened handle must not leak when the caller falls back
    throw error;
  }
  return {
    get: (key) => select.get(key)?.answer,
    set(key, answer) {
      upsert.run(key, answer);
    },
    close() {
      db.close();
    },
  };
}

/** Memory LRU in front; SQLite behind it only when `sqlitePath` is a non-empty string. */
export function createAnswerCache(options: AnswerCacheOptions = {}): AnswerCache {
  const memory = createMemoryCache(options.maxEntries ?? DEFAULT_MAX_ENTRIES);
  if (!options.sqlitePath) return memory;
  let store: AnswerCache;
  try {
    store = createSqliteCache(options.sqlitePath);
  } catch (error) {
    // Never log the path, the error message or any key/answer: the name is enough.
    const name = error instanceof Error ? error.name : 'UnknownError';
    if (options.onSqliteFallback) options.onSqliteFallback(name);
    else console.warn(`answer cache: SQLite store unavailable (${name}); using memory only`);
    return memory;
  }
  return {
    get(key) {
      const hot = memory.get(key);
      if (hot !== undefined) return hot;
      const stored = store.get(key);
      if (stored !== undefined) memory.set(key, stored);
      return stored;
    },
    set(key, answer) {
      memory.set(key, answer);
      store.set(key, answer);
    },
    close() {
      memory.close();
      store.close();
    },
  };
}
