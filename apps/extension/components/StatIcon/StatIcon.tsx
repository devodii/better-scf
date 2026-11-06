import styles from './StatIcon.module.scss';

export type StatIconKind =
  | 'clock'
  | 'submissions'
  | 'total'
  | 'median'
  | 'submit'
  | 'review'
  | 'vote'
  | 'award';

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
  submit: [
    'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z',
    'M14 3v5h5',
    'M9 13h6',
    'M9 17h4',
  ],
  review: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4', 'M8.5 11l2 2 3.5-4'],
  vote: ['M4 13h16v7H4z', 'M8 13V4h8v9', 'M10 8l1.5 1.5L14 7'],
  award: [
    'M8 4h8v5a4 4 0 0 1-8 0z',
    'M8 6H5v1a3 3 0 0 0 3 3',
    'M16 6h3v1a3 3 0 0 1-3 3',
    'M12 13v4',
    'M9 20h6',
    'M10 17h4',
  ],
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
