import { type CheckStatus, NOT_APPLICABLE, type OwnerInput, type OwnerResult } from './types';

export interface TeamCheck {
  status: CheckStatus;
  listedCount: number;
  statedSize: number | null;
  reason: string | null;
}

export function checkTeam({ isOwner, submission }: OwnerInput): OwnerResult<TeamCheck> {
  if (!isOwner) return NOT_APPLICABLE;
  const listedCount = submission.team.length;
  const statedSize = submission.teamSize;
  if (statedSize === null) {
    return {
      applicable: true,
      status: 'cannot-check',
      listedCount,
      statedSize,
      reason: 'No team size is stated.',
    };
  }
  if (listedCount === 0) {
    return {
      applicable: true,
      status: 'cannot-check',
      listedCount,
      statedSize,
      reason: 'No team members were found on the page.',
    };
  }
  return {
    applicable: true,
    status: listedCount === statedSize ? 'ok' : 'mismatch',
    listedCount,
    statedSize,
    reason: null,
  };
}
