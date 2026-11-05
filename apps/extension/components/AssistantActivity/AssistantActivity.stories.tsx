import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssistantActivity } from './AssistantActivity';

const meta = {
  title: 'Assistant/AssistantActivity',
  component: AssistantActivity,
  args: { text: 'Looking up your tier requirements', status: 'running' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantActivity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {};

export const Navigating: Story = { args: { text: 'Taking you to Voting History' } };

export const Done: Story = { args: { status: 'done' } };

export const Failed: Story = {
  args: { status: 'error', detail: 'The tool timed out after 10 seconds.' },
};

export const LongText: Story = {
  args: {
    text: 'Searching projects for decentralised exchange aggregators with on-chain liquidity routing and wallet integrations',
    status: 'done',
  },
};
