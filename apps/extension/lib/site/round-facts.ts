import { browser } from "wxt/browser";
import type { Enrichment } from "./enrich";

const TTL_MS = 25 * 60_000;
const KEY_PREFIX = "bscfFacts:";
const SAVE_DELAY_MS = 400;
const NO_ROUND = "none";

interface Entry {
  data: Enrichment;
  at: number;
  round: string;
}

const facts = new Map<string, Entry>();
const listeners = new Set<() => void>();
const unsaved = new Set<string>();
const loading = new Map<string, Promise<void>>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

const isFresh = (at: number, now: number): boolean => now - at < TTL_MS;
const keyOf = (round: string, id: string): string =>
  `${KEY_PREFIX}${round}:${id}`;

function isEntry(id: string, round: string, value: unknown): value is Entry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<Entry>;
  return (
    typeof entry.at === "number" &&
    entry.round === round &&
    typeof entry.data === "object" &&
    entry.data !== null &&
    entry.data.id === id &&
    Array.isArray(entry.data.builders)
  );
}

function notify(): void {
  for (const listener of listeners) listener();
}

function scheduleSave(id: string): void {
  unsaved.add(id);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const batch: Record<string, Entry> = {};
    for (const key of unsaved) {
      const entry = facts.get(key);
      if (entry) batch[keyOf(entry.round, key)] = entry;
    }
    unsaved.clear();
    browser.storage.session.set(batch).catch(() => {});
  }, SAVE_DELAY_MS);
}

export function publishFacts(data: Enrichment, round = NO_ROUND): void {
  facts.set(data.id, { data, at: Date.now(), round });
  scheduleSave(data.id);
  notify();
}

export function loadSavedFacts(round?: string): Promise<void> {
  const scope = round ?? "*";
  const pending =
    loading.get(scope) ??
    browser.storage.session
      .get(null)
      .then((stored) => {
        const now = Date.now();
        const expired: string[] = [];
        let added = false;
        for (const [key, value] of Object.entries(stored)) {
          if (!key.startsWith(KEY_PREFIX)) continue;
          const [entryRound, ...rest] = key.slice(KEY_PREFIX.length).split(":");
          const id = rest.join(":");
          if (entryRound === undefined) continue;
          if (!isEntry(id, entryRound, value) || !isFresh(value.at, now)) {
            expired.push(key);
            continue;
          }
          if (round !== undefined && entryRound !== round) continue;
          if (facts.has(id)) continue;
          facts.set(id, value);
          added = true;
        }
        if (expired.length > 0)
          browser.storage.session.remove(expired).catch(() => {});
        if (added) notify();
      })
      .catch(() => {});
  loading.set(scope, pending);
  return pending;
}

export function readFacts(): ReadonlyMap<string, Enrichment> {
  const all = new Map<string, Enrichment>();
  for (const [id, { data }] of facts) all.set(id, data);
  return all;
}

export function hasStale(ids: Iterable<string>): boolean {
  const now = Date.now();
  for (const id of ids) {
    const entry = facts.get(id);
    if (!entry || !isFresh(entry.at, now)) return true;
  }
  return false;
}

export function onFacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
