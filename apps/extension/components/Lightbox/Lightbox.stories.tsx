import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Lightbox } from './Lightbox';

const MOCKUP =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1672 941'%3E%3Crect width='1672' height='941' fill='%23282630'/%3E%3Crect x='60' y='60' width='1552' height='80' rx='12' fill='%23b8a2ff'/%3E%3Ctext x='90' y='112' font-family='sans-serif' font-size='36' fill='%230f0f0f'%3EDisbursement dashboard%3C/text%3E%3Crect x='60' y='180' width='740' height='700' rx='12' fill='%230f0f0f'/%3E%3Crect x='840' y='180' width='772' height='700' rx='12' fill='%230f0f0f'/%3E%3Ctext x='100' y='260' font-family='sans-serif' font-size='28' fill='%23ffffff'%3ETranche 1: wallet onboarding%3C/text%3E%3Ctext x='880' y='260' font-family='sans-serif' font-size='28' fill='%23ffda00'%3ETranche 2: payout API%3C/text%3E%3C/svg%3E";

const PHONE = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
} as const;

const meta = {
  title: 'Lightbox/Lightbox',
  component: Lightbox,
  args: {
    src: MOCKUP,
    label: 'Cover image of Disbursement Platform integration',
    caption: 'Disbursement Platform integration',
    onClose: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = { args: { src: 'http://192.0.2.1/cover.png' } };

export const Failed: Story = { args: { src: 'data:image/png;base64,broken' } };

export const LongCaption: Story = {
  args: {
    caption:
      'A very long submission title about cross chain bridges, wallet onboarding flows, payout rails and analytics for the whole ecosystem',
  },
};

export const NoCaption: Story = { args: { caption: undefined } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = PHONE;

function WithOpener(args: Parameters<typeof Lightbox>[0]) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div style={{ padding: '1rem' }}>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open cover
      </button>
      {isOpen && <Lightbox {...args} onClose={() => setIsOpen(false)} />}
    </div>
  );
}

export const RestoresFocusToOpener: Story = { render: (args) => <WithOpener {...args} /> };
