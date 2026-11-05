import type { Meta, StoryObj } from '@storybook/react-vite';
import { GridCounts } from './GridCounts';

const meta = {
  title: 'Grid/GridCounts',
  component: GridCounts,
  args: {
    total: 34,
    shown: 34,
    integration: 0,
    open: 0,
    rfp: 0,
    knownTracks: 0,
    opened: 9,
  },
} satisfies Meta<typeof GridCounts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithTracks: Story = {
  args: { integration: 5, open: 3, rfp: 0, knownTracks: 8 },
};

export const Filtered: Story = { args: { shown: 12, integration: 5, open: 3, knownTracks: 8 } };

export const NoMatches: Story = { args: { shown: 0 } };

export const WithoutReviewData: Story = { args: { opened: null } };

export const Single: Story = { args: { total: 1, shown: 1, opened: 0 } };

export const Narrow: Story = {
  args: { shown: 12, integration: 5, open: 3, rfp: 1, knownTracks: 9 },
  decorators: [
    (Story) => (
      <div style={{ width: '24.375rem' }}>
        <Story />
      </div>
    ),
  ],
};
