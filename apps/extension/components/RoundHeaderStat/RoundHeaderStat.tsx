import { Tooltip } from '../Tooltip';
import styles from './RoundHeaderStat.module.scss';

export interface RoundHeaderStatProps {
  label: string;
  value: string;
  hint?: string | undefined;
}

export function RoundHeaderStat({ label, value, hint }: RoundHeaderStatProps) {
  return (
    <div className={styles.root}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>
        {hint ? (
          <Tooltip content={hint}>
            <button type="button" className={styles.trigger} aria-label={`${label}: ${value}`}>
              {value}
            </button>
          </Tooltip>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
