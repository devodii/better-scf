import type { ReviewState, Submission } from 'shared';
import { buildSummary, type ExportOptions } from './rows';

function escapeCell(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

export function exportMarkdown(
  submissions: readonly Submission[],
  reviewStates: readonly ReviewState[],
  options: ExportOptions,
): string {
  const { rows, reviewed, total } = buildSummary(submissions, reviewStates);

  let footer = `${reviewed} of ${total} reviewed · exported from better-scf`;
  if (options.includeRepositoryLink === true && options.repositoryUrl) {
    footer += ` · ${options.repositoryUrl}`;
  }

  const lines = [
    `SCF #${options.roundId} review notes`,
    '',
    '| Project | Track | Requested | Stance | Note |',
    '|---|---|---|---|---|',
    ...rows.map(
      (row) =>
        `| ${[row.project, row.track, row.requested, row.stance, row.note].map(escapeCell).join(' | ')} |`,
    ),
    '',
    footer,
  ];
  return `${lines.join('\n')}\n`;
}
