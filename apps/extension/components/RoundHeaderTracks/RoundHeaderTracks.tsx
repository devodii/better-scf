import { Chip, type ChipVariant } from '../Chip';
import { TrackIcon, type TrackIconKind } from '../TrackIcon';
import styles from './RoundHeaderTracks.module.scss';

export interface RoundHeaderTrackCounts {
  integration: number;
  open: number;
  rfp: number;
}

export interface RoundHeaderTracksProps {
  counts: RoundHeaderTrackCounts;
  total: number;
}

const TRACKS: readonly {
  key: keyof RoundHeaderTrackCounts;
  label: string;
  variant: ChipVariant;
  icon: TrackIconKind;
}[] = [
  { key: 'integration', label: 'Integration', variant: 'purple', icon: 'integration' },
  { key: 'open', label: 'Open', variant: 'olive', icon: 'open' },
  { key: 'rfp', label: 'RFP', variant: 'yellow', icon: 'rfp' },
];

export function RoundHeaderTracks({ counts, total }: RoundHeaderTracksProps) {
  const known = counts.integration + counts.open + counts.rfp;
  if (known === 0) return null;
  const unknown = Math.max(total - known, 0);
  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className={styles.title}>By track</span>
        <span className={styles.note}>
          track known for {known} of {total}
        </span>
      </div>
      <div
        className={styles.bar}
        role="img"
        aria-label={TRACKS.filter(({ key }) => counts[key] > 0)
          .map(({ key, label }) => `${label} ${counts[key]}`)
          .join(', ')}
      >
        {TRACKS.map(({ key, variant }) =>
          counts[key] > 0 ? (
            <span
              key={key}
              className={`${styles.segment} ${styles[variant]}`}
              style={{ flexGrow: counts[key] }}
            />
          ) : null,
        )}
        {unknown > 0 && (
          <span className={`${styles.segment} ${styles.rest}`} style={{ flexGrow: unknown }} />
        )}
      </div>
      <ul aria-label="Submissions by track" className={styles.list}>
        {TRACKS.map(({ key, label, variant, icon }) =>
          counts[key] > 0 ? (
            <li key={key} className={styles.item}>
              <Chip variant={variant} icon={<TrackIcon kind={icon} />}>
                {label} {counts[key]}
              </Chip>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
