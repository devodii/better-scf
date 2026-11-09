import { browser } from "wxt/browser";
import type { Enrichment } from "./enrich";

const TTL_MS = 10 * 60_000;
const KEY_PREFIX = "bscfFacts:";
const SAVE_DELAY_MS = 400;

interface Entry {
  data: Enrichment;
  at: number;
}

const facts = new Map<string, Entry>();
const listeners = new Set<() => void>();
const unsaved = new Set<string>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let loading: Promise<void> | undefined;

const isFresh = (at: number, now: number): boolean => now - at < TTL_MS;

function isEntry(id: string, value: unknown): value is Entry {
  if (typeof value !== "object" || value === null) return false;
  const { data, at } = value as Partial<Entry>;
  return (
    typeof at === "number" &&
    typeof data === "object" &&
    data !== null &&
    data.id === id &&
    Array.isArray(data.builders)
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
      if (entry) batch[`${KEY_PREFIX}${key}`] = entry;
    }
    unsaved.clear();
    browser.storage.session.set(batch).catch(() => {});
  }, SAVE_DELAY_MS);
}

export function publishFacts(data: Enrichment): void {
  facts.set(data.id, { data, at: Date.now() });
  scheduleSave(data.id);
  notify();
}

export function loadSavedFacts(): Promise<void> {
  loading ??= browser.storage.session
    .get(null)
    .then((stored) => {
      const now = Date.now();
      const expired: string[] = [];
      let added = false;
      for (const [key, value] of Object.entries(stored)) {
        if (!key.startsWith(KEY_PREFIX)) continue;
        const id = key.slice(KEY_PREFIX.length);
        if (!isEntry(id, value) || !isFresh(value.at, now)) {
          expired.push(key);
          continue;
        }
        if (facts.has(id)) continue;
        facts.set(id, value);
        added = true;
      }
      if (expired.length > 0)
        browser.storage.session.remove(expired).catch(() => {});
      if (added) notify();
    })
    .catch(() => {});
  return loading;
}

export function readFacts(): ReadonlyMap<string, Enrichment> {
  const now = Date.now();
  const fresh = new Map<string, Enrichment>();
  for (const [id, { data, at }] of facts) {
    if (isFresh(at, now)) fresh.set(id, data);
    else facts.delete(id);
  }
  return fresh;
}

export function onFacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
