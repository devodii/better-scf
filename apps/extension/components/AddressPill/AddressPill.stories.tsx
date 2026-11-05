import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddressPill } from './AddressPill';

const ACCOUNT = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
const CONTRACT = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

const meta = {
  title: 'Address/AddressPill',
  component: AddressPill,
  args: {
    address: ACCOUNT,
    kind: 'account',
    href: `https://stellar.expert/explorer/public/account/${ACCOUNT}`,
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem 1.5rem 14rem', color: 'var(--bscf-text)' }}>
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
} satisfies Meta<typeof AddressPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Account: Story = {};

export const AccountLoading: Story = { args: { isOpen: true, summary: { status: 'loading' } } };

export const AccountLoaded: Story = {
  args: {
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
};

export const AccountUnavailable: Story = {
  args: { isOpen: true, summary: { status: 'unavailable' } },
};

export const Contract: Story = {
  args: {
    address: CONTRACT,
    kind: 'contract',
    href: `https://stellar.expert/explorer/public/contract/${CONTRACT}`,
    isOpen: true,
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

export const InText: Story = {
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '24rem', lineHeight: 1.6 }}>
        Payments are routed through <Story /> and settled on the contract after each tranche, so
        reviewers can follow every transfer on chain.
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: { isOpen: true, summary: { status: 'loading' } },
  globals: { viewport: { value: 'phone', isRotated: false } },
};
