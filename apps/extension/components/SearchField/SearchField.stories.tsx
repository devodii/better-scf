import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { SearchField, type SearchFieldProps } from "./SearchField";

const meta = {
  title: "Search/SearchField",
  component: SearchField,
  args: { value: "", onValueChange: fn(), onMoveDown: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: "24rem", padding: "0.5rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive(args: SearchFieldProps) {
  const [value, setValue] = useState(args.value);
  return <SearchField {...args} value={value} onValueChange={setValue} />;
}

export const Empty: Story = { render: (args) => <Interactive {...args} /> };

export const Filled: Story = {
  args: { value: "soroban" },
  render: (args) => <Interactive {...args} />,
};

export const Loading: Story = {
  args: { value: "soroban", isLoading: true },
  render: (args) => <Interactive {...args} />,
};

export const LoadingEmpty: Story = { args: { isLoading: true } };

export const LongValue: Story = {
  args: {
    value:
      "cross chain bridges wallet onboarding flows and on-chain analytics for grant reviewers",
    isLoading: true,
  },
};

export const Focused: Story = {
  args: { value: "soroban" },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: { value: "soroban", isLoading: true },
  decorators: [
    (Story) => (
      <div style={{ width: "22.5rem" }}>
        <Story />
      </div>
    ),
  ],
};
