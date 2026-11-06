import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddressPopover } from './AddressPopover';

const ACCOUNT = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
const CONTRACT = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

const meta = {
  title: 'Address/AddressPopover',
  component: AddressPopover,
  args: {
    id: 'address-popover',
    address: ACCOUNT,
    kind: 'account',
    x: 255,
    y: 66,
    isOpen: true,
    summary: {
      status: 'success',
      rows: [
        { label: 'Created', value: 'Mar 4, 2021' },
        { label: 'Last modified ledger', value: '51,204,880' },
        { label: 'XLM balance', value: '12,480.52 XLM' },
        { label: 'Trustlines', value: '7' },
        { label: 'Active', value: '3 days ago' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem', color: 'var(--bscf-text)', lineHeight: 1.6 }}>
        <p style={{ margin: 0 }}>
          Payments are routed through{' '}
          <mark
            style={{
              background: 'var(--bscf-chip-purple-bg)',
              color: 'var(--bscf-chip-purple-fg)',
              textDecoration: 'underline',
            }}
          >
            {ACCOUNT}
          </mark>{' '}
          and settled after each tranche.
        </p>
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
} satisfies Meta<typeof AddressPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const Loading: Story = { args: { summary: { status: 'loading' } } };

export const Unavailable: Story = { args: { summary: { status: 'unavailable' } } };

export const Contract: Story = { args: { address: CONTRACT, kind: 'contract' } };

export const Above: Story = { args: { placement: 'top', y: 220 } };

export const Closed: Story = { args: { isOpen: false } };

export const Narrow: Story = {
  args: { x: 330, summary: { status: 'loading' } },
  globals: { viewport: { value: 'phone', isRotated: false } },
};
