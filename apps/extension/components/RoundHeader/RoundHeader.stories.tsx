import type { Meta, StoryObj } from '@storybook/react-vite';
import { RoundHeader } from './RoundHeader';

const meta = {
  title: 'Round/RoundHeader',
  component: RoundHeader,
  args: {
    countdown: { phase: 'Community Vote', verb: 'starts', when: 'in 18 days' },
    submissions: 34,
    parsed: 31,
    totalRequested: 2_412_000,
    medianRequested: 72_500,
    tracks: { integration: 5, open: 3, rfp: 1 },
  },
  decorators: [
    (Story) => (
      <div style={{ minHeight: '14rem', paddingTop: '3.5rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RoundHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoCountdown: Story = { args: { countdown: null } };

export const NoBudgetsParsed: Story = {
  args: { parsed: 0, totalRequested: null, medianRequested: null },
};

export const NoTracksKnown: Story = { args: { tracks: null } };

export const Empty: Story = {
  args: {
    countdown: null,
    submissions: 0,
    parsed: 0,
    totalRequested: null,
    medianRequested: null,
    tracks: null,
  },
};

export const LongText: Story = {
  args: {
    countdown: {
      phase: 'Notification and Award Distribution',
      verb: 'starts',
      when: 'in 120 days',
    },
    submissions: 5196,
    parsed: 5001,
    totalRequested: 123_456_789,
    medianRequested: 1_000_000,
    tracks: { integration: 1204, open: 3880, rfp: 112 },
  },
};

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
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

export const Medium: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: '48rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const WithSiteCounterNote: Story = { args: { siteTotal: 99 } };
