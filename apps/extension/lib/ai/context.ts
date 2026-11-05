import { CHAT_LIMITS, type Submission } from 'shared';

export interface SectionText {
  id: string;
  title: string;
  text: string;
}

export type RoundListItem = Pick<Submission, 'id' | 'title' | 'byLine' | 'budgetUsd' | 'track'>;

const TRUNCATION_MARK = '\n[truncated]';
const MIN_PARTIAL_SECTION_CHARS = 200;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function formatUsd(value: number | null): string {
  if (value === null) return 'not stated';
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

function cap(text: string, max: number): string {
  if (text.length <= max) return text;
  if (max <= TRUNCATION_MARK.length) return text.slice(0, max);
  return `${text.slice(0, max - TRUNCATION_MARK.length)}${TRUNCATION_MARK}`;
}

export async function computeContentHash(sections: readonly SectionText[]): Promise<string> {
  const bytes = new TextEncoder().encode(
    sections.map((section) => normalizeText(section.text)).join('\n'),
  );
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function headerBlock(submission: Submission): string {
  return [
    `# ${normalizeText(submission.title)}`,
    `By: ${normalizeText(submission.byLine) || 'not stated'}`,
    `Round: SCF #${submission.roundId}`,
    `Budget: ${formatUsd(submission.budgetUsd)}`,
    `Track: ${submission.track}`,
    `Category: ${submission.category ?? 'not stated'}`,
    `Status: ${submission.status || 'not stated'}`,
  ].join('\n');
}

function tranchesBlock(submission: Submission): string | null {
  if (submission.tranches.length === 0) return null;
  const lines = ['## TRANCHES'];
  for (const tranche of submission.tranches) {
    lines.push(`- ${normalizeText(tranche.title)}: ${formatUsd(tranche.totalUsd)}`);
    for (const deliverable of tranche.deliverables) {
      lines.push(`  - ${normalizeText(deliverable.title)} (${formatUsd(deliverable.totalUsd)})`);
    }
  }
  return lines.join('\n');
}

function metricBlock(submission: Submission): string | null {
  if (submission.onchainMetric === null) return null;
  return `## ON-CHAIN METRIC\n${normalizeText(submission.onchainMetric)}`;
}

function teamBlock(submission: Submission): string | null {
  if (submission.team.length === 0) return null;
  const lines = ['## TEAM'];
  for (const member of submission.team) {
    const links = [member.github, member.x, member.linkedin].filter(
      (link): link is string => link !== null,
    );
    const role = member.role === null ? '' : ` (${normalizeText(member.role)})`;
    lines.push(
      `- ${normalizeText(member.name)}${role}${links.length > 0 ? `: ${links.join(', ')}` : ''}`,
    );
  }
  return lines.join('\n');
}

function statsBlock(submission: Submission): string {
  const lines = ['## PROJECT STATS'];
  if (submission.teamSize !== null) lines.push(`- Team size: ${submission.teamSize}`);
  if (submission.totalAwardedUsd !== null) {
    lines.push(`- Total awarded to the project: ${formatUsd(submission.totalAwardedUsd)}`);
  }
  if (submission.awardedSubmissions !== null) {
    lines.push(`- Awarded submissions: ${submission.awardedSubmissions}`);
  }
  for (const [name, url] of Object.entries(submission.links)) {
    if (url !== null) lines.push(`- ${name}: ${url}`);
  }
  return lines.join('\n');
}

function sectionBlock(section: SectionText): string | null {
  const text = normalizeText(section.text);
  if (text === '') return null;
  return `## ${normalizeText(section.title).toUpperCase()}\n${text}`;
}

export function buildSubmissionContext(
  submission: Submission,
  sections: readonly SectionText[],
  maxChars: number = CHAT_LIMITS.maxContextChars,
): string {
  const priority = [
    headerBlock(submission),
    tranchesBlock(submission),
    metricBlock(submission),
    teamBlock(submission),
    statsBlock(submission),
  ].filter((block): block is string => block !== null);

  let document = priority.join('\n\n');
  if (document.length >= maxChars) return cap(document, maxChars);

  for (const section of sections) {
    const block = sectionBlock(section);
    if (block === null) continue;
    const addition = `\n\n${block}`;
    const room = maxChars - document.length;
    if (addition.length <= room) {
      document += addition;
      continue;
    }
    if (room >= MIN_PARTIAL_SECTION_CHARS) document += `\n\n${cap(block, room - 2)}`;
    break;
  }
  return document;
}

export function buildRoundContext(
  roundId: string,
  items: readonly RoundListItem[],
  maxChars: number = CHAT_LIMITS.maxContextChars,
): string {
  let document = `# SCF #${roundId} submissions (${items.length})`;
  let included = 0;
  for (const item of items) {
    const line = `- ${normalizeText(item.title)} | by ${normalizeText(item.byLine) || 'not stated'} | budget ${formatUsd(item.budgetUsd)} | track ${item.track}`;
    if (line.length + 1 > maxChars - document.length - 80) break;
    document += `\n${line}`;
    included += 1;
  }
  if (included < items.length) {
    document += `\n[${items.length - included} more submissions not listed]`;
  }
  return cap(document, maxChars);
}
