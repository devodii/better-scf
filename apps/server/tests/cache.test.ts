import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cacheKey,
  createAnswerCache,
  createMemoryCache,
  createSqliteCache,
} from '../src/ai/cache.js';

describe('cacheKey', () => {
  it('is a stable sha256 hex that changes with every part', () => {
    const base = { submissionId: 's1', contentHash: 'h1', promptId: 'p1' };
    expect(cacheKey(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(cacheKey(base)).toBe(cacheKey({ ...base }));
    expect(cacheKey({ ...base, submissionId: 's2' })).not.toBe(cacheKey(base));
    expect(cacheKey({ ...base, contentHash: 'h2' })).not.toBe(cacheKey(base));
    expect(cacheKey({ ...base, promptId: 'p2' })).not.toBe(cacheKey(base));
  });

  it('does not collide when parts shift characters between fields', () => {
    expect(cacheKey({ submissionId: 'ab', contentHash: 'c', promptId: 'd' })).not.toBe(
      cacheKey({ submissionId: 'a', contentHash: 'bc', promptId: 'd' }),
    );
  });
});

describe('memory cache', () => {
  it('evicts the least recently used entry', () => {
    const cache = createMemoryCache(2);
    cache.set('a', '1');
    cache.set('b', '2');
    expect(cache.get('a')).toBe('1'); // a is now most recent
    cache.set('c', '3');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe('1');
    expect(cache.get('c')).toBe('3');
  });

  it('overwrites without growing and defaults to 2000 entries', () => {
    const cache = createMemoryCache();
    for (let i = 0; i < 2001; i += 1) cache.set(`k${i}`, 'v');
    expect(cache.get('k0')).toBeUndefined();
    expect(cache.get('k1')).toBe('v');
    expect(cache.get('k2000')).toBe('v');
    cache.set('k1', 'new');
    expect(cache.get('k1')).toBe('new');
    expect(cache.get('k2')).toBe('v');
  });
});

describe('sqlite store', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'bscf-cache-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('persists answers across handles and overwrites a key', () => {
    const file = join(dir, 'cache.db');
    const first = createSqliteCache(file);
    first.set('k', 'one');
    first.set('k', 'two');
    first.close();
    const second = createSqliteCache(file);
    expect(second.get('k')).toBe('two');
    expect(second.get('missing')).toBeUndefined();
    second.close();
  });

  it('is used by the layered cache only when a path is given, and survives restart past LRU eviction', () => {
    const file = join(dir, 'layered.db');
    const first = createAnswerCache({ maxEntries: 1, sqlitePath: file });
    first.set('a', 'A');
    first.set('b', 'B'); // evicts a from memory, still in sqlite
    first.close();
    const second = createAnswerCache({ maxEntries: 1, sqlitePath: file });
    expect(second.get('a')).toBe('A');
    second.close();

    const memoryOnly = createAnswerCache({ maxEntries: 1 });
    memoryOnly.set('a', 'A');
    memoryOnly.close();
    expect(createAnswerCache({ maxEntries: 1 }).get('a')).toBeUndefined();
  });

  it('falls back to memory and reports only the error name when the directory is missing', () => {
    const reported: string[] = [];
    const missing = join(dir, 'does-not-exist', 'cache.db');
    const cache = createAnswerCache({
      sqlitePath: missing,
      onSqliteFallback: (name) => reported.push(name),
    });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    expect(reported).toHaveLength(1);
    expect(reported[0]).not.toContain(dir);
    cache.close();
  });

  it('falls back when the path is a corrupt file', () => {
    const file = join(dir, 'corrupt.db');
    writeFileSync(file, 'this is not a sqlite database, '.repeat(100));
    const reported: string[] = [];
    const cache = createAnswerCache({
      sqlitePath: file,
      onSqliteFallback: (name) => reported.push(name),
    });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    expect(reported).toHaveLength(1);
    cache.close();
  });

  it('defaults to a console.warn that holds no path', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const cache = createAnswerCache({ sqlitePath: join(dir, 'nope', 'cache.db') });
      cache.close();
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]?.[0])).not.toContain(dir);
    } finally {
      warn.mockRestore();
    }
  });
});
