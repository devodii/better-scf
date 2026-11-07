import { EXTENSION_VERSION } from "shared";
import { z } from "zod";
import { defineStorageItem } from "../db/storage";

const REFRESH_MS = 60 * 60_000;

const snapshotSchema = z.object({
  handles: z.array(z.string()),
  at: z.number(),
});

const snapshotItem = defineStorageItem<z.infer<typeof snapshotSchema>>({
  key: "stellarlightBuilders",
  schema: snapshotSchema,
  defaults: { handles: [], at: 0 },
});

let known: ReadonlySet<string> | null = null;
const listeners = new Set<() => void>();

function adopt(handles: readonly string[]): void {
  known = new Set(handles);
  for (const listener of listeners) listener();
}

export function hasStellarlightProfile(handle: string): boolean {
  return known?.has(handle.toLowerCase()) ?? false;
}

export function onStellarlight(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface StellarlightOptions {
  serverUrl: string;
  fetch: typeof fetch;
  getClientId: () => Promise<string>;
}

export async function loadStellarlightHandles(
  options: StellarlightOptions,
): Promise<void> {
  const saved = await snapshotItem.get();
  if (saved.handles.length > 0 && known === null) adopt(saved.handles);
  if (saved.handles.length > 0 && Date.now() - saved.at < REFRESH_MS) return;
  if (options.serverUrl === "") return;
  const response = await options.fetch(
    `${options.serverUrl}/v1/stellarlight/handles`,
    {
      headers: {
        "X-BSCF-Client": await options.getClientId(),
        "X-BSCF-Version": EXTENSION_VERSION,
      },
    },
  );
  if (!response.ok) return;
  const parsed = z
    .object({ handles: z.array(z.string()) })
    .safeParse(await response.json());
  if (!parsed.success || parsed.data.handles.length === 0) return;
  await snapshotItem.set({ handles: parsed.data.handles, at: Date.now() });
  adopt(parsed.data.handles);
}
