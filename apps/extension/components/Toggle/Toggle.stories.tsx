import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Toggle } from './Toggle';

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  args: { label: 'Track chips on cards', checked: false, onChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: '20rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};

export const On: Story = { args: { checked: true } };

export const LongLabel: Story = {
  args: {
    checked: true,
    label: 'Show opened instead of unread on every card of the round grid and carousel',
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const DisabledOn: Story = { args: { disabled: true, checked: true } };
