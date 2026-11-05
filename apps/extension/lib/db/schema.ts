import { type DBSchema, type IDBPDatabase, openDB, type StoreNames, unwrap } from 'idb';
import type {
  ChatMessage,
  HorizonSummary,
  NavState,
  Project,
  ReviewState,
  Round,
  Submission,
} from 'shared';
import { z } from 'zod';

export const DB_NAME = 'better-scf';
export const DB_VERSION = 3;

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

export const PROJECT_INDEX_KEY = 'all';

export const projectIndexEntrySchema = z.object({
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
  horizon: { key: string; value: HorizonSummary; indexes: { fetchedAt: number } };
  avatars: { key: string; value: AvatarRecord };
  projectIndex: { key: string; value: ProjectIndexRecord };
}

export type StoreName = StoreNames<BetterScfDb>;
export type Db = IDBPDatabase<BetterScfDb>;

export const STORE_NAMES = [
  'submissions',
  'projects',
  'rounds',
  'review',
  'navstate',
  'chat',
  'horizon',
  'avatars',
  'projectIndex',
] as const satisfies readonly StoreName[];

export const CACHE_STORE_NAMES = [
  'submissions',
  'projects',
  'rounds',
  'navstate',
  'horizon',
  'avatars',
  'projectIndex',
] as const satisfies readonly StoreName[];

type Migration = (db: Db) => void;

const MIGRATIONS: readonly Migration[] = [
  (db) => {
    const submissions = db.createObjectStore('submissions', { keyPath: 'id' });
    submissions.createIndex('roundId', 'roundId');
    submissions.createIndex('projectId', 'projectId');
    submissions.createIndex('fetchedAt', 'fetchedAt');

    db.createObjectStore('projects', { keyPath: 'id' }).createIndex('fetchedAt', 'fetchedAt');
    db.createObjectStore('rounds', { keyPath: 'id' }).createIndex('fetchedAt', 'fetchedAt');
    db.createObjectStore('review', { keyPath: 'submissionId' });
    db.createObjectStore('navstate', { keyPath: 'routeKey' });
    db.createObjectStore('chat', { keyPath: ['submissionId', 'id'] }).createIndex(
      'submissionId',
      'submissionId',
    );
    db.createObjectStore('horizon', { keyPath: 'accountId' }).createIndex('fetchedAt', 'fetchedAt');
    db.createObjectStore('avatars', { keyPath: 'handleKey' });
  },
  (db) => {
    db.createObjectStore('projectIndex', { keyPath: 'key' });
  },
  (db) => {
    const native = unwrap(db);
    if (native.objectStoreNames.contains('ownership')) native.deleteObjectStore('ownership');
  },
];

export function migrate(db: Db, oldVersion: number, newVersion: number = DB_VERSION): void {
  for (let version = oldVersion; version < newVersion; version += 1) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from database version ${version}`);
    step(db);
  }
}

export interface OpenOptions {
  onTerminated?: () => void;
}

export function openBetterScfDb(options: OpenOptions = {}): Promise<Db> {
  return openDB<BetterScfDb>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      migrate(db, oldVersion, newVersion ?? DB_VERSION);
    },
    terminated() {
      options.onTerminated?.();
    },
  });
}

export function isStale(fetchedAt: number, ttlMs: number, now: number): boolean {
  return now - fetchedAt >= ttlMs;
}
