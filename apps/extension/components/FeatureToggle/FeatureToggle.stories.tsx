import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { FeatureToggle } from "./FeatureToggle";

const meta = {
  title: "UI/FeatureToggle",
  component: FeatureToggle,
  args: {
    label: "Review tools",
    description:
      "Mark proposals as read, shortlist the ones you like and note whether you support them. Saved only on your device.",
    checked: true,
    onChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "17rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeatureToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { defaultOpen: true } };

export const Off: Story = { args: { checked: false, defaultOpen: true } };
