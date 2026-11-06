import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import {
  AssistantComposer,
  type AssistantComposerProps,
} from "./AssistantComposer";

const meta = {
  title: "Assistant/AssistantComposer",
  component: AssistantComposer,
  args: {
    value: "",
    placeholder: "Ask about Stellar Payments SDK",
    maxLength: 2000,
    onValueChange: fn(),
    onSubmit: fn(),
    onStop: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: "25rem", background: "var(--bscf-surface)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantComposer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Typing: Story = {
  args: { value: "Which tranche is the largest?" },
};

export const MultiLine: Story = {
  args: { value: "Line one\nLine two\nLine three\nLine four" },
};

export const GrowsToSixLines: Story = {
  args: {
    value: Array.from({ length: 9 }, (_, index) => `Line ${index + 1}`).join(
      "\n",
    ),
  },
};

export const Streaming: Story = { args: { value: "", isStreaming: true } };

export const NearLimit: Story = { args: { value: "x".repeat(1850) } };

export const AtLimit: Story = { args: { value: "x".repeat(2000) } };

export const Disabled: Story = { args: { isDisabled: true } };

export const Focused: Story = {
  args: { value: "Which tranche is the largest?" },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

function Interactive(args: AssistantComposerProps) {
  const [value, setValue] = useState("");
  return (
    <AssistantComposer
      {...args}
      value={value}
      onValueChange={setValue}
      onSubmit={() => setValue("")}
    />
  );
}

export const Playground: Story = {
  render: (args) => <Interactive {...args} />,
};
