import type { Enrichment } from './enrich';

const TTL_MS = 10 * 60_000;

interface Entry {
  data: Enrichment;
  at: number;
}

const facts = new Map<string, Entry>();
const listeners = new Set<() => void>();

export function publishFacts(data: Enrichment): void {
  facts.set(data.id, { data, at: Date.now() });
  for (const listener of listeners) listener();
}

export function readFacts(): ReadonlyMap<string, Enrichment> {
  const now = Date.now();
  const fresh = new Map<string, Enrichment>();
  for (const [id, { data, at }] of facts) {
    if (now - at < TTL_MS) fresh.set(id, data);
    else facts.delete(id);
  }
  return fresh;
}

export function onFacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
