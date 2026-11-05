import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DockPrompts } from './DockPrompts';

const SUBMISSION_PROMPTS = [
  { id: 'summarize-5', text: 'Summarize in 5 bullets' },
  { id: 'deliverables-tranches', text: 'List every deliverable with its tranche and amount' },
  {
    id: 'onchain-metric',
    text: 'What exactly is the on-chain metric and how is it measured?',
  },
  { id: 'team-roles', text: 'Who is on the team and what does each person own?' },
  { id: 'traction-evidence', text: 'What evidence of traction is provided?' },
  { id: 'explain-newcomer', text: 'Explain this for someone new to Stellar' },
];

const meta = {
  title: 'Dock/DockPrompts',
  component: DockPrompts,
  args: { prompts: SUBMISSION_PROMPTS, onSelect: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '40rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DockPrompts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { isDisabled: true } };

export const Single: Story = { args: { prompts: SUBMISSION_PROMPTS.slice(0, 1) } };

export const Empty: Story = { args: { prompts: [] } };

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
