import type { Project, Submission } from "shared";
import { z } from "zod";
import { computeContentHash, type SectionText } from "../ai/context";
import { detectStellarAddresses } from "../stellar/detect";
import {
  FIRST_TRACK_ROUND,
  PARSER_VERSION,
  RFP_LINK,
  RFP_PHRASES,
  SUBMISSION_SELECTORS as SEL,
  SUBMISSION_TEXT as TXT,
} from "./selectors/submission";

export interface SubmissionPageInput {
  id: string;
  payload?: unknown;
  now?: number | undefined;
  debug?: boolean | undefined;
}

export interface SubmissionSectionElement {
  id: string;
  title: string;
  heading: Element;
  body: Element;
}

export interface OtherSubmission {
  id: string | null;
  title: string;
  status: string | null;
  roundName: string | null;
  budgetUsd: number | null;
  awardType: string | null;
}

export interface SubmissionPage {
  submission: Submission;
  project: Project | null;
  otherSubmissions: OtherSubmission[] | null;
  sectionTexts: SectionText[];
  bodyText: string;
}

type Tranche = Submission["tranches"][number];
type Deliverable = Tranche["deliverables"][number];
type TeamMember = Submission["team"][number];
type Links = Submission["links"];

interface Line {
  text: string;
  listItem: boolean;
}

