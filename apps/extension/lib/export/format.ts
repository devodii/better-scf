import type { Submission } from 'shared';

const NOTE_MAX_CHARS = 200;

export function formatBudget(usd: number | null): string {
  if (usd === null || !Number.isFinite(usd)) return 'n/a';
  const sign = usd < 0 ? '-' : '';
  const abs = Math.abs(usd);
  if (abs >= 999_950) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 999.5) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs)}`;
}

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
