import type { Meta, StoryObj } from "@storybook/react-vite";
import { Spinner } from "./Spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  args: { size: "md" },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Medium: Story = {};

export const Small: Story = { args: { size: "sm" } };

export const CustomLabel: Story = { args: { label: "Loading rounds" } };

export const Accent: Story = {
  render: (args) => (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        color: "var(--bscf-accent-yellow)",
      }}
    >
      <Spinner {...args} size="sm" />
      <Spinner {...args} size="md" />
    </div>
  ),
};
