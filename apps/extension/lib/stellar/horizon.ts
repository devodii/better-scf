import dayjs from "dayjs";
import type { HorizonSummary } from "shared";
import { z } from "zod";
import { isValidAccountId } from "./detect";

const HORIZON_URL = "https://horizon.stellar.org";
const REQUEST_TIMEOUT_MS = 8000;

export type FetchLike = (
  input: string,
  init?: { signal?: AbortSignal },
) => Promise<Response>;

export interface HorizonOptions {
  baseUrl?: string;
  now?: number;
}

const balanceSchema = z.object({
  asset_type: z.string(),
  balance: z.string().optional(),
});

const accountSchema = z.object({
  account_id: z.string(),
  last_modified_ledger: z.number().int().nonnegative().optional(),
  last_modified_time: z.string().optional(),
  created_at: z.string().optional(),
  balances: z.array(balanceSchema).default([]),
});

export async function fetchHorizonSummary(
  accountId: string,
  fetchFn: FetchLike,
  options: HorizonOptions = {},
): Promise<HorizonSummary | null> {
  if (!isValidAccountId(accountId)) return null;
  const base = (options.baseUrl ?? HORIZON_URL).replace(/\/+$/, "");
  try {
    const response = await fetchFn(`${base}/accounts/${accountId}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const parsed = accountSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    const account = parsed.data;
    const native = account.balances.find((b) => b.asset_type === "native");
    const trustlines = account.balances.filter(
      (b) => b.asset_type !== "native",
    ).length;
    return {
      accountId: account.account_id,
      createdAt: account.created_at ?? null,
      lastModifiedLedger: account.last_modified_ledger ?? null,
      xlmBalance: native?.balance ?? null,
      trustlines,
      lastActiveAt: account.last_modified_time ?? null,
      fetchedAt: options.now ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function daysSince(iso: string | null, now: number): number | null {
  if (!iso) return null;
  const then = dayjs(iso);
  if (!then.isValid()) return null;
  return Math.max(0, dayjs(now).diff(then, "day"));
}
