import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { TrancheTable } from './TrancheTable';

const meta = {
  title: 'Submission/TrancheTable',
  component: TrancheTable,
  args: {
    rows: [
      { id: '0', title: 'Tranche 1 (Deliverable Roadmap) - MVP', total: '$7,800' },
      { id: '1', title: 'Tranche 2 (Deliverable Roadmap) - Testnet', total: '$7,800' },
      { id: '2', title: 'Tranche 3 (Deliverable Roadmap) - Mainnet', total: '$10,400' },
    ],
  },
} satisfies Meta<typeof TrancheTable>;

export default meta;
type Story = StoryObj<typeof meta>;

const inWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

export const Default: Story = {};

export const SingleTranche: Story = {
  args: { rows: [{ id: '0', title: 'Tranche 1 (Deliverable Roadmap) - MVP', total: '$12,500' }] },
};

export const MissingTotal: Story = {
  args: {
    rows: [
      { id: '0', title: 'Tranche 1 (Deliverable Roadmap) - MVP', total: '$7,800' },
      { id: '1', title: 'Tranche 2 (Deliverable Roadmap) - Testnet', total: null },
      { id: '2', title: 'Tranche 3 (Deliverable Roadmap) - Mainnet', total: '$10,400.50' },
    ],
  },
};

export const Empty: Story = { args: { rows: [] } };

export const LongTitles: Story = {
  args: {
    rows: [
      {
        id: '0',
        title:
          'Tranche #1: Stellar data audit and tokenized asset registry with public dashboards and reporting',
        total: '$118,000',
      },
      {
        id: '1',
        title: 'Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious',
        total: null,
      },
    ],
  },
  decorators: [inWidth('22rem')],
};

export const Narrow: Story = { decorators: [inWidth('24.375rem')] };

export const Wide: Story = { decorators: [inWidth('48rem')] };
