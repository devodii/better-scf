import type { Submission } from 'shared';

export { formatBudget } from '../format/money';

const NOTE_MAX_CHARS = 200;

const TRACK_LABELS: Record<Submission['track'], string> = {
  open: 'Open',
  integration: 'Integration',
  rfp: 'RFP',
  unknown: 'Unknown',
};

export function trackLabel(track: Submission['track']): string {
  return TRACK_LABELS[track];
}

export function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function prepareNote(note: string): string {
  const flat = flatten(note);
  const chars = Array.from(flat);
  if (chars.length <= NOTE_MAX_CHARS) return flat;
  return `${chars
    .slice(0, NOTE_MAX_CHARS - 1)
    .join('')
    .trimEnd()}…`;
}
