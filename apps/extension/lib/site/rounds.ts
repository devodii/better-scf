import { z } from "zod";
import {
  ROUND_CARD_BUTTON,
  ROUND_CARD_BUTTON_TEXT,
  ROUND_CARD_MAX_DEPTH,
  ROUND_CARD_NAME,
  ROUND_CARD_NAME_PATTERN,
  ROUNDS_MAX_RECORD_CHARS,
  ROUNDS_PUSH_PREFIX,
  ROUNDS_RECORD_START,
} from "./selectors/rounds";

const count = z.number().finite().catch(0);

const roundStatsSchema = z.object({
  appliedSubmissions: count,
  awardedSubmissions: count,
  totalAwardedUSD: count,
  totalPaidUSD: count,
  totalPaidXLM: count,
  submissionsCount: count,
  usersCount: count,
});

const roundDateSchema = z.object({
  open: z.string().catch(""),
  close: z.string().catch(""),
});

const roundRecordSchema = z.object({
  id: z.string().startsWith("rec"),
  name: z.string().transform((name) => name.trim()),
  roundNumber: z.number().int(),
  type: z.string().catch(""),
  phase: z.string().catch(""),
  imageUrl: z.string().nullable().catch(null),
  scfVersion: z.string().nullable().catch(null),
  dates: z.record(z.string(), roundDateSchema).catch({}),
  stats: roundStatsSchema.nullable().catch(null),
});

export type RoundRecord = z.infer<typeof roundRecordSchema>;

export interface RoundCardMatch {
  card: Element;
  record: RoundRecord;
}

function decodeFlight(scripts: readonly string[]): string {
  const chunks: string[] = [];
  for (const text of scripts) {
    const start = text.indexOf(ROUNDS_PUSH_PREFIX);
    const end = text.lastIndexOf(")");
    if (start < 0 || end <= start) continue;
    try {
      const entry: unknown = JSON.parse(
        text.slice(start + ROUNDS_PUSH_PREFIX.length, end),
      );
      if (
        Array.isArray(entry) &&
        entry[0] === 1 &&
        typeof entry[1] === "string"
      ) {
        chunks.push(entry[1]);
      }
    } catch {}
  }
  return chunks.join("");
}

function sliceObject(text: string, start: number): string | null {
  const limit = Math.min(text.length, start + ROUNDS_MAX_RECORD_CHARS);
  let depth = 0;
  let inString = false;
  for (let i = start; i < limit; i++) {
    const c = text.charCodeAt(i);
    if (inString) {
      if (c === 92) i++;
      else if (c === 34) inString = false;
    } else if (c === 34) inString = true;
    else if (c === 123 || c === 91) depth++;
    else if (c === 125 || c === 93) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function parseRoundsPayload(scripts: readonly string[]): RoundRecord[] {
  try {
    const stream = decodeFlight(scripts);
    const seen = new Set<string>();
    const rounds: RoundRecord[] = [];
    for (const match of stream.matchAll(ROUNDS_RECORD_START)) {
      const raw = sliceObject(stream, match.index);
      if (!raw) continue;
      let value: unknown;
      try {
        value = JSON.parse(raw);
      } catch {
        continue;
      }
      const result = roundRecordSchema.safeParse(value);
      if (!result.success || seen.has(result.data.id)) continue;
      seen.add(result.data.id);
      rounds.push(result.data);
    }
    return rounds;
  } catch {
    return [];
  }
}

function cardRoundNumber(card: Element): number | null {
  let found: number | null = null;
  for (const node of card.querySelectorAll(ROUND_CARD_NAME)) {
    if (node.childElementCount > 0) continue;
    const text = node.textContent?.trim();
    const match = text ? ROUND_CARD_NAME_PATTERN.exec(text) : null;
    if (!match?.[1]) continue;
    const number = Number(match[1]);
    if (found !== null && found !== number) return null;
    found = number;
  }
  return found;
}

export function mapRoundCards(
  root: ParentNode,
  rounds: readonly RoundRecord[],
): RoundCardMatch[] {
  const matches: RoundCardMatch[] = [];
  try {
    const byNumber = new Map(rounds.map((round) => [round.roundNumber, round]));
    const seen = new Set<Element>();
    for (const button of root.querySelectorAll(ROUND_CARD_BUTTON)) {
      if (button.textContent?.trim().toLowerCase() !== ROUND_CARD_BUTTON_TEXT)
        continue;
      let node = button.parentElement;
      for (
        let i = 0;
        node && i < ROUND_CARD_MAX_DEPTH;
        i++, node = node.parentElement
      ) {
        const number = cardRoundNumber(node);
        if (number === null) continue;
        const record = byNumber.get(number);
        if (record && !seen.has(node)) {
          seen.add(node);
          matches.push({ card: node, record });
        }
        break;
      }
    }
  } catch {
    return [];
  }
  return matches;
}
