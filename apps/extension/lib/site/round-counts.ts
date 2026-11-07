import { z } from "zod";
import { defineStorageItem } from "../db/storage";

const countsItem = defineStorageItem<Record<string, number>>({
  key: "roundCounts",
  schema: z.record(z.string(), z.number()),
  defaults: {},
});

export async function readRoundCount(roundId: string): Promise<number | null> {
  return (await countsItem.get())[roundId] ?? null;
}

export async function writeRoundCount(
  roundId: string,
  count: number,
): Promise<void> {
  await countsItem.update((counts) => ({ ...counts, [roundId]: count }));
}
