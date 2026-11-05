import type { Submission } from 'shared';

export interface OwnerInput {
  isOwner: boolean;
  submission: Submission;
}

export type OwnerResult<T> = { applicable: false } | ({ applicable: true } & T);

export const NOT_APPLICABLE = { applicable: false } as const;

export type CheckStatus = 'ok' | 'mismatch' | 'cannot-check';
