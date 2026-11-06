import { formatBudget } from '../../lib/format/money';
import { RoundHeaderStat } from '../RoundHeaderStat';
import { type RoundHeaderTrackCounts, RoundHeaderTracks } from '../RoundHeaderTracks';
import { StatIcon, type StatIconKind } from '../StatIcon';
import styles from './RoundHeader.module.scss';

export interface RoundCountdown {
  phase: string;
  verb: 'starts' | 'ends';
  when: string;
}

export interface RoundHeaderProps {
  countdown: RoundCountdown | null;
  submissions: number;
  siteTotal?: number | null;
  parsed: number;
  totalRequested: number | null;
  medianRequested: number | null;
  tracks: RoundHeaderTrackCounts | null;
}

function phaseIcon(phase: string): StatIconKind {
  if (/submission/i.test(phase)) return 'submit';
  if (/review/i.test(phase)) return 'review';
  if (/vote/i.test(phase)) return 'vote';
  if (/award|distribution|notification/i.test(phase)) return 'award';
  return 'clock';
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
          <span className={styles.phaseIcon} aria-hidden="true">
            <StatIcon kind={phaseIcon(countdown.phase)} />
          </span>
          <p className={styles.countdown}>
            <span className={styles.phaseLabel}>
              {countdown.verb === 'ends' ? 'In progress' : 'Next up'}
            </span>
            <span className={styles.phaseLine}>
              <strong className={styles.phaseName}>{countdown.phase}</strong>
              <span className={styles.phaseWhen}>
                {countdown.verb} {countdown.when}
              </span>
            </span>
          </p>
        </div>
      )}
      <dl className={styles.stats}>
        <RoundHeaderStat
          label="Submissions"
          value={String(submissions)}
          note={
            siteTotal !== null && siteTotal > submissions
              ? `${siteTotal - submissions} more applications have not passed pre-screen.`
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
