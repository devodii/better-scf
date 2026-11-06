import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { parseWith, type Round, submissionSchema } from 'shared';
import { z } from 'zod';
import {
  AWARDED_HEADING_TEXT,
  CARD_BUDGET,
  CARD_BYLINE_PREFIX,
  CARD_CHIP,
  CARD_MAX_DEPTH,
  CARD_TEXT,
  CARD_VIEW_BUTTON,
  CARD_VIEW_TEXT,
  FLIGHT_PUSH_PREFIX,
  FLIGHT_RECORD_START,
  FLIGHT_SCRIPT,
  HIDE_TEXT,
  PHASE_CELL,
  PHASE_DATE_FORMATS,
  PHASE_HEADER_CELL,
  PHASE_HEADER_TEXTS,
  PHASE_RANGE_SEPARATOR,
  PHASE_ROW,
  PHASE_TABLE,
  PHASE_TBD,
  RECEIVED_HEADING_TEXT,
  SECTION_HEADING,
  SECTION_MAX_DEPTH,
  SEE_ALL_TEXT,
  TOGGLE_BUTTON,
} from './selectors/round';

dayjs.extend(customParseFormat);

const MAX_OBJECT_CHARS = 32768;

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const nullableString = z.string().nullable().catch(null);
const nullableBoolean = z
  .union([z.boolean(), z.enum(['true', 'false']).transform((v) => v === 'true')])
  .nullable()
  .catch(null);

const submissionSummarySchema = submissionSchema
  .pick({ id: true, title: true, status: true })
  .extend({
    project: nullableString,
    projectName: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? (v[0] ?? null) : v))
      .nullable()
      .catch(null),
    roundName: nullableString,
    budget: z.unknown().transform(toNumber),
    awardType: nullableString,
    isCvvc: nullableBoolean,
    thumbnail: z
      .object({ url: z.string() })
      .transform((t) => t.url)
      .nullable()
      .catch(null),
  });
export type SubmissionSummary = z.infer<typeof submissionSummarySchema>;

export interface RoundPayload {
  roundName: string | null;
  submissions: SubmissionSummary[];
}

export type RoundPhase = Round['phases'][number] & { dates: string };

export type RoundView = 'carousel' | 'grid';

export interface RoundCardFacts {
  team: string | null;
  title: string | null;
  budgetText: string | null;
  budget: number | null;
  chips: string[];
}

export interface RoundCardMatch {
  card: Element;
  record: SubmissionSummary;
}

export type CardMatcher = (card: Element) => SubmissionSummary | null;

let debugEnabled = false;
const reported = new Set<string>();

export function setRoundDebug(enabled: boolean): void {
  debugEnabled = enabled;
}

function debug(selector: string): void {
  if (!debugEnabled || reported.has(selector)) return;
  reported.add(selector);
  console.debug(`[better-scf] round: no match for ${selector}`);
}

const norm = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readInlineScripts(root: ParentNode): string[] {
  const scripts: string[] = [];
  try {
    for (const script of root.querySelectorAll(FLIGHT_SCRIPT)) {
      const text = script.textContent;
      if (text?.includes(FLIGHT_PUSH_PREFIX)) scripts.push(text);
    }
  } catch {
    return [];
  }
  return scripts;
}

function decodeFlight(scripts: readonly string[]): string {
  const chunks: string[] = [];
  for (const text of scripts) {
    const start = text.indexOf(FLIGHT_PUSH_PREFIX);
    const end = text.lastIndexOf(')');
    if (start < 0 || end <= start) continue;
    try {
      const entry: unknown = JSON.parse(text.slice(start + FLIGHT_PUSH_PREFIX.length, end));
      if (Array.isArray(entry) && entry[0] === 1 && typeof entry[1] === 'string') {
        chunks.push(entry[1]);
      }
    } catch {}
  }
  return chunks.join('');
}

function sliceObject(text: string, start: number): string | null {
  const limit = Math.min(text.length, start + MAX_OBJECT_CHARS);
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

function parseObject(raw: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(raw);
    return isObject(value) ? value : null;
  } catch {
    return null;
  }
}

function readRoundName(stream: string, roundId: string): string | null {
  const start = stream.indexOf(`{"id":"${roundId}","name":`);
  if (start < 0) return null;
  const raw = sliceObject(stream, start);
  const round = raw ? parseObject(raw) : null;
  return typeof round?.name === 'string' ? round.name : null;
}

