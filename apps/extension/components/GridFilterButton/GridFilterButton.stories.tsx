import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { GridFilterButton } from './GridFilterButton';

const meta = {
  title: 'Grid/GridFilterButton',
  component: GridFilterButton,
  args: { label: 'Shortlisted', isPressed: false, onPressedChange: fn() },
} satisfies Meta<typeof GridFilterButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pressed: Story = { args: { isPressed: true } };

export const Disabled: Story = { args: { disabled: true } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus style={{ padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const LongLabel: Story = {
  args: { label: 'Submissions I have marked as unsure and still need to revisit', isPressed: true },
  decorators: [
    (Story) => (
      <div style={{ width: '12rem' }}>
        <Story />
      </div>
    ),
  ],
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
