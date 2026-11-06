import { formatBudget } from '../../lib/format/money';
import { RoundHeaderStat } from '../RoundHeaderStat';
import { type RoundHeaderTrackCounts, RoundHeaderTracks } from '../RoundHeaderTracks';
import { StatIcon } from '../StatIcon';
import styles from './RoundHeader.module.scss';

export interface RoundHeaderProps {
  countdown: string | null;
  submissions: number;
  siteTotal?: number | null;
  parsed: number;
  totalRequested: number | null;
  medianRequested: number | null;
  tracks: RoundHeaderTrackCounts | null;
}

export function RoundHeader({
  countdown,
  submissions,
  siteTotal = null,
  parsed,
  totalRequested,
  medianRequested,
  tracks,
}: RoundHeaderProps) {
  const hint = `${parsed} of ${submissions} parsed`;
  return (
    <section aria-label="Round summary" className={styles.root}>
      {countdown && (
        <div className={styles.countdownRow}>
          <span className={styles.clock} aria-hidden="true">
            <StatIcon kind="clock" />
          </span>
          <p className={styles.countdown}>{countdown}</p>
        </div>
      )}
      <dl className={styles.stats}>
        <RoundHeaderStat
          label="Submissions"
          value={String(submissions)}
          hint={
            siteTotal !== null && siteTotal > submissions
              ? `The site counts ${siteTotal} applications for this round but lists ${submissions}`
              : undefined
          }
          icon={<StatIcon kind="submissions" />}
        />
        <RoundHeaderStat
          label="Total requested"
          value={formatBudget(totalRequested)}
          hint={hint}
          icon={<StatIcon kind="total" />}
        />
        <RoundHeaderStat
          label="Median requested"
          value={formatBudget(medianRequested)}
          hint={hint}
          icon={<StatIcon kind="median" />}
        />
      </dl>
      {tracks && <RoundHeaderTracks counts={tracks} total={submissions} />}
    </section>
  );
}
