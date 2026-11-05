import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from '../Avatar';
import { Chip } from '../Chip';
import { IconButton } from '../IconButton';
import { Tooltip } from './Tooltip';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  args: {
    content: 'From the on-chain metric section',
    children: <Chip variant="purple">Integration</Chip>,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '3.5rem 8rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { isOpen: true } };

export const Bottom: Story = { args: { isOpen: true, placement: 'bottom' } };

export const LongContent: Story = {
  args: {
    isOpen: true,
    content:
      'Totals use only submissions with a parsed budget: 48 of 52 parsed, the rest state no amount.',
    children: <Chip variant="muted">48 of 52</Chip>,
  },
};

export const OnAvatar: Story = {
  args: {
    isOpen: true,
    content: 'Ada Lovelace · Lead engineer',
    children: <Avatar name="Ada Lovelace" href="https://github.com/octocat" />,
  },
};

export const FocusedTrigger: Story = {
  args: {
    isOpen: true,
    placement: 'bottom',
    content: 'Shortlist',
    children: (
      <IconButton label="Shortlist" variant="surface">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
        </svg>
      </IconButton>
    ),
  },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const OnIconButton: Story = {
  args: {
    isOpen: true,
    placement: 'bottom',
    content: 'Shortlist',
    children: (
      <IconButton label="Shortlist" variant="surface">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
        </svg>
      </IconButton>
    ),
  },
};
