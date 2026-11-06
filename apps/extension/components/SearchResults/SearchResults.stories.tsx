import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import type { SearchResultMatch } from '../SearchResultCard';
import { SearchResults } from './SearchResults';

const IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 200'><rect width='500' height='200' fill='%23b8a2ff'/><circle cx='250' cy='100' r='60' fill='%23ffda00'/></svg>";

const base: SearchResultMatch[] = [
  {
    project: {
      slug: 'soroban-toolkit',
      title: 'Soroban Developer Toolkit',
      category: 'Developer Tooling',
      thumbnail: IMAGE,
      lastAwardedRound: 41,
      team: 'Token Terminal',
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
      team: 'Block Explorer Labs',
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
  {
    project: {
      slug: 'soroban-liquidity',
      title:
        'Decentralised Cross-Chain Liquidity Aggregation and Settlement Infrastructure for Stellar Anchors and Wallets',
      category: 'Infrastructure and Services',
      thumbnail: IMAGE,
      lastAwardedRound: 40,
      team: 'Anchor Collective',
    },
    titleRanges: [],
    categoryRanges: [],
  },
  {
    project: {
      slug: 'soroban-indexer',
      title: 'Soroban Event Indexer',
      category: 'Developer Tooling',
      thumbnail: null,
      lastAwardedRound: null,
    },
    titleRanges: [{ start: 0, end: 7 }],
    categoryRanges: [],
  },
];

const unique = (list: SearchResultMatch[]): SearchResultMatch[] =>
  list.map((match, index) => ({
    ...match,
    project: { ...match.project, slug: `${match.project.slug}-${index}` },
  }));

const matches = unique(base);
const many = unique([...base, ...base, ...base].slice(0, 14));

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
      <div style={{ width: '58rem', maxWidth: '100%', padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Results: Story = {};

export const ManyResults: Story = { args: { matches: many, hasMore: true } };

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

export const Grid1280: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ boxSizing: 'border-box', display: 'flex', width: '1280px' }}>
        <div style={{ flex: 'none', width: '18rem', background: 'var(--bscf-surface)' }} />
        <div style={{ flex: 1, minWidth: 0, padding: '2rem' }}>
          <Story />
        </div>
      </div>
    ),
  ],
};

export const Grid960: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ boxSizing: 'border-box', width: '960px', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Grid390: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ boxSizing: 'border-box', width: '390px', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const EmptyNarrow: Story = {
  args: { matches: [], query: 'zzzz' },
  decorators: [
    (Story) => (
      <div style={{ boxSizing: 'border-box', width: '390px', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const ErrorNarrow: Story = {
  args: { status: 'error', matches: [] },
  decorators: [
    (Story) => (
      <div style={{ boxSizing: 'border-box', width: '390px', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
};
