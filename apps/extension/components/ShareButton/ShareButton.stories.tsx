import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { ShareButton } from './ShareButton';

const meta = {
  title: 'Submission/ShareButton',
  component: ShareButton,
  args: { status: 'idle', onShare: fn() },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem', background: 'var(--bscf-bg)' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ShareButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Copied: Story = { args: { status: 'copied' } };

export const Failed: Story = { args: { status: 'failed' } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus style={{ padding: '1.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Phone: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
};
