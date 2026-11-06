import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import {
  EMPTY_GRID_FILTERS,
  GridFilters,
  type GridFiltersProps,
} from "./GridFilters";

const meta = {
  title: "Grid/GridFilters",
  component: GridFilters,
  args: {
    value: EMPTY_GRID_FILTERS,
    onChange: fn(),
    availableTracks: [],
    hasReviews: true,
  },
} satisfies Meta<typeof GridFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive(args: GridFiltersProps) {
  const [value, setValue] = useState(args.value);
  return <GridFilters {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {};

export const Interacting: Story = {
  args: { availableTracks: ["integration", "open"] },
  render: (args) => <Interactive {...args} />,
};

export const WithActiveFilters: Story = {
  args: {
    value: {
      stances: ["support", "unsure"],
      tracks: ["open"],
      shortlisted: true,
      unread: false,
    },
    availableTracks: ["integration", "open", "rfp"],
  },
};

export const TracksOnly: Story = {
  args: { hasReviews: false, availableTracks: ["integration", "open"] },
};

export const Empty: Story = {
  args: { hasReviews: false },
  render: (args) => (
    <div>
      <GridFilters {...args} />
      <p>Nothing renders when neither review data nor known tracks exist.</p>
    </div>
  ),
};

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
  args: { availableTracks: ["integration", "open", "rfp"] },
  decorators: [
    (Story) => (
      <div style={{ width: "24.375rem" }}>
        <Story />
      </div>
    ),
  ],
};
