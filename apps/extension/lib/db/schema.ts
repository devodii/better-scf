import {
  type DBSchema,
  type IDBPDatabase,
  openDB,
  type StoreNames,
  unwrap,
} from "idb";
import type {
  ChatMessage,
  HorizonSummary,
  NavState,
  Project,
  ReviewState,
  Round,
  Submission,
} from "shared";
import { z } from "zod";

const DB_NAME = "better-scf";
const DB_VERSION = 4;

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const TTL_MS = {
  submissions: 6 * HOUR_MS,
  projects: 6 * HOUR_MS,
  rounds: 1 * HOUR_MS,
  horizon: 10 * MINUTE_MS,
  avatars: 7 * DAY_MS,
  navstate: 30 * MINUTE_MS,
  projectIndex: 6 * HOUR_MS,
} as const;

export const PROJECT_INDEX_KEY = "all";

const projectIndexEntrySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string(),
  category: z.string(),
  thumbnail: z.string().nullable(),
  lastAwardedRound: z.number().nullable(),
});
export type ProjectIndexEntry = z.infer<typeof projectIndexEntrySchema>;

export const projectIndexRecordSchema = z.object({
  key: z.literal(PROJECT_INDEX_KEY),
  projects: z.array(projectIndexEntrySchema),
  fetchedAt: z.number(),
});
export type ProjectIndexRecord = z.infer<typeof projectIndexRecordSchema>;

export const avatarRecordSchema = z.object({
  handleKey: z.string().min(1),
  url: z.string(),
  fetchedAt: z.number(),
  ok: z.boolean(),
});
export type AvatarRecord = z.infer<typeof avatarRecordSchema>;

export interface BetterScfDb extends DBSchema {
  submissions: {
    key: string;
    value: Submission;
    indexes: { roundId: string; projectId: string; fetchedAt: number };
  };
  projects: { key: string; value: Project; indexes: { fetchedAt: number } };
  rounds: { key: string; value: Round; indexes: { fetchedAt: number } };
  review: { key: string; value: ReviewState };
  navstate: { key: string; value: NavState };
  chat: {
    key: [string, string];
    value: ChatMessage;
    indexes: { submissionId: string };
  };
  horizon: {
    key: string;
    value: HorizonSummary;
    indexes: { fetchedAt: number };
  };
  avatars: { key: string; value: AvatarRecord };
  projectIndex: { key: string; value: ProjectIndexRecord };
}

export type StoreName = StoreNames<BetterScfDb>;
export type Db = IDBPDatabase<BetterScfDb>;

export const STORE_NAMES = [
  "submissions",
  "projects",
  "rounds",
  "review",
  "navstate",
  "chat",
  "horizon",
  "avatars",
  "projectIndex",
] as const satisfies readonly StoreName[];

export const CACHE_STORE_NAMES = [
  "submissions",
  "projects",
  "rounds",
  "navstate",
  "horizon",
  "avatars",
  "projectIndex",
] as const satisfies readonly StoreName[];

const STORES: readonly {
  name: StoreName;
  keyPath: string | string[];
  indexes: readonly string[];
}[] = [
  {
    name: "submissions",
    keyPath: "id",
    indexes: ["roundId", "projectId", "fetchedAt"],
  },
  { name: "projects", keyPath: "id", indexes: ["fetchedAt"] },
  { name: "rounds", keyPath: "id", indexes: ["fetchedAt"] },
  { name: "review", keyPath: "submissionId", indexes: [] },
  { name: "navstate", keyPath: "routeKey", indexes: [] },
  { name: "chat", keyPath: ["submissionId", "id"], indexes: ["submissionId"] },
  { name: "horizon", keyPath: "accountId", indexes: ["fetchedAt"] },
  { name: "avatars", keyPath: "handleKey", indexes: [] },
  { name: "projectIndex", keyPath: "key", indexes: [] },
];

function createStores(db: Db): void {
  const native = unwrap(db);
  for (const { name, keyPath, indexes } of STORES) {
    if (native.objectStoreNames.contains(name)) continue;
    const store = native.createObjectStore(name, { keyPath });
    for (const index of indexes) store.createIndex(index, index);
  }
}

export interface OpenOptions {
  onTerminated?: () => void;
}

export function openBetterScfDb(options: OpenOptions = {}): Promise<Db> {
  return openDB<BetterScfDb>(DB_NAME, DB_VERSION, {
    upgrade: createStores,
    terminated() {
      options.onTerminated?.();
    },
  });
}

export function isStale(
  fetchedAt: number,
  ttlMs: number,
  now: number,
): boolean {
  return now - fetchedAt >= ttlMs;
}
