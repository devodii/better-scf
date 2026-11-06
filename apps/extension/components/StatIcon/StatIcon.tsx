import styles from './StatIcon.module.scss';

export type StatIconKind = 'clock' | 'submissions' | 'total' | 'median';

export interface StatIconProps {
  kind: StatIconKind;
}

const PATHS: Record<StatIconKind, string[]> = {
  clock: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 7.5V12l3 2'],
  submissions: ['M8 3h9v14H8z', 'M5 7v14h9', 'M11 8h3', 'M11 11h3'],
  total: [
    'M12 3v18',
    'M16.5 7.5C16.5 6 14.5 5 12 5S7.5 6 7.5 7.75 9.5 10.4 12 10.8s4.5 1 4.5 3S14.5 18 12 18s-4.5-1.2-4.5-2.8',
  ],
  median: ['M4 20h16', 'M7 20v-7', 'M12 20V5', 'M17 20v-10'],
};

export function StatIcon({ kind }: StatIconProps) {
  return (
    <svg className={styles.root} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
