import { createHash } from 'node:crypto';

interface CacheKeyParts {
  submissionId: string;
  contentHash: string;
  promptId: string;
}

export interface AnswerCache {
  get(key: string): string | undefined;
  set(key: string, answer: string): void;
  close(): void;
}

const DEFAULT_MAX_ENTRIES = 2000;

export function cacheKey(parts: CacheKeyParts): string {
  // NUL separators keep ("ab","c") and ("a","bc") from colliding.
  return createHash('sha256')
    .update([parts.submissionId, parts.contentHash, parts.promptId].join('\0'))
    .digest('hex');
}

export function createMemoryCache(maxEntries: number = DEFAULT_MAX_ENTRIES): AnswerCache {
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
