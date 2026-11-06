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

export const Pressed: Story = {
  decorators: [
    (Story) => (
      <div data-force-active>
        <Story />
      </div>
    ),
  ],
};

export const Unread: Story = { args: { hasUnread: true } };

export const Open: Story = { args: { isOpen: true } };

export const OpenHover: Story = { ...Hover, args: { isOpen: true } };

export const OpenFocus: Story = { ...Focus, args: { isOpen: true } };

export const Left: Story = { args: { side: 'left' } };

export const LeftHover: Story = { ...Hover, args: { side: 'left' } };

export const LeftUnread: Story = { args: { side: 'left', hasUnread: true } };

export const LeftOpen: Story = { args: { side: 'left', isOpen: true } };

export const Right: Story = { args: { side: 'right' } };

export const RightHover: Story = { ...Hover, args: { side: 'right' } };

export const RightFocus: Story = { ...Focus, args: { side: 'right' } };

export const RightUnread: Story = { args: { side: 'right', hasUnread: true } };

export const RightOpen: Story = { args: { side: 'right', isOpen: true } };