const SITE_ORIGIN = "https://communityfund.stellar.org";
const AMOUNT = /\$\s?(\d[\d,]*(?:\.\d+)?)\s?([KkMm](?![A-Za-z]))?/;
const NUMBERED = /^(\d+\.\d+)\.?\s+\S/;
const BULLET = /^[-•*–]\s+/;
const TOTAL_LINE = /\btotal\b/i;
const BUDGET_LINE = /^\W*(?:budget|cost)\b/i;
const TRANCHE_HEADER_LINE = /\b(?:tranche|milestone|allocation|phase)\b/i;
const TITLE_CUT = /\s+[—–·]\s+|\s+-\s+\$|\s*\$\d/;
const MAX_TITLE_CHARS = 160;
const MAX_OTHER_DEPTH = 4;
const ROLE_AFTER_NAME =
  /^\s*,\s*([A-Z][^,.;:()\n—–]{1,59}?)\s*(?:[,.;:(\n—–]|$)/;

const looseString = z.string().nullable().catch(null);
const looseNumber = z
  .preprocess(
    (value) =>
      typeof value === "string" && value.trim() !== "" ? Number(value) : value,
    z.number().nullable(),
  )
  .catch(null);
const looseNames = z
  .union([z.string(), z.array(z.string())])
  .nullable()
  .catch(null);

const summaryRecordSchema = z.object({
  id: looseString,
  title: looseString,
  status: looseString,
  project: looseString,
  projectName: looseNames,
  roundName: looseString,
  budget: looseNumber,
  awardType: looseString,
});
type SummaryRecord = z.infer<typeof summaryRecordSchema>;

const projectRecordSchema = z.object({
  id: looseString,
  category: looseString,
  totalAwarded: looseNumber,
  team: z.object({ count: looseNumber }).nullable().catch(null),
  submissions: z.array(summaryRecordSchema.nullable().catch(null)).catch([]),
});

const payloadSchema = z
  .object({
    summary: summaryRecordSchema.nullable().catch(null),
    project: projectRecordSchema.nullable().catch(null),
  })
  .nullable()
  .catch(null);

function logMiss(debug: boolean, name: string): void {
  if (debug) console.debug(`[better-scf] submission: no match for ${name}`);
}

const ESCAPED = /&(?:#x([0-9a-f]{1,6})|#(\d{1,7})|amp|quot|apos|lt|gt);/gi;
const NAMED_ESCAPES: Record<string, string> = {
  "&amp;": "&",
  "&quot;": '"',
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
};
const MAX_CODE_POINT = 0x10ffff;

// The site double-escapes team card names (fixture recLgWXAbXzzi08iq: "d&amp;#x27;Orchimont").
function unescapeTeamName(text: string): string {
  return text.replace(
    ESCAPED,
    (match, hex: string | undefined, dec: string | undefined) => {
      const code =
        hex !== undefined
          ? Number.parseInt(hex, 16)
          : dec !== undefined
            ? Number.parseInt(dec, 10)
            : null;
      if (code === null) return NAMED_ESCAPES[match.toLowerCase()] ?? match;
      return code <= MAX_CODE_POINT ? String.fromCodePoint(code) : match;
    },
  );
}

function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function cleanRecordText(text: string | null): string | null {
  if (text === null) return null;
  const value = text.replace(/^[\s\\"]+|[\s\\"]+$/g, "");
  return value === "" ? null : value;
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

function parseUsd(text: string): number | null {
  const match = AMOUNT.exec(text);
  const digits = match?.[1];
  if (digits === undefined) return null;
  const value = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const suffix = match?.[2]?.toLowerCase();
  const scaled =
    suffix === "k" ? value * 1_000 : suffix === "m" ? value * 1_000_000 : value;
  return Math.round(scaled * 100) / 100;
}

function parseCount(text: string): number | null {
  const match = /\d[\d,]*/.exec(text);
  if (match === null) return null;
  const value = Number(match[0].replace(/,/g, ""));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function toCount(value: number | null): number | null {
  return value !== null && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function webOnly(url: URL): URL | null {
  return url.protocol === "https:" || url.protocol === "http:" ? url : null;
}

function unwrapHref(raw: string | null): URL | null {
  if (raw === null || raw.trim() === "") return null;
  try {
    const url = new URL(raw, SITE_ORIGIN);
    const target =
      url.pathname === "/redirect" ? url.searchParams.get("url") : null;
    return webOnly(target === null ? url : new URL(target));
  } catch {
    return null;
  }
}

function hostOf(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function onDomain(url: URL, domain: string): boolean {
  const host = url.hostname.toLowerCase();
  return host === domain || host.endsWith(`.${domain}`);
}

function firstPathSegment(url: URL): string | null {
  const segment = url.pathname.split("/").find((part) => part !== "");
  return segment === undefined ? null : segment;
}

const GITHUB_RESERVED = new Set([
  "orgs",
  "users",
  "sponsors",
  "topics",
  "features",
  "marketplace",
  "settings",
  "about",
  "pricing",
  "enterprise",
  "apps",
  "login",
  "join",
  "search",
]);

function githubHandle(url: URL): string | null {
  const segment = firstPathSegment(url);
  return segment === null || GITHUB_RESERVED.has(segment.toLowerCase())
    ? null
    : segment;
}

function wholeBudget(value: number | null): number | null {
  if (value === null || value <= 0) return value;
  return Math.round(value < 1000 ? value * 1000 : value);
}

function isLeafBlock(element: Element): boolean {
  return element.querySelector(SEL.blocks) === null;
}

function readLines(body: Element): Line[] {
  const lines: Line[] = [];
  for (const block of body.querySelectorAll(SEL.blocks)) {
    if (!isLeafBlock(block)) continue;
    const text = clean(block.textContent);
    if (text === "") continue;
    lines.push({
      text,
      listItem: block.closest("li") !== null || BULLET.test(text),
    });
  }
  if (lines.length === 0) {
    const text = clean(body.textContent);
    if (text !== "") lines.push({ text, listItem: false });
  }
  return lines;
}

export function findSubmissionSections(
  root: ParentNode,
): SubmissionSectionElement[] {
  const sections: SubmissionSectionElement[] = [];
  const used = new Map<string, number>();
  let lastBody: Element | null = null;
  for (const heading of root.querySelectorAll(SEL.sectionHeading)) {
    if (lastBody?.contains(heading)) continue;
    let body = heading.nextElementSibling;
    while (body?.hasAttribute("data-bscf")) body = body.nextElementSibling;
    if (body === null || body.tagName.toLowerCase() !== "div") continue;
    const title = clean(heading.textContent);
    if (title === "") continue;
    const base = slug(title);
    const count = used.get(base) ?? 0;
    used.set(base, count + 1);
    sections.push({
      id: count === 0 ? base : `${base}-${count + 1}`,
      title,
      heading,
      body,
    });
    lastBody = body;
  }
  return sections;
}

function findHeading(root: ParentNode, pattern: RegExp): Element | null {
  for (const heading of root.querySelectorAll(SEL.sectionHeading)) {
    if (pattern.test(clean(heading.textContent))) return heading;
  }
  return null;
}

function deliverableTitle(text: string): string {
  const withoutBullet = text.replace(BULLET, "");
  const cut = TITLE_CUT.exec(withoutBullet);
  const title = (
    cut === null ? withoutBullet : withoutBullet.slice(0, cut.index)
  ).trim();
  const base = title === "" ? withoutBullet : title;
  return base.length > MAX_TITLE_CHARS
    ? `${base.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`
    : base;
}

function parseTranche(
  title: string,
  index: number,
  lines: readonly Line[],
): Tranche {
  const deliverables: Deliverable[] = [];
  let current: Deliverable | null = null;
  let numberedSeen = false;
  let explicitTotal: number | null = null;
  let headerTotal: number | null = null;
  let budgetTotal: number | null = null;

  for (const line of lines) {
    const amount = parseUsd(line.text);
    if (NUMBERED.test(line.text.replace(BULLET, ""))) {
      current = { title: deliverableTitle(line.text), totalUsd: amount };
      deliverables.push(current);
      numberedSeen = true;
      continue;
    }
    if (amount === null) continue;
    if (TOTAL_LINE.test(line.text)) {
      explicitTotal ??= amount;
      current = null;
      continue;
    }
    if (current !== null) {
      if (
        current.totalUsd === null &&
        BUDGET_LINE.test(line.text.replace(BULLET, ""))
      ) {
        current.totalUsd = amount;
      }
      continue;
    }
    if (BUDGET_LINE.test(line.text.replace(BULLET, ""))) {
      budgetTotal ??= amount;
      continue;
    }
    if (line.listItem && !numberedSeen) {
      deliverables.push({
        title: deliverableTitle(line.text),
        totalUsd: amount,
      });
      continue;
    }
    if (TRANCHE_HEADER_LINE.test(line.text)) headerTotal ??= amount;
  }

  const amounts = deliverables.map((d) => d.totalUsd);
  const sum =
    amounts.length > 0 && amounts.every((a): a is number => a !== null)
      ? amounts.reduce((total, a) => total + a, 0)
      : null;
  return {
    index,
    title,
    totalUsd: explicitTotal ?? headerTotal ?? sum ?? budgetTotal,
    deliverables,
  };
}

function leafDivTexts(
  container: Element,
): { element: Element; text: string }[] {
  const out: { element: Element; text: string }[] = [];
  for (const div of container.querySelectorAll(SEL.leafDiv)) {
    if (div.firstElementChild !== null) continue;
    const text = clean(div.textContent);
    if (text !== "") out.push({ element: div, text });
  }
  return out;
}

interface TitleBlock {
  title: string | null;
  byLine: string | null;
  roundNumber: string | null;
  budgetUsd: number | null;
  awardType: string | null;
  status: string | null;
  links: Links;
}

function emptyLinks(): Links {
  return { website: null, architecture: null, github: null, video: null };
}

function readTitleBlock(root: ParentNode, debug: boolean): TitleBlock {
  const heading = root.querySelector(SEL.title);
  const block: TitleBlock = {
    title: null,
    byLine: null,
    roundNumber: null,
    budgetUsd: null,
    awardType: null,
    status: null,
    links: emptyLinks(),
  };
  if (heading === null) {
    logMiss(debug, "title");
    return block;
  }
  block.title = clean(heading.textContent) || null;
  const by = clean(heading.previousElementSibling?.textContent);
  if (TXT.byPrefix.test(by))
    block.byLine = by.replace(TXT.byPrefix, "") || null;

  const container = heading.parentElement?.parentElement ?? null;
  if (container === null) return block;

  const rest: string[] = [];
  for (const { text } of leafDivTexts(container)) {
    const round = TXT.roundChip.exec(text);
    if (round?.[1] !== undefined) {
      block.roundNumber ??= round[1];
      continue;
    }
    if (TXT.budgetChip.test(text)) {
      block.budgetUsd ??= parseUsd(text);
      continue;
    }
    rest.push(text);
  }
  block.awardType = rest[0] ?? null;
  block.status = rest[1] ?? null;

  for (const anchor of container.querySelectorAll(SEL.link)) {
    const label = clean(anchor.textContent);
    const url = unwrapHref(anchor.getAttribute("href"))?.href ?? null;
    if (url === null) continue;
    if (TXT.linkWebsite.test(label)) block.links.website ??= url;
    else if (TXT.linkArchitecture.test(label)) block.links.architecture ??= url;
    else if (TXT.linkGithub.test(label)) block.links.github ??= url;
    else if (TXT.linkVideo.test(label)) block.links.video ??= url;
    else if (anchor.querySelector(SEL.githubIcon) !== null)
      block.links.github ??= url;
  }
  return block;
}

function videoUrl(src: string | null): string | null {
  const url = unwrapHref(src);
  if (url === null) return null;
  if (onDomain(url, "youtube.com") || onDomain(url, "youtube-nocookie.com")) {
    const id = /^\/embed\/([\w-]+)/.exec(url.pathname)?.[1];
    if (id !== undefined) return `https://www.youtube.com/watch?v=${id}`;
  }
  return `${url.origin}${url.pathname}`;
}

function findVideo(
  root: ParentNode,
  bodies: readonly Element[],
): string | null {
  for (const frame of root.querySelectorAll(SEL.video)) {
    if (bodies.some((body) => body.contains(frame))) continue;
    const url = videoUrl(frame.getAttribute("src"));
    if (url !== null) return url;
  }
  return null;
}

function normalizeName(text: string): string {
  return text.replace(/[’‘`]/g, "'").toLowerCase();
}

function roleFor(name: string, teamText: string): string | null {
  if (teamText === "") return null;
  const haystack = normalizeName(teamText);
  const at = haystack.indexOf(normalizeName(name));
  if (at < 0) return null;
  const after = teamText.slice(at + name.length);
  const role = ROLE_AFTER_NAME.exec(after)?.[1]?.trim();
  return role === undefined || role === "" ? null : role;
}

function readTeam(
  root: ParentNode,
  teamText: string,
  otherContainer: Element | null,
  debug: boolean,
): TeamMember[] {
  const members: TeamMember[] = [];
  const seen = new Set<string>();
  for (const card of root.querySelectorAll(SEL.teamCard)) {
    if (
      otherContainer?.contains(card) ||
      card.querySelector(SEL.button) !== null
    )
      continue;
    const name = unescapeTeamName(
      clean(card.querySelector(SEL.teamName)?.textContent),
    );
    if (name === "" || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    const member: TeamMember = {
      name,
      role: roleFor(name, teamText),
      github: null,
      x: null,
      linkedin: null,
    };
    for (const anchor of card.querySelectorAll(SEL.link)) {
      const url = unwrapHref(anchor.getAttribute("href"));
      if (url === null) continue;
      const host = hostOf(url);
      if (host === "github.com") member.github ??= githubHandle(url);
      else if (host === "x.com" || host === "twitter.com")
        member.x ??= firstPathSegment(url);
      else if (onDomain(url, "linkedin.com")) member.linkedin ??= url.href;
    }
    members.push(member);
  }
  if (members.length === 0) logMiss(debug, "teamCard");
  return members;
}

interface ProjectStats {
  teamSize: number | null;
  category: string | null;
  totalAwardedUsd: number | null;
  awardedSubmissions: number | null;
  projectId: string | null;
}

function readProjectStats(root: ParentNode, debug: boolean): ProjectStats {
  const stats: ProjectStats = {
    teamSize: null,
    category: null,
    totalAwardedUsd: null,
    awardedSubmissions: null,
    projectId: null,
  };
  const heading = findHeading(root, TXT.projectStats);
  const container = heading?.parentElement?.parentElement ?? null;
  if (container === null) {
    logMiss(debug, "projectStats");
    return stats;
  }
  const href =
    container.querySelector(SEL.projectLink)?.getAttribute("href") ?? null;
  const projectPath = unwrapHref(href)
    ?.pathname.split("/")
    .filter((part) => part !== "");
  stats.projectId = projectPath?.[2] ?? null;
  for (const { element, text } of leafDivTexts(container)) {
    const value = clean(element.nextElementSibling?.textContent);
    if (value === "") continue;
    if (TXT.statTeamSize.test(text)) stats.teamSize = parseCount(value);
    else if (TXT.statCategory.test(text)) stats.category = value;
    else if (TXT.statTotalAwarded.test(text))
      stats.totalAwardedUsd = parseUsd(value);
    else if (TXT.statAwardedSubmissions.test(text))
      stats.awardedSubmissions = parseCount(value);
  }
  return stats;
}

function findOtherSubmissionsContainer(root: ParentNode): Element | null {
  let node = findHeading(root, TXT.otherSubmissions)?.parentElement ?? null;
  for (let depth = 0; node !== null && depth < MAX_OTHER_DEPTH; depth += 1) {
    if (node.querySelector(SEL.teamCard) !== null) return node;
    for (const paragraph of node.querySelectorAll(SEL.paragraph)) {
      if (TXT.noOtherSubmissions.test(clean(paragraph.textContent)))
        return node;
    }
    node = node.parentElement;
  }
  return null;
}

function readOtherSubmissionCards(
  container: Element | null,
): OtherSubmission[] | null {
  if (container === null) return null;
  const cards: OtherSubmission[] = [];
  for (const card of container.querySelectorAll(SEL.teamCard)) {
    const paragraphs = [...card.querySelectorAll(SEL.paragraph)].filter(
      (p) => p.closest(SEL.button) === null,
    );
    const byIndex = paragraphs.findIndex((p) =>
      TXT.byPrefix.test(clean(p.textContent)),
    );
    const title = clean(paragraphs[byIndex + 1]?.textContent);
    if (title === "") continue;
    const other: OtherSubmission = {
      id: null,
      title,
      status: null,
      roundName: null,
      budgetUsd: null,
      awardType: null,
    };
    const rest: string[] = [];
    for (const { text } of leafDivTexts(card)) {
      if (TXT.roundChip.test(text)) other.roundName ??= text;
      else if (TXT.budgetChip.test(text)) other.budgetUsd ??= parseUsd(text);
      else rest.push(text);
    }
    other.awardType = rest[0] ?? null;
    other.status = rest[1] ?? null;
    cards.push(other);
  }
  if (cards.length > 0) return cards;
  for (const paragraph of container.querySelectorAll(SEL.paragraph)) {
    if (TXT.noOtherSubmissions.test(clean(paragraph.textContent))) return [];
  }
  return null;
}

function projectNameOf(record: SummaryRecord | null): string | null {
  const names = record?.projectName ?? null;
  const first = Array.isArray(names) ? (names[0] ?? null) : names;
  return cleanRecordText(first);
}

function toOtherSubmission(record: SummaryRecord): OtherSubmission | null {
  if (record.id === null) return null;
  return {
    id: record.id,
    title: cleanRecordText(record.title) ?? "",
    status: record.status,
    roundName: record.roundName,
    budgetUsd: record.budget,
    awardType: record.awardType,
  };
}

function readSections(root: ParentNode, debug: boolean) {
  const elements = findSubmissionSections(root);
  if (elements.length === 0) logMiss(debug, "sectionHeading");
  return elements.map((element) => {
    const lines = readLines(element.body);
    return { element, lines, text: lines.map((line) => line.text).join("\n") };
  });
}

async function parse(
  root: ParentNode,
  input: SubmissionPageInput,
): Promise<SubmissionPage | null> {
  const debug = input.debug === true;
  const payload = payloadSchema.parse(input.payload ?? null);
  const rawSummary = payload?.summary ?? null;
  const rawProject = payload?.project ?? null;
  const rawRecords =
    rawProject?.submissions.filter((r): r is SummaryRecord => r !== null) ?? [];
  const stale =
    (rawSummary?.id != null && rawSummary.id !== input.id) ||
    (rawRecords.length > 0 && !rawRecords.some((r) => r.id === input.id));
  const projectRecord = stale ? null : rawProject;
  const ownRecords = stale ? [] : rawRecords;
  const summary = stale
    ? null
    : (rawSummary ?? ownRecords.find((r) => r.id === input.id) ?? null);

  const header = readTitleBlock(root, debug);
  const sections = readSections(root, debug);
  if (header.title === null && sections.length === 0) return null;

  const sectionTexts: SectionText[] = sections.map(({ element, text }) => ({
    id: element.id,
    title: element.title,
    text,
  }));

  const tranches: Tranche[] = [];
  let onchainMetric: string | null = null;
  let metricFound = false;
  let requestedBudget: number | null = null;
  let teamText = "";
  for (const { element, lines, text } of sections) {
    if (TXT.onchainMetric.test(element.title)) {
      metricFound = true;
      onchainMetric ??= text === "" ? null : text;
      continue;
    }
    const tranche = TXT.tranche.exec(element.title);
    if (tranche?.[1] !== undefined) {
      tranches.push(parseTranche(element.title, Number(tranche[1]), lines));
      continue;
    }
    if (TXT.requestedBudget.test(element.title))
      requestedBudget ??= parseUsd(text);
    else if (TXT.team.test(element.title)) teamText = text;
  }
  if (!metricFound) logMiss(debug, "onchainMetricSection");
  const stats = readProjectStats(root, debug);
  const otherContainer = findOtherSubmissionsContainer(root);
  const team = readTeam(root, teamText, otherContainer, debug);
  const bodies = sections.map(({ element }) => element.body);
  const awardRound = Number(
    /#\s*(\d+)/.exec(summary?.roundName ?? "")?.[1] ??
      header.roundNumber ??
      Number.NaN,
  );
  const respondsToRfp =
    awardRound >= FIRST_TRACK_ROUND &&
    (sections.some(({ text }) =>
      RFP_PHRASES.some((phrase) => phrase.test(text)),
    ) ||
      bodies.some((body) =>
        Array.from(body.querySelectorAll(SEL.link)).some((anchor) =>
          RFP_LINK.test(unwrapHref(anchor.getAttribute("href"))?.href ?? ""),
        ),
      ));
  const links: Links = {
    ...header.links,
    video: header.links.video ?? findVideo(root, bodies),
  };

  const addressSource: string[] = sectionTexts.map((section) => section.text);
  for (const body of bodies) {
    for (const anchor of body.querySelectorAll(SEL.link)) {
      const url = unwrapHref(anchor.getAttribute("href"));
      if (url !== null) addressSource.push(url.href);
    }
  }
  const addresses = detectStellarAddresses(addressSource.join("\n"));

  const awardType = summary?.awardType ?? header.awardType;
  const roundNumber =
    header.roundNumber ??
    /#\s*(\d+)/.exec(summary?.roundName ?? "")?.[1] ??
    null;
  const projectId =
    summary?.project ?? projectRecord?.id ?? stats.projectId ?? "";
  const now = input.now ?? Date.now();

  const byLine = header.byLine ?? projectNameOf(summary) ?? "";
  const submission: Submission = {
    id: input.id,
    roundId: roundNumber ?? "",
    projectId,
    title: header.title ?? cleanRecordText(summary?.title ?? null) ?? "",
    byLine,
    budgetUsd: wholeBudget(
      requestedBudget ?? summary?.budget ?? header.budgetUsd,
    ),
    status: summary?.status ?? header.status ?? "",
    kind: awardType !== null && /build/i.test(awardType) ? "build" : "other",
    track: respondsToRfp
      ? "rfp"
      : metricFound
        ? onchainMetric === null
          ? "open"
          : "integration"
        : "unknown",
    trackSource: metricFound || respondsToRfp ? "heuristic" : "unknown",
    parserVersion: PARSER_VERSION,
    category: projectRecord?.category ?? stats.category,
    tranches,
    onchainMetric,
    team,
    teamSize: toCount(projectRecord?.team?.count ?? null) ?? stats.teamSize,
    totalAwardedUsd: projectRecord?.totalAwarded ?? stats.totalAwardedUsd,
    awardedSubmissions: stats.awardedSubmissions,
    links,
    stellarAccounts: addresses.accounts,
    stellarContracts: addresses.contracts,
    sections: sectionTexts.map(({ id, title }) => ({ id, title })),
    contentHash: await computeContentHash(sectionTexts),
    fetchedAt: now,
  };

  const otherSubmissions =
    ownRecords.length > 0
      ? ownRecords
          .filter((r) => r.id !== input.id)
          .map(toOtherSubmission)
          .filter((r): r is OtherSubmission => r !== null)
      : readOtherSubmissionCards(otherContainer);

  const project: Project | null =
    projectId === ""
      ? null
      : {
          id: projectId,
          name: projectNameOf(summary) ?? byLine,
          submissionIds: [
            ...new Set([
              input.id,
              ...ownRecords
                .map((r) => r.id)
                .filter((id): id is string => id !== null),
            ]),
          ],
          totalAwardedUsd: submission.totalAwardedUsd,
          awardedSubmissions: submission.awardedSubmissions,
          fetchedAt: now,
        };

  const bodyText = sectionTexts
    .map((section) => `${section.title}\n${section.text}`)
    .join("\n");
  return { submission, project, otherSubmissions, sectionTexts, bodyText };
}

export async function parseSubmissionPage(
  root: ParentNode,
  input: SubmissionPageInput,
): Promise<SubmissionPage | null> {
  try {
    return await parse(root, input);
  } catch (error) {
    logMiss(input.debug === true, `submission page (${String(error)})`);
    return null;
  }
}