function toSummary(raw: string): SubmissionSummary | null {
  const record = parseObject(raw);
  if (!record) return null;
  const result = parseWith(submissionSummarySchema, {
    id: record.id,
    title: record.title,
    status: record.status,
    project: record.project,
    projectName: record.projectName,
    roundName: record.roundName,
    budget: record.budget,
    awardType: record.awardType,
    isCvvc: record.isCvvc,
    thumbnail: record.thumbnail,
  });
  return result.ok ? result.data : null;
}

export function parseRoundPayload(
  scripts: readonly string[],
  roundId: string | null,
): RoundPayload {
  try {
    const stream = decodeFlight(scripts);
    const roundName = roundId ? readRoundName(stream, roundId) : null;
    const seen = new Set<string>();
    const submissions: SubmissionSummary[] = [];
    for (const match of stream.matchAll(FLIGHT_RECORD_START)) {
      const raw = sliceObject(stream, match.index);
      if (!raw?.includes('"roundName":') || raw.includes('"accessToken"')) continue;
      const summary = toSummary(raw);
      if (!summary || seen.has(summary.id)) continue;
      if (roundName !== null && summary.roundName !== roundName) continue;
      seen.add(summary.id);
      submissions.push(summary);
    }
    if (submissions.length === 0) debug('flightRecords');
    return { roundName, submissions };
  } catch {
    return { roundName: null, submissions: [] };
  }
}

function parseDay(text: string | undefined): dayjs.Dayjs | null {
  if (!text || PHASE_TBD.test(text)) return null;
  const day = dayjs(text, PHASE_DATE_FORMATS, true);
  return day.isValid() ? day : null;
}

function parsePhaseDates(text: string): Pick<RoundPhase, 'startsAt' | 'endsAt'> {
  try {
    const parts = text.trim().split(PHASE_RANGE_SEPARATOR);
    const start = parseDay(parts[0]?.trim());
    const end = parts.length > 1 ? parseDay(parts[1]?.trim()) : start;
    return {
      startsAt: start ? start.startOf('day').valueOf() : null,
      endsAt: end ? end.endOf('day').valueOf() : null,
    };
  } catch {
    return { startsAt: null, endsAt: null };
  }
}

export function findPhaseTable(root: ParentNode): Element | null {
  for (const table of root.querySelectorAll(PHASE_TABLE)) {
    const headers = Array.from(table.querySelectorAll(PHASE_HEADER_CELL), (th) =>
      norm(th.textContent),
    );
    if (PHASE_HEADER_TEXTS.every((text) => headers.includes(text))) return table;
  }
  return null;
}

export function readRoundPhases(root: ParentNode): RoundPhase[] {
  try {
    const table = findPhaseTable(root);
    if (!table) {
      debug('phaseTable');
      return [];
    }
    const phases: RoundPhase[] = [];
    for (const row of table.querySelectorAll(PHASE_ROW)) {
      const cells = row.querySelectorAll(PHASE_CELL);
      const name = cells[0]?.textContent?.trim();
      if (!name) continue;
      const dates = cells[1]?.textContent?.trim() ?? '';
      phases.push({ name, dates, ...parsePhaseDates(dates) });
    }
    return phases;
  } catch {
    return [];
  }
}

function sectionOf(heading: Element): Element {
  let section: Element = heading;
  for (let i = 0; i < SECTION_MAX_DEPTH; i++) {
    const parent = section.parentElement;
    if (!parent || parent.querySelectorAll(SECTION_HEADING).length > 1) break;
    section = parent;
  }
  return section;
}

export function findReceivedSection(root: ParentNode): Element | null {
  try {
    for (const heading of root.querySelectorAll(SECTION_HEADING)) {
      if (norm(heading.textContent) === RECEIVED_HEADING_TEXT) return sectionOf(heading);
    }
  } catch {
    return null;
  }
  debug('receivedSection');
  return null;
}

export function findFirstSubmissionSection(root: ParentNode): Element | null {
  try {
    for (const heading of root.querySelectorAll(SECTION_HEADING)) {
      const text = norm(heading.textContent);
      if (text === RECEIVED_HEADING_TEXT || text === AWARDED_HEADING_TEXT)
        return sectionOf(heading);
    }
  } catch {
    return null;
  }
  return null;
}

export function readRoundView(section: Element): RoundView | null {
  try {
    for (const button of section.querySelectorAll(TOGGLE_BUTTON)) {
      const text = norm(button.textContent);
      if (text === SEE_ALL_TEXT) return 'carousel';
      if (text === HIDE_TEXT) return 'grid';
    }
  } catch {
    return null;
  }
  debug('viewToggle');
  return null;
}

function findByline(card: Element): Element | null {
  for (const p of card.querySelectorAll(CARD_TEXT)) {
    if (p.textContent?.trimStart().startsWith(CARD_BYLINE_PREFIX)) return p;
  }
  return null;
}

