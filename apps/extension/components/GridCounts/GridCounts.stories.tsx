import type { Meta, StoryObj } from "@storybook/react-vite";
import { GridCounts } from "./GridCounts";

const meta = {
  title: "Grid/GridCounts",
  component: GridCounts,
  args: { total: 34, shown: 12 },
} satisfies Meta<typeof GridCounts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filtered: Story = {};

export const NoMatches: Story = { args: { shown: 0 } };

export const NothingHidden: Story = { args: { shown: 34 } };

export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "24.375rem" }}>
        <Story />
      </div>
    ),
  ],
};
