import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { GridSort, type GridSortProps } from "./GridSort";

const meta = {
  title: "Grid/GridSort",
  component: GridSort,
  args: { value: "site", onChange: fn(), hasReviews: true },
  decorators: [
    (Story) => (
      <div style={{ width: "18rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GridSort>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive(args: GridSortProps) {
  const [value, setValue] = useState(args.value);
  return <GridSort {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {};

export const Interacting: Story = {
  render: (args) => <Interactive {...args} />,
};

export const BudgetDescending: Story = { args: { value: "budgetDesc" } };

export const WithoutReviewData: Story = { args: { hasReviews: false } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus style={{ padding: "0.5rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "24.375rem" }}>
        <Story />
      </div>
    ),
  ],
};
