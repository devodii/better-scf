import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from './Chip';

const meta = {
  title: 'UI/Chip',
  component: Chip,
  args: { children: 'SCF #46', variant: 'purple' },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Purple: Story = {};

export const PurpleBudget: Story = { args: { children: '$150.0K' } };

export const Olive: Story = { args: { variant: 'olive', children: 'Build' } };

export const Yellow: Story = { args: { variant: 'yellow', children: 'Ended' } };

export const Muted: Story = { args: { variant: 'muted', children: '12 comments · 2d ago' } };

export const LongText: Story = {
  args: { variant: 'olive', children: 'Awarded before · $120K across four earlier rounds' },
  decorators: [
    (Story) => (
      <div style={{ width: '12rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Row: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.5rem' }}>
      <Chip variant="purple">Integration</Chip>
      <Chip variant="olive">Open</Chip>
      <Chip variant="yellow">RFP</Chip>
      <Chip variant="muted">Unknown</Chip>
    </div>
  ),
};
