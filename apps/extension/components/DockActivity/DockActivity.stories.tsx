import type { Meta, StoryObj } from '@storybook/react-vite';
import { DockActivity } from './DockActivity';

const meta = {
  title: 'Dock/DockActivity',
  component: DockActivity,
  args: { text: 'Looking up your tier requirements...' },
} satisfies Meta<typeof DockActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Lookup: Story = {};

export const Navigate: Story = { args: { text: 'Taking you to Voting History...' } };

export const Thinking: Story = { args: { text: 'Thinking...' } };

export const LongText: Story = {
  args: {
    text: 'Searching projects for decentralised exchange aggregators with on-chain liquidity routing and wallet integrations...',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '14rem' }}>
        <Story />
      </div>
    ),
  ],
};
