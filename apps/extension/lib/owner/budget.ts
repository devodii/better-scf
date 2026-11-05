import { type CheckStatus, NOT_APPLICABLE, type OwnerInput, type OwnerResult } from './types';

export interface TrancheBudgetCheck {
  index: number;
  title: string;
  status: CheckStatus;
  deliverableSumUsd: number;
  deliverableTotalsUsd: readonly (number | null)[];
  statedTotalUsd: number | null;
  reason: string | null;
}

export interface BudgetCheck {
  tranches: TrancheBudgetCheck[];
  headerVsTranches: {
    status: CheckStatus;
    trancheSumUsd: number;
    trancheTotalsUsd: readonly (number | null)[];
    headerBudgetUsd: number | null;
    reason: string | null;
  };
}

const EPSILON = 0.005;
const sameAmount = (a: number, b: number): boolean => Math.abs(a - b) < EPSILON;
const sum = (values: readonly number[]): number => values.reduce((acc, v) => acc + v, 0);
const known = (values: readonly (number | null)[]): number[] =>
  values.filter((v): v is number => v !== null);

export function checkBudget({ isOwner, submission }: OwnerInput): OwnerResult<BudgetCheck> {
  if (!isOwner) return NOT_APPLICABLE;

  const tranches = submission.tranches.map((tranche): TrancheBudgetCheck => {
    const deliverableTotalsUsd = tranche.deliverables.map((d) => d.totalUsd);
    const deliverableSumUsd = sum(known(deliverableTotalsUsd));
    const base = {
      index: tranche.index,
      title: tranche.title,
      deliverableSumUsd,
      deliverableTotalsUsd,
      statedTotalUsd: tranche.totalUsd,
    };
    if (tranche.totalUsd === null) {
      return { ...base, status: 'cannot-check', reason: 'No tranche total is stated.' };
    }
    if (tranche.deliverables.length === 0) {
      return { ...base, status: 'cannot-check', reason: 'No deliverables were found.' };
    }
    if (deliverableTotalsUsd.some((v) => v === null)) {
      return { ...base, status: 'cannot-check', reason: 'A deliverable has no stated total.' };
    }
    return {
      ...base,
      status: sameAmount(deliverableSumUsd, tranche.totalUsd) ? 'ok' : 'mismatch',
      reason: null,
    };
  });

  const trancheTotalsUsd = submission.tranches.map((t) => t.totalUsd);
  const trancheSumUsd = sum(known(trancheTotalsUsd));
  const header = {
    trancheSumUsd,
    trancheTotalsUsd,
    headerBudgetUsd: submission.budgetUsd,
  };
  let headerVsTranches: BudgetCheck['headerVsTranches'];
  if (submission.budgetUsd === null) {
    headerVsTranches = { ...header, status: 'cannot-check', reason: 'No header budget is stated.' };
  } else if (submission.tranches.length === 0) {
    headerVsTranches = { ...header, status: 'cannot-check', reason: 'No tranches were found.' };
  } else if (trancheTotalsUsd.some((v) => v === null)) {
    headerVsTranches = {
      ...header,
      status: 'cannot-check',
      reason: 'A tranche has no stated total.',
    };
  } else {
    headerVsTranches = {
      ...header,
      status: sameAmount(trancheSumUsd, submission.budgetUsd) ? 'ok' : 'mismatch',
      reason: null,
    };
  }

  return { applicable: true, tranches, headerVsTranches };
}
