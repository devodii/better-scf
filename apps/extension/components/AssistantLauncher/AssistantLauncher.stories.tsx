import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AssistantLauncher } from './AssistantLauncher';

const meta = {
  title: 'Assistant/AssistantLauncher',
  component: AssistantLauncher,
  args: { onClick: fn() },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '12rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantLauncher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Hover: Story = {
  decorators: [
    (Story) => (
      <div data-force-hover>
        <Story />
      </div>
    ),
  ],
};

export const Focus: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const UnreadDot: Story = { args: { hasUnread: true } };

export const Hidden: Story = { args: { isHidden: true } };
