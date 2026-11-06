import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Select } from './Select';

const OPTIONS = [
  { value: 'site', label: 'Site order' },
  { value: 'budgetDesc', label: 'Budget, high to low' },
  { value: 'budgetAsc', label: 'Budget, low to high' },
  { value: 'title', label: 'Title, A to Z' },
] as const;

const meta = {
  title: 'Controls/Select',
  component: Select,
  args: { label: 'Sort', value: 'site', options: OPTIONS, onChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: '18rem', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive() {
  const [value, setValue] = useState<string>('site');
  return <Select label="Sort" value={value} options={OPTIONS} onChange={setValue} />;
}

export const Default: Story = {};

export const Interacting: Story = { render: () => <Interactive /> };

export const Selected: Story = { args: { value: 'budgetDesc' } };

export const NearBottom: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '18rem', padding: '1rem', paddingTop: '22rem' }}>
        <Story />
      </div>
    ),
  ],
};
