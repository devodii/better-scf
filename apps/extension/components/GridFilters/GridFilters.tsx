import type { Stance, Track } from 'shared';
import { GridFilterButton } from '../GridFilterButton';
import styles from './GridFilters.module.scss';

export type GridTrack = Exclude<Track, 'unknown'>;

export interface GridFilterState {
  stances: readonly Stance[];
  tracks: readonly GridTrack[];
  shortlisted: boolean;
  unread: boolean;
}

export const EMPTY_GRID_FILTERS: GridFilterState = {
  stances: [],
  tracks: [],
  shortlisted: false,
  unread: false,
};

export interface GridFiltersProps {
  value: GridFilterState;
  onChange: (next: GridFilterState) => void;
  availableTracks: readonly GridTrack[];
  hasReviews: boolean;
}

const STANCES: readonly { value: Stance; label: string }[] = [
  { value: 'support', label: 'Support' },
  { value: 'unsure', label: 'Unsure' },
  { value: 'against', label: 'Against' },
  { value: 'none', label: 'No stance' },
];

const TRACK_LABELS: Record<GridTrack, string> = {
  integration: 'Integration',
  open: 'Open',
  rfp: 'RFP',
};

function toggled<T>(list: readonly T[], item: T): T[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

export function GridFilters({ value, onChange, availableTracks, hasReviews }: GridFiltersProps) {
  if (!hasReviews && availableTracks.length === 0) return null;
  return (
    <fieldset aria-label="Filter submissions" className={styles.root}>
      {hasReviews &&
        STANCES.map(({ value: stance, label }) => (
          <GridFilterButton
            key={stance}
            label={label}
            isPressed={value.stances.includes(stance)}
            onPressedChange={() => onChange({ ...value, stances: toggled(value.stances, stance) })}
          />
        ))}
      {hasReviews && (
        <>
          <GridFilterButton
            label="Shortlisted"
            isPressed={value.shortlisted}
            onPressedChange={(shortlisted) => onChange({ ...value, shortlisted })}
          />
          <GridFilterButton
            label="Unread"
            isPressed={value.unread}
            onPressedChange={(unread) => onChange({ ...value, unread })}
          />
        </>
      )}
      {availableTracks.map((track) => (
        <GridFilterButton
          key={track}
          label={TRACK_LABELS[track]}
          isPressed={value.tracks.includes(track)}
          onPressedChange={() => onChange({ ...value, tracks: toggled(value.tracks, track) })}
        />
      ))}
    </fieldset>
  );
}
