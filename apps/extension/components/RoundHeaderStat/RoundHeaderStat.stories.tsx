import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundHeaderStat } from './RoundHeaderStat';

const meta = {
  title: 'Round/RoundHeaderStat',
  component: RoundHeaderStat,
  args: { label: 'Submissions', value: '34' },
  decorators: [
    (Story) => (
      <dl style={{ margin: 0, padding: '3.5rem 0 1rem' }}>
        <Story />
      </dl>
    ),
  ],
} satisfies Meta<typeof RoundHeaderStat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  args: { label: 'Total requested', value: '$2.4M', hint: '30 of 34 submissions state a budget' },
};

export const Unavailable: Story = {
  args: { label: 'Median requested', value: 'n/a', hint: '0 of 34 submissions state a budget' },
};

export const LongValue: Story = {
  args: {
    label: 'Total requested including every optional tranche',
    value: '$123,456,789,012,345',
    hint: '30 of 34 submissions state a budget',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '12rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Focused: Story = {
  args: { label: 'Total requested', value: '$2.4M', hint: '30 of 34 submissions state a budget' },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};
