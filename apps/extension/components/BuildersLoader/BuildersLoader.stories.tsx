import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { BuildersLoader } from "./BuildersLoader";

const meta = {
  title: "Cards/BuildersLoader",
  component: BuildersLoader,
  args: { status: "idle", done: 0, total: 52, onStart: fn(), onCancel: fn() },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: "40rem",
          padding: "1.5rem",
          background: "var(--bscf-bg)",
        }}
      >
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
} satisfies Meta<typeof BuildersLoader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {};

export const Running: Story = { args: { status: "running", done: 12 } };

export const Done: Story = { args: { status: "done", done: 52 } };

export const Cancelled: Story = { args: { status: "cancelled", done: 12 } };

export const Stopped: Story = {
  args: {
    status: "stopped",
    done: 7,
    message: "Stopped: the site asked us to slow down (429).",
  },
};

export const NothingToLoad: Story = { args: { total: 0 } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: { status: "running", done: 12 },
  globals: { viewport: { value: "phone", isRotated: false } },
};
