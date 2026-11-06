import { formatBudget } from '../../lib/format/money';
import { RoundHeaderStat } from '../RoundHeaderStat';
import { type RoundHeaderTrackCounts, RoundHeaderTracks } from '../RoundHeaderTracks';
import styles from './RoundHeader.module.scss';

export interface RoundHeaderProps {
  countdown: string | null;
  submissions: number;
  parsed: number;
  totalRequested: number | null;
  medianRequested: number | null;
  tracks: RoundHeaderTrackCounts | null;
}

export function RoundHeader({
  countdown,
  submissions,
  parsed,
  totalRequested,
  medianRequested,
  tracks,
}: RoundHeaderProps) {
  const hint = `${parsed} of ${submissions} parsed`;
  return (
    <section aria-label="Round summary" className={styles.root}>
      {countdown && <p className={styles.countdown}>{countdown}</p>}
      <dl className={styles.stats}>
        <RoundHeaderStat label="Submissions" value={String(submissions)} />
        <RoundHeaderStat label="Total requested" value={formatBudget(totalRequested)} hint={hint} />
        <RoundHeaderStat
          label="Median requested"
          value={formatBudget(medianRequested)}
          hint={hint}
        />
      </dl>
      {tracks && <RoundHeaderTracks counts={tracks} total={submissions} />}
    </section>
  );
}
