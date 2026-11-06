import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { EntryChoice } from './EntryChoice';

const meta = {
  title: 'Landing/EntryChoice',
  component: EntryChoice,
  args: { signedIn: false, onLogin: fn(), onApply: fn() },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem', background: 'var(--bscf-bg)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EntryChoice>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedOut: Story = {};

export const SignedIn: Story = { args: { signedIn: true } };

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '22rem', padding: '1rem', background: 'var(--bscf-bg)' }}>
        <Story />
      </div>
    ),
  ],
};

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus style={{ padding: '1.5rem', background: 'var(--bscf-bg)' }}>
        <Story />
      </div>
    ),
  ],
};
