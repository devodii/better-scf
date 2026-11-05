import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { SearchResultMatch } from '../SearchResultCard';
import { SearchResults } from './SearchResults';

const IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23b8a2ff'/><circle cx='4' cy='4' r='2' fill='%23ffda00'/></svg>";

const matches: SearchResultMatch[] = [
  {
    project: {
      slug: 'soroban-toolkit',
      title: 'Soroban Developer Toolkit',
      category: 'Developer Tooling',
      thumbnail: IMAGE,
      lastAwardedRound: 41,
    },
    titleRanges: [{ start: 0, end: 7 }],
    categoryRanges: [],
  },
  {
    project: {
      slug: 'soroban-explorer',
      title: 'Soroban Contract Explorer',
      category: 'Infrastructure and Services',
      thumbnail: null,
      lastAwardedRound: 38,
    },
    titleRanges: [{ start: 0, end: 7 }],
    categoryRanges: [],
  },
  {
    project: {
      slug: 'stellar-wallet-kit',
      title: 'Wallet Kit for Soroban dapps',
      category: 'End-User Application',
      thumbnail: 'https://invalid.invalid/thumbnail.png',
      lastAwardedRound: null,
    },
    titleRanges: [{ start: 15, end: 22 }],
    categoryRanges: [],
  },
  {
    project: {
      slug: 'soroban-academy',
      title: 'Soroban Academy',
      category: 'Education and Community',
      thumbnail: IMAGE,
      lastAwardedRound: 44,
    },
    titleRanges: [{ start: 0, end: 7 }],
    categoryRanges: [],
  },
];

const meta = {
  title: 'Search/SearchResults',
  component: SearchResults,
  args: {
    status: 'ready',
    matches,
    query: 'soroban',
    onRetry: fn(),
    onEscape: fn(),
    onLeaveUp: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: '56rem', maxWidth: '100%', padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {};

export const SingleResult: Story = { args: { matches: matches.slice(0, 1) } };

export const CappedResults: Story = { args: { hasMore: true } };

export const Loading: Story = { args: { status: 'loading', matches: [] } };

export const Empty: Story = { args: { matches: [], query: 'zzzz' } };

export const EmptyLongQuery: Story = {
  args: {
    matches: [],
    query: 'decentralised cross chain liquidity aggregation settlement infrastructure',
  },
};

export const ErrorState: Story = { args: { status: 'error', matches: [] } };

export const FocusedCard: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Medium: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '44rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '22.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const NarrowError: Story = {
  args: { status: 'error', matches: [] },
  decorators: [
    (Story) => (
      <div style={{ width: '22.5rem' }}>
        <Story />
      </div>
    ),
  ],
};
