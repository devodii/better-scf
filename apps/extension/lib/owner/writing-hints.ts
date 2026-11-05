import { NOT_APPLICABLE, type OwnerInput, type OwnerResult } from './types';

export type HintPattern =
  | 'stacked-adjectives'
  | 'buzzword'
  | 'triple-noun-stack'
  | 'uniform-paragraphs'
  | 'bold-label-bullets'
  | 'em-dash-density';

export interface WritingHint {
  pattern: HintPattern;
  phrase: string;
  note: 'consider rewording';
}

export interface WritingHints {
  hints: WritingHint[];
}

const hint = (pattern: HintPattern, phrase: string): WritingHint => ({
  pattern,
  phrase,
  note: 'consider rewording',
});

const BUZZWORDS = /\b(?:leverage|leverages|leveraging|seamlessly|seamless|robust|cutting-edge)\b/gi;

const ADJECTIVES =
  'innovative|scalable|robust|seamless|powerful|comprehensive|holistic|dynamic|cutting-edge|state-of-the-art|transformative|intuitive|flexible|secure|efficient|reliable|versatile|user-friendly|next-generation|game-changing|revolutionary';
const STACKED_ADJECTIVES = new RegExp(
  `\\b(?:${ADJECTIVES})(?:\\s*(?:,|and)\\s*|\\s+)(?:${ADJECTIVES})(?:\\s*(?:,|and)\\s*|\\s+)(?:${ADJECTIVES})\\b`,
  'gi',
);

const NOUN = '[a-z]+(?:ion|ity|ment|ance|ence|ness|ing|ship)s?';
const TRIPLE_NOUNS = new RegExp(`\\b${NOUN},\\s+${NOUN},?\\s+(?:and\\s+)?${NOUN}\\b`, 'gi');

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;
const BOLD_BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(?:\*\*|__)[^*_]+(?:\*\*|__)/;

const MIN_PARAGRAPHS_FOR_UNIFORMITY = 4;
const MIN_WORDS_PER_PARAGRAPH = 15;
const UNIFORM_TOLERANCE = 0.15;
const MIN_BOLD_BULLETS = 3;
const MIN_EM_DASHES = 3;
const EM_DASHES_PER_100_WORDS = 1;

const wordCount = (s: string): number => s.split(/\s+/).filter(Boolean).length;

const matches = (text: string, re: RegExp): string[] => Array.from(text.matchAll(re), (m) => m[0]);

function uniformParagraphs(text: string): boolean {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '' && !/^[-*#>\d]/.test(p));
  if (paragraphs.length < MIN_PARAGRAPHS_FOR_UNIFORMITY) return false;
  const lengths = paragraphs.map(wordCount);
  if (lengths.some((n) => n < MIN_WORDS_PER_PARAGRAPH)) return false;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  return lengths.every((n) => Math.abs(n - mean) <= mean * UNIFORM_TOLERANCE);
}

function boldLabelBullets(text: string): boolean {
  const bullets = text.split('\n').filter((l) => BULLET.test(l));
  return bullets.length >= MIN_BOLD_BULLETS && bullets.every((l) => BOLD_BULLET.test(l));
}

export function writingHints(
  { isOwner }: Pick<OwnerInput, 'isOwner'>,
  text: string,
): OwnerResult<WritingHints> {
  if (!isOwner) return NOT_APPLICABLE;
  const hints: WritingHint[] = [];

  for (const phrase of matches(text, STACKED_ADJECTIVES)) {
    hints.push(hint('stacked-adjectives', phrase));
  }
  for (const phrase of matches(text, BUZZWORDS)) hints.push(hint('buzzword', phrase));
  for (const phrase of matches(text, TRIPLE_NOUNS)) hints.push(hint('triple-noun-stack', phrase));

  if (uniformParagraphs(text)) {
    hints.push(hint('uniform-paragraphs', 'Every paragraph is about the same length'));
  }
  if (boldLabelBullets(text)) {
    hints.push(hint('bold-label-bullets', 'Every bullet starts with a bold label'));
  }

  const dashes = (text.match(/—/g) ?? []).length;
  if (dashes >= MIN_EM_DASHES) {
    const words = wordCount(text);
    if ((dashes / words) * 100 > EM_DASHES_PER_100_WORDS) {
      hints.push(hint('em-dash-density', `${dashes} em dashes in ${words} words`));
    }
  }

  return { applicable: true, hints };
}
