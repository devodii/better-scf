import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { Stance } from 'shared';
import { fn } from 'storybook/test';
import { CardCorner, type CardCornerProps } from './CardCorner';

const COVER =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'%3E%3Crect width='160' height='90' fill='%23b8a2ff'/%3E%3Ccircle cx='110' cy='30' r='24' fill='%23ffda00'/%3E%3C/svg%3E\")";

const meta = {
  title: 'Cards/CardCorner',
  component: CardCorner,
  args: {
    dot: 'unread',
    shortlisted: false,
    stance: 'none',
    isFit: false,
    onShortlistChange: fn(),
    onStanceChange: fn(),
    onFitChange: fn(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          padding: '0.5rem',
          height: '8rem',
          maxWidth: '22rem',
          background: COVER,
          backgroundSize: 'cover',
        }}
      >
        <Story />
      </div>
    ),
  ],
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
} satisfies Meta<typeof CardCorner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unread: Story = {};

export const OpenedInverted: Story = { args: { dot: 'opened' } };

export const ReadNoDot: Story = { args: { dot: null } };

export const Shortlisted: Story = { args: { shortlisted: true } };

export const Support: Story = { args: { stance: 'support' } };

export const Unsure: Story = { args: { stance: 'unsure' } };

export const Against: Story = { args: { stance: 'against' } };

export const FitOn: Story = { args: { isFit: true } };

export const AllSet: Story = {
  args: { dot: 'unread', shortlisted: true, stance: 'support', isFit: true },
};

export const DotOnly: Story = {
  render: () => <CardCorner dot="unread" />,
};

export const ReviewOnly: Story = {
  render: (args) => (
    <CardCorner
      shortlisted={args.shortlisted}
      onShortlistChange={args.onShortlistChange}
      stance={args.stance}
      onStanceChange={args.onStanceChange}
    />
  ),
};

export const Empty: Story = {
  render: () => <CardCorner />,
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

function Interactive(args: CardCornerProps) {
  const [shortlisted, setShortlisted] = useState(false);
  const [stance, setStance] = useState<Stance>('none');
  const [isFit, setIsFit] = useState(false);
  return (
    <CardCorner
      {...args}
      shortlisted={shortlisted}
      onShortlistChange={setShortlisted}
      stance={stance}
      onStanceChange={setStance}
      isFit={isFit}
      onFitChange={setIsFit}
    />
  );
}

export const Playground: Story = {
  render: (args) => <Interactive {...args} />,
};

export const Narrow: Story = {
  args: { shortlisted: true, stance: 'unsure', isFit: true },
  globals: { viewport: { value: 'phone', isRotated: false } },
};
