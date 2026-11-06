import type { Meta, StoryObj } from "@storybook/react-vite";
import { RoundStatTag } from "./RoundStatTag";

const meta = {
  title: "Round/RoundStatTag",
  component: RoundStatTag,
  args: {
    label: "40 awarded",
    hint: "40 submissions awarded · $4.0M awarded · $3.9M paid so far",
    variant: "olive",
  },
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
} satisfies Meta<typeof RoundStatTag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const HintOpen: Story = { args: { isHintOpen: true } };

export const Money: Story = {
  args: { label: "$4.0M awarded", variant: "purple", isHintOpen: true },
};

export const Focused: Story = {
  args: { isHintOpen: true },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const LongText: Story = {
  args: {
    label: "1,204,880 awarded across every track and tranche",
    hint: "1,204,880 submissions awarded · $123.5M awarded · $98.1M paid so far, with the rest still to be released across later tranches",
    isHintOpen: true,
  },
  decorators: [
    (Story) => (
      <div style={{ width: "12rem", paddingTop: "8rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: { isHintOpen: true },
  globals: { viewport: { value: "phone", isRotated: false } },
};
