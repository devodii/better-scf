import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchResultCard, type SearchResultMatch } from './SearchResultCard';

const IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23b8a2ff'/><circle cx='4' cy='4' r='2' fill='%23ffda00'/></svg>";

const match: SearchResultMatch = {
  project: {
    slug: 'soroban-toolkit',
    title: 'Soroban Developer Toolkit',
    category: 'Developer Tooling',
    thumbnail: IMAGE,
    lastAwardedRound: 41,
  },
  titleRanges: [{ start: 0, end: 7 }],
  categoryRanges: [{ start: 0, end: 9 }],
};

const meta = {
  title: 'Search/SearchResultCard',
  component: SearchResultCard,
  args: { match },
  decorators: [
    (Story) => (
      <div style={{ width: '26rem', padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchResultCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NeverAwarded: Story = {
  args: { match: { ...match, project: { ...match.project, lastAwardedRound: null } } },
};

export const NoCategory: Story = {
  args: {
    match: { ...match, project: { ...match.project, category: '' }, categoryRanges: [] },
  },
};

export const NoThumbnail: Story = {
  args: { match: { ...match, project: { ...match.project, thumbnail: null } } },
};

export const ThumbnailFailed: Story = {
  args: {
    match: {
      ...match,
      project: { ...match.project, thumbnail: 'https://invalid.invalid/thumbnail.png' },
    },
  },
};

export const LongTitle: Story = {
  args: {
    match: {
      ...match,
      project: {
        ...match.project,
        title:
          'Decentralised Cross-Chain Liquidity Aggregation and Settlement Infrastructure for Stellar Anchors and Wallets',
      },
      titleRanges: [{ start: 0, end: 13 }],
    },
  },
};

export const Inactive: Story = { args: { isActive: false } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: {
    match: {
      ...match,
      project: {
        ...match.project,
        title: 'Soroban Developer Toolkit for Wallet and Anchor Integrations',
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '22.5rem' }}>
        <Story />
      </div>
    ),
  ],
};
