import type { ReviewState, Submission } from 'shared';
import { buildSummary } from './rows';

const HEADER = ['Project', 'Track', 'Requested', 'Stance', 'Note'];

function csvField(text: string): string {
  // A leading = + - @ makes spreadsheets run the cell as a formula
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function exportCsv(
  submissions: readonly Submission[],
  reviewStates: readonly ReviewState[],
): string {
  const { rows } = buildSummary(submissions, reviewStates);
  const lines = [
    HEADER.map(csvField).join(','),
    ...rows.map((row) =>
      [
        csvField(row.project),
        csvField(row.track),
        `"${row.requested}"`,
        csvField(row.stance),
        csvField(row.note),
      ].join(','),
    ),
  ];
  return `${lines.join('\r\n')}\r\n`;
}
