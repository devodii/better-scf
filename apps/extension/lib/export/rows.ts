import type { ReviewState, Submission } from "shared";
import { flatten, formatBudget, prepareNote, trackLabel } from "./format";

export interface ExportOptions {
  roundId: string;
  includeRepositoryLink?: boolean;
  repositoryUrl?: string;
}

interface ExportRow {
  project: string;
  track: string;
  requested: string;
  stance: string;
  note: string;
}

interface ExportSummary {
  rows: ExportRow[];
  reviewed: number;
  total: number;
}

function isReviewed(state: ReviewState | undefined): boolean {
  if (!state) return false;
  return (
    state.stance !== "none" || state.shortlisted || state.note.trim() !== ""
  );
}

export function buildSummary(
  submissions: readonly Submission[],
  reviewStates: readonly ReviewState[],
): ExportSummary {
  const byId = new Map<string, ReviewState>();
  for (const state of reviewStates) byId.set(state.submissionId, state);

  let reviewed = 0;
  const rows = submissions.map((submission): ExportRow => {
    const state = byId.get(submission.id);
    if (isReviewed(state)) reviewed += 1;
    return {
      project: flatten(submission.title),
      track: trackLabel(submission.track),
      requested: formatBudget(submission.budgetUsd),
      stance: state?.stance ?? "none",
      note: prepareNote(state?.note ?? ""),
    };
  });
  return { rows, reviewed, total: submissions.length };
}
