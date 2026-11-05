import { openBetterScfDb } from '@/lib/db';
import { exportCsv, exportMarkdown } from '@/lib/export';

export const REPOSITORY_URL = 'https://github.com/devodii/better-scf';

export interface RoundOption {
  id: string;
  label: string;
}

export type ExportFormat = 'markdown' | 'csv';

export async function loadRounds(): Promise<RoundOption[]> {
  const db = await openBetterScfDb();
  try {
    const [submissions, rounds] = await Promise.all([
      db.getAll('submissions'),
      db.getAll('rounds'),
    ]);
    const counts = new Map<string, number>();
    for (const s of submissions) counts.set(s.roundId, (counts.get(s.roundId) ?? 0) + 1);
    const names = new Map(rounds.map((r) => [r.id, r.name]));
    return [...counts]
      .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
      .map(([id, count]) => ({
        id,
        label: `${names.get(id) || `SCF #${id}`} (${count})`,
      }));
  } finally {
    db.close();
  }
}

export async function buildExport(
  roundId: string,
  format: ExportFormat,
  includeRepositoryLink: boolean,
): Promise<string> {
  const db = await openBetterScfDb();
  try {
    const [submissions, reviews] = await Promise.all([
      db.getAllFromIndex('submissions', 'roundId', roundId),
      db.getAll('review'),
    ]);
    return format === 'csv'
      ? exportCsv(submissions, reviews)
      : exportMarkdown(submissions, reviews, {
          roundId,
          includeRepositoryLink,
          repositoryUrl: REPOSITORY_URL,
        });
  } finally {
    db.close();
  }
}

export function download(text: string, roundId: string, format: ExportFormat): void {
  const isCsv = format === 'csv';
  const url = URL.createObjectURL(
    new Blob([text], { type: isCsv ? 'text/csv;charset=utf-8' : 'text/markdown;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = `scf-${roundId}-review.${isCsv ? 'csv' : 'md'}`;
  link.click();
  URL.revokeObjectURL(url);
}
