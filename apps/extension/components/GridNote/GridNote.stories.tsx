import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { GridNote, type GridNoteProps } from "./GridNote";

const meta = {
  title: "Grid/GridNote",
  component: GridNote,
  args: { title: "Onchain Analytics for Stellar", value: "", onChange: fn() },
  decorators: [
    (Story) => (
      <div style={{ width: "20rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GridNote>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive(args: GridNoteProps) {
  const [value, setValue] = useState(args.value);
  return <GridNote {...args} value={value} onChange={setValue} />;
}

export const Empty: Story = {};

export const Interacting: Story = {
  render: (args) => <Interactive {...args} />,
};

export const Filled: Story = {
  args: { value: "Strong integration plan, budget for tranche 2 looks high." },
};

export const LongTitleAndText: Story = {
  args: {
    title:
      "A very long submission title about cross chain bridges, wallet onboarding flows and analytics",
    value:
      "The milestones are clear, the architecture document is linked, the team section lists three people while Project Stats says five, and the second tranche has no evidence lines yet.",
  },
};

export const Narrow: Story = {
  args: { value: "Revisit after the Q&A call." },
  decorators: [
    (Story) => (
      <div style={{ width: "22rem" }}>
        <Story />
      </div>
    ),
  ],
};
