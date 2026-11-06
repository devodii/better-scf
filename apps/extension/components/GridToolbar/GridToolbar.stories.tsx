import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { EMPTY_GRID_FILTERS } from '../GridFilters';
import { GridToolbar, type GridToolbarProps } from './GridToolbar';

const meta = {
  title: 'Grid/GridToolbar',
  component: GridToolbar,
  args: {
    query: '',
    onQueryChange: fn(),
    filters: EMPTY_GRID_FILTERS,
    onFiltersChange: fn(),
    sort: 'site',
    onSortChange: fn(),
    availableTracks: [],
    hasReviews: true,
    counts: { total: 34, shown: 34 },
    isFiltered: false,
    onReset: fn(),
    note: null,
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '22rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GridToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive(args: GridToolbarProps) {
  const [query, setQuery] = useState(args.query);
  const [filters, setFilters] = useState(args.filters);
  const [sort, setSort] = useState(args.sort);
  const [isNoteOpen, setNoteOpen] = useState(args.note?.isOpen ?? false);
  const [noteValue, setNoteValue] = useState(args.note?.value ?? '');
  const isFiltered =
    query !== '' ||
    filters.stances.length > 0 ||
    filters.tracks.length > 0 ||
    filters.shortlisted ||
    filters.unread;
  return (
    <GridToolbar
      {...args}
      query={query}
      onQueryChange={setQuery}
      filters={filters}
      onFiltersChange={setFilters}
      sort={sort}
      onSortChange={setSort}
      isFiltered={isFiltered}
      onReset={() => {
        setQuery('');
        setFilters(EMPTY_GRID_FILTERS);
      }}
      note={
        args.note && {
          ...args.note,
          isOpen: isNoteOpen,
          onOpenChange: setNoteOpen,
          value: noteValue,
          onChange: setNoteValue,
        }
      }
    />
  );
}

const noteArgs = {
  title: 'Onchain Analytics for Stellar',
  value: '',
  isOpen: false,
  onOpenChange: fn(),
  onChange: fn(),
};

export const Default: Story = { render: (args) => <Interactive {...args} /> };

export const WithKnownTracks: Story = {
  args: {
    availableTracks: ['integration', 'open'],
    counts: { total: 34, shown: 34 },
  },
  render: (args) => <Interactive {...args} />,
};

export const Filtered: Story = {
  args: {
    query: 'stellar',
    filters: { stances: ['support'], tracks: [], shortlisted: true, unread: false },
    isFiltered: true,
    counts: { total: 34, shown: 6 },
  },
};

export const NoMatches: Story = {
  args: {
    query: 'zzz',
    isFiltered: true,
    counts: { total: 34, shown: 0 },
  },
};

export const WithoutReviewData: Story = {
  args: {
    hasReviews: false,
    counts: { total: 34, shown: 34 },
  },
};

export const WithNoteButton: Story = {
  args: { note: noteArgs },
  render: (args) => <Interactive {...args} />,
};

export const NoteOpen: Story = {
  args: {
    note: {
      ...noteArgs,
      isOpen: true,
      value: 'Strong integration plan, budget for tranche 2 looks high.',
    },
  },
  render: (args) => <Interactive {...args} />,
  decorators: [
    (Story) => (
      <div style={{ minHeight: '26rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Focused: Story = {
  args: { note: noteArgs },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: { note: noteArgs },
  render: (args) => <Interactive {...args} />,
  decorators: [
    (Story) => (
      <div style={{ width: '24.375rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Medium: Story = {
  args: { availableTracks: ['integration', 'open'], note: noteArgs },
  render: (args) => <Interactive {...args} />,
  decorators: [
    (Story) => (
      <div style={{ width: '48rem' }}>
        <Story />
      </div>
    ),
  ],
};
