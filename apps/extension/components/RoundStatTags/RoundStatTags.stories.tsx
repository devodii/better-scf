import type { Meta, StoryObj } from "@storybook/react-vite";
import { RoundStatTags } from "./RoundStatTags";

const meta = {
  title: "Round/RoundStatTags",
  component: RoundStatTags,
  args: { awarded: 40, awardedUsd: 4_043_616, paidUsd: 3_912_000 },
  decorators: [
    (Story) => (
      <div style={{ padding: "5rem 1.5rem 1rem" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    viewport: {
      options: {
        phone: {
          name: "Phone 390",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
      },
    },
  },
} satisfies Meta<typeof RoundStatTags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HintOpen: Story = { args: { isHintOpen: true } };

export const SingleAward: Story = {
  args: { awarded: 1, awardedUsd: 25_000, paidUsd: 0 },
};

export const CountOnly: Story = {
  args: { awardedUsd: 0, paidUsd: null, isHintOpen: true },
};

export const AmountOnly: Story = {
  args: {
    awarded: null,
    awardedUsd: 850_000,
    paidUsd: 500_000,
    isHintOpen: true,
  },
};

export const Empty: Story = {
  args: { awarded: 0, awardedUsd: null, paidUsd: 120_000 },
};

export const LargeValues: Story = {
  args: {
    awarded: 1_204_880,
    awardedUsd: 123_456_789,
    paidUsd: 98_100_000,
    isHintOpen: true,
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
  args: { isHintOpen: true },
  globals: { viewport: { value: "phone", isRotated: false } },
};
