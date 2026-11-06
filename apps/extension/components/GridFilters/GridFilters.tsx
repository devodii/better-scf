import type { Stance, Track } from 'shared';
import { Select, type SelectOption } from '../Select';

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

type FilterKey = `stance:${Stance}` | `track:${GridTrack}` | 'shortlisted' | 'unread';

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

export function GridFilters({ value, onChange, availableTracks, hasReviews }: GridFiltersProps) {
  const options: SelectOption<FilterKey>[] = [];
  if (hasReviews) {
    for (const { value: stance, label } of STANCES) {
      options.push({ value: `stance:${stance}`, label, group: 'Stance' });
    }
    options.push({ value: 'shortlisted', label: 'Shortlisted', group: 'Status' });
    options.push({ value: 'unread', label: 'Unread', group: 'Status' });
  }
  for (const track of availableTracks) {
    options.push({ value: `track:${track}`, label: TRACK_LABELS[track], group: 'Track' });
  }
  if (options.length === 0) return null;

  const values: FilterKey[] = [
    ...value.stances.map((stance): FilterKey => `stance:${stance}`),
    ...(value.shortlisted ? (['shortlisted'] as const) : []),
    ...(value.unread ? (['unread'] as const) : []),
    ...value.tracks.map((track): FilterKey => `track:${track}`),
  ];

  const change = (next: FilterKey[]): void => {
    onChange({
      stances: STANCES.map((stance) => stance.value).filter((stance) =>
        next.includes(`stance:${stance}`),
      ),
      tracks: availableTracks.filter((track) => next.includes(`track:${track}`)),
      shortlisted: next.includes('shortlisted'),
      unread: next.includes('unread'),
    });
  };

  return (
    <Select multiple label="Filters" options={options} values={values} onValuesChange={change} />
  );
}
