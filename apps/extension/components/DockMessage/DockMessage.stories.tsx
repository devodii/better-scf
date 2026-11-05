import type { Meta, StoryObj } from '@storybook/react-vite';
import { DockMessage } from './DockMessage';

const meta = {
  title: 'Dock/DockMessage',
  component: DockMessage,
  args: { role: 'assistant', text: 'The project requests **$150,000** across three tranches.' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '32rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DockMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Assistant: Story = {};

export const User: Story = {
  args: { role: 'user', text: 'List every deliverable with its tranche and amount' },
};

export const Streaming: Story = {
  args: { text: 'The team has three members:\n\n- Ada, lead engi', isStreaming: true },
};

export const Thinking: Story = { args: { text: '', isStreaming: true } };

export const ToolActivity: Story = {
  args: { text: '', activity: 'Looking up your tier requirements...', isStreaming: true },
};

export const Navigating: Story = {
  args: {
    text: 'Sure, opening it for you.',
    activity: 'Taking you to Voting History...',
    isStreaming: true,
  },
};

export const LongUser: Story = {
  args: {
    role: 'user',
    text: 'Please compare every tranche in this submission with the deliverables listed in the architecture section and tell me where the amounts do not add up, quoting the exact lines you rely on. GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  },
};
