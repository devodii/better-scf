import type { Enrichment } from './enrich';

const facts = new Map<string, Enrichment>();
const listeners = new Set<() => void>();

export function publishFacts(data: Enrichment): void {
  facts.set(data.id, data);
  for (const listener of listeners) listener();
}

export function readFacts(): ReadonlyMap<string, Enrichment> {
  return facts;
}

export function onFacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
