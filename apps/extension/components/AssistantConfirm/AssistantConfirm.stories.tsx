import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AssistantConfirm } from './AssistantConfirm';

const meta = {
  title: 'Assistant/AssistantConfirm',
  component: AssistantConfirm,
  args: {
    text: 'Take you to Voting History',
    status: 'pending',
    onAllow: fn(),
    onDeny: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantConfirm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {};

export const PendingPersonalData: Story = {
  args: { text: 'Read your account details and send them to the assistant' },
};

export const Allowed: Story = { args: { status: 'allowed' } };

export const Denied: Story = { args: { status: 'denied' } };

export const Expired: Story = { args: { status: 'expired' } };

export const LongText: Story = {
  args: {
    text: 'Read your voting power for decentralised exchange aggregators with on-chain liquidity routing and wallet integrations and send it to the assistant',
  },
};
