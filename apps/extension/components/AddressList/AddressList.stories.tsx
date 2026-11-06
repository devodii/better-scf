import type { Meta, StoryObj } from '@storybook/react-vite';
import { AddressList } from './AddressList';

const ACCOUNT = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';
const CONTRACT = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE';

const meta = {
  title: 'Address/AddressList',
  component: AddressList,
  args: {
    items: [
      {
        address: ACCOUNT,
        kind: 'account',
        href: `https://stellar.expert/explorer/public/account/${ACCOUNT}`,
      },
      {
        address: CONTRACT,
        kind: 'contract',
        href: `https://stellar.expert/explorer/public/contract/${CONTRACT}`,
      },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '1.5rem', color: 'var(--bscf-text)', lineHeight: 1.6 }}>
        <button type="button">Before the list</button>
        <Story />
        <button type="button">After the list</button>
      </div>
    ),
  ],
} satisfies Meta<typeof AddressList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Hidden: Story = {};

export const Revealed: Story = { args: { isRevealed: true } };

export const Focused: Story = {
  args: { isRevealed: true },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Active: Story = {
  args: { isRevealed: true, activeAddress: ACCOUNT, describedBy: 'address-popover' },
};

export const Empty: Story = { args: { items: [], isRevealed: true } };
