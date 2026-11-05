import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddressSummary, type AddressSummaryRow } from './AddressSummary';

const ADDRESS = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

const ROWS: readonly AddressSummaryRow[] = [
  { label: 'Created', value: 'Mar 4, 2021' },
  { label: 'Last modified ledger', value: '51,204,880' },
  { label: 'XLM balance', value: '12,480.52 XLM' },
  { label: 'Trustlines', value: '7' },
  { label: 'Active', value: '3 days ago' },
];

const meta = {
  title: 'Address/AddressSummary',
  component: AddressSummary,
  args: { address: ADDRESS, state: { status: 'success', rows: ROWS } },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: '16rem',
          padding: '0.75rem',
          background: 'var(--bscf-surface)',
          color: 'var(--bscf-text)',
          fontSize: '0.875rem',
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
} satisfies Meta<typeof AddressSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = { args: { state: { status: 'loading' } } };

export const Unavailable: Story = { args: { state: { status: 'unavailable' } } };

export const LongValues: Story = {
  args: {
    state: {
      status: 'success',
      rows: [
        { label: 'Created', value: 'September 30, 2019' },
        { label: 'XLM balance', value: '1,234,567,890,123.45 XLM' },
        { label: 'Active', value: '1,204 days ago' },
      ],
    },
  },
};

export const Narrow: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', background: 'var(--bscf-surface)' }}>
        <Story />
      </div>
    ),
  ],
};
