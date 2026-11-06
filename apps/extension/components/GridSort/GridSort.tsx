import { Select } from '../Select';

export type GridSortKey = 'site' | 'budgetDesc' | 'budgetAsc' | 'title' | 'opened';

export interface GridSortProps {
  value: GridSortKey;
  onChange: (next: GridSortKey) => void;
  hasReviews: boolean;
}

const OPTIONS: readonly { value: GridSortKey; label: string }[] = [
  { value: 'site', label: 'Site order' },
  { value: 'budgetDesc', label: 'Budget, high to low' },
  { value: 'budgetAsc', label: 'Budget, low to high' },
  { value: 'title', label: 'Title, A to Z' },
  { value: 'opened', label: 'Last opened' },
];

export function GridSort({ value, onChange, hasReviews }: GridSortProps) {
  return (
    <Select
      label="Sort"
      value={value}
      options={OPTIONS.filter((option) => hasReviews || option.value !== 'opened')}
      onChange={onChange}
    />
  );
}
