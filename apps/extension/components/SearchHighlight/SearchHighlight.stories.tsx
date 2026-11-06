import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchHighlight } from "./SearchHighlight";

const meta = {
  title: "Search/SearchHighlight",
  component: SearchHighlight,
  args: { text: "Soroban Developer Toolkit", ranges: [{ start: 0, end: 7 }] },
  decorators: [
    (Story) => (
      <p
        style={{
          margin: 0,
          padding: "0.5rem",
          color: "var(--bscf-text)",
          fontSize: "1.125rem",
        }}
      >
        <Story />
      </p>
    ),
  ],
} satisfies Meta<typeof SearchHighlight>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoMatch: Story = { args: { ranges: [] } };

export const MultipleRanges: Story = {
  args: {
    ranges: [
      { start: 0, end: 7 },
      { start: 18, end: 25 },
    ],
  },
};

export const WholeText: Story = {
  args: { text: "Soroban", ranges: [{ start: 0, end: 7 }] },
};

export const OutOfRange: Story = {
  args: {
    text: "Soroban",
    ranges: [
      { start: 4, end: 40 },
      { start: 2, end: 5 },
    ],
  },
};