function cardFromViewButton(button: Element): Element | null {
  try {
    let node = button.parentElement;
    for (let i = 0; node && i < CARD_MAX_DEPTH; i++) {
      if (findByline(node)) return node;
      node = node.parentElement;
    }
  } catch {
    return null;
  }
  return null;
}

export function findRoundCards(section: Element): Element[] {
  const cards: Element[] = [];
  try {
    for (const button of section.querySelectorAll(CARD_VIEW_BUTTON)) {
      if (norm(button.textContent) !== CARD_VIEW_TEXT) continue;
      const card = cardFromViewButton(button);
      if (card) cards.push(card);
    }
  } catch {
    return [];
  }
  if (cards.length === 0) debug('roundCards');
  return cards;
}

function parseCardBudget(text: string): { value: number; tolerance: number } | null {
  const match = CARD_BUDGET.exec(text);
  const amount = match?.[1] ? Number(match[1].replace(/,/g, '')) : Number.NaN;
  if (!Number.isFinite(amount)) return null;
  const unit = match?.[2]?.toUpperCase();
  const scale = unit === 'M' ? 1_000_000 : unit === 'K' ? 1000 : 1;
  const decimals = match?.[1]?.split('.')[1]?.length ?? 0;
  return { value: amount * scale, tolerance: (scale * 10 ** -decimals) / 2 + 1e-6 };
}

export function readRoundCard(card: Element): RoundCardFacts | null {
  try {
    const byline = findByline(card);
    if (!byline) return null;
    const team = byline.textContent?.trim().slice(CARD_BYLINE_PREFIX.length).trim() || null;
    const titleNode = byline.nextElementSibling;
    const title = titleNode?.tagName === 'P' ? titleNode.textContent?.trim() || null : null;
    const chips: string[] = [];
    for (const chip of byline.parentElement?.querySelectorAll(CARD_CHIP) ?? []) {
      if (chip.childElementCount > 0) continue;
      const text = chip.textContent?.trim();
      if (text) chips.push(text);
    }
    const budgetText = chips.find((chip) => CARD_BUDGET.test(chip)) ?? null;
    const budget = budgetText ? (parseCardBudget(budgetText)?.value ?? null) : null;
    return { team, title, budgetText, budget, chips };
  } catch {
    return null;
  }
}

function addTo(index: Map<string, SubmissionSummary[]>, key: string, record: SubmissionSummary) {
  const list = index.get(key);
  if (list) list.push(record);
  else index.set(key, [record]);
}

export function createCardMatcher(records: readonly SubmissionSummary[]): CardMatcher {
  const byTitle = new Map<string, SubmissionSummary[]>();
  const byTeam = new Map<string, SubmissionSummary[]>();
  for (const record of records) {
    addTo(byTitle, norm(record.title), record);
    if (record.projectName) addTo(byTeam, norm(record.projectName), record);
  }
  return (card) => {
    const facts = readRoundCard(card);
    if (!facts) {
      debug('cardByline');
      return null;
    }
    const team = facts.team ? norm(facts.team) : null;
    const budget = facts.budgetText ? parseCardBudget(facts.budgetText) : null;
    const fits = (record: SubmissionSummary): boolean =>
      (team === null || norm(record.projectName) === team) &&
      (budget === null ||
        (record.budget !== null && Math.abs(record.budget - budget.value) <= budget.tolerance));
    const byTitleMatch = facts.title ? byTitle.get(norm(facts.title))?.find(fits) : undefined;
    if (byTitleMatch) return byTitleMatch;
    const byTeamMatches = team ? (byTeam.get(team)?.filter(fits) ?? []) : [];
    if (byTeamMatches.length === 1 && byTeamMatches[0]) return byTeamMatches[0];
    debug('cardRecord');
    return null;
  };
}

export function mapRoundCards(
  section: Element,
  records: readonly SubmissionSummary[],
): RoundCardMatch[] {
  const match = createCardMatcher(records);
  const matches: RoundCardMatch[] = [];
  for (const card of findRoundCards(section)) {
    const record = match(card);
    if (record) matches.push({ card, record });
  }
  return matches;
}

export function readSiteSubmissionCount(roundName: string | null): number | null {
  if (!roundName) return null;
  try {
    const flight = Array.from(document.scripts, (script) => script.textContent ?? '')
      .filter((text) => text.includes('__next_f'))
      .join('\n')
      .replaceAll('\\"', '"');
    const escaped = roundName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`"name":"${escaped}".{0,8000}?"submissionsCount":(\\d+)`, 's').exec(
      flight,
    );
    return found?.[1] ? Number(found[1]) : null;
  } catch {
    return null;
  }
}
