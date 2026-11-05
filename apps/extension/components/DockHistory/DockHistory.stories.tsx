import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DockHistory } from './DockHistory';

const ITEMS = [
  { id: '1', text: 'Summarize in 5 bullets', meta: 'This submission · 5 Nov 14:02' },
  {
    id: '2',
    text: 'Who is on the team and what does each person own?',
    meta: 'This submission · 5 Nov 13:48',
  },
  { id: '3', text: 'Take me to the latest round', meta: 'Site · 4 Nov 09:15' },
];

const meta = {
  title: 'Dock/DockHistory',
  component: DockHistory,
  args: { items: ITEMS, onSelect: fn(), onClear: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '40rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DockHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };

export const LongText: Story = {
  args: {
    items: [
      {
        id: 'long',
        text: 'Compare every tranche in this submission with the deliverables listed in the architecture section and tell me where the amounts do not add up, quoting the exact lines you rely on',
        meta: 'This submission · 5 Nov 14:02',
      },
      ...ITEMS,
    ],
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
  globals: { viewport: { value: 'phone', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
};
