import { parseWith } from 'shared';
import { browser } from 'wxt/browser';
import { z } from 'zod';

export interface StorageItemOptions<T> {
  key: string;
  schema: z.ZodType<T>;
  defaults: T;
  migrate?: (raw: unknown) => unknown;
}

export interface StorageItem<T> {
  readonly key: string;
  get(): Promise<T>;
  set(value: T): Promise<void>;
  update(change: (current: T) => T): Promise<T>;
  reset(): Promise<void>;
  subscribe(listener: (value: T) => void): () => void;
}

export function defineStorageItem<T>(options: StorageItemOptions<T>): StorageItem<T> {
  const { key, schema, defaults, migrate } = options;

  function parseStored(raw: unknown): T {
    if (raw === undefined) return defaults;
    const parsed = parseWith(schema, migrate ? migrate(raw) : raw);
    return parsed.ok ? parsed.data : defaults;
  }

  const item: StorageItem<T> = {
    key,
    async get() {
      const stored = await browser.storage.local.get(key);
      return parseStored(stored[key]);
    },
    async set(value) {
      await browser.storage.local.set({ [key]: value });
    },
    async update(change) {
      const next = change(await item.get());
      await item.set(next);
      return next;
    },
    async reset() {
      await browser.storage.local.remove(key);
    },
    subscribe(listener) {
      const onChanged = (
        changes: Record<string, { newValue?: unknown }>,
        areaName: string,
      ): void => {
        if (areaName !== 'local') return;
        const change = changes[key];
        if (change) listener(parseStored(change.newValue));
      };
      browser.storage.onChanged.addListener(onChanged);
      return () => browser.storage.onChanged.removeListener(onChanged);
    },
  };
  return item;
}

const clientIdSchema = z.uuid();
const CLIENT_ID_KEY = 'clientId';

let pendingClientId: Promise<string> | undefined;

export function getClientId(): Promise<string> {
  pendingClientId ??= (async () => {
    const stored = (await browser.storage.local.get(CLIENT_ID_KEY))[CLIENT_ID_KEY];
    const parsed = clientIdSchema.safeParse(stored);
    if (parsed.success) return parsed.data;
    const id = crypto.randomUUID();
    await browser.storage.local.set({ [CLIENT_ID_KEY]: id });
    return id;
  })().finally(() => {
    pendingClientId = undefined;
  });
  return pendingClientId;
}
