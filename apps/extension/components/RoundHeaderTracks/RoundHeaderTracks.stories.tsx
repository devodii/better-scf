import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundHeaderTracks } from './RoundHeaderTracks';

const meta = {
  title: 'Round/RoundHeaderTracks',
  component: RoundHeaderTracks,
  args: { counts: { integration: 5, open: 3, rfp: 1 }, total: 34 },
} satisfies Meta<typeof RoundHeaderTracks>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleTrack: Story = { args: { counts: { integration: 0, open: 8, rfp: 0 } } };

export const NoneKnown: Story = { args: { counts: { integration: 0, open: 0, rfp: 0 } } };

export const LargeCounts: Story = {
  args: { counts: { integration: 1204, open: 3880, rfp: 112 }, total: 5196 },
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '24.375rem' }}>
        <Story />
      </div>
    ),
  ],
};
