import styles from './GridSort.module.scss';

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
    <label className={styles.root}>
      <span className={styles.label}>Sort</span>
      <select
        className={styles.select}
        value={value}
        onChange={(event) => {
          const next = OPTIONS.find((option) => option.value === event.target.value);
          if (next) onChange(next.value);
        }}
      >
        {OPTIONS.filter((option) => hasReviews || option.value !== 'opened').map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
