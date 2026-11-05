import { Chip, type ChipVariant } from '../Chip';
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
}[] = [
  { key: 'integration', label: 'Integration', variant: 'purple' },
  { key: 'open', label: 'Open', variant: 'olive' },
  { key: 'rfp', label: 'RFP', variant: 'yellow' },
];

export function RoundHeaderTracks({ counts, total }: RoundHeaderTracksProps) {
  const known = counts.integration + counts.open + counts.rfp;
  if (known === 0) return null;
  return (
    <div className={styles.root}>
      <ul aria-label="Submissions by track" className={styles.list}>
        {TRACKS.map(({ key, label, variant }) =>
          counts[key] > 0 ? (
            <li key={key} className={styles.item}>
              <Chip variant={variant}>
                {label} {counts[key]}
              </Chip>
            </li>
          ) : null,
        )}
      </ul>
      <span className={styles.note}>
        track known for {known} of {total}
      </span>
    </div>
  );
}
