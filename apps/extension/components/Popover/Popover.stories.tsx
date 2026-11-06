import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { Chip } from "../Chip";
import { IconButton } from "../IconButton";
import { Popover } from "./Popover";

const Note = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M4 4h16v12H8l-4 4zm3 4v2h10V8zm0 4v2h7v-2z" />
  </svg>
);

const meta = {
  title: "UI/Popover",
  component: Popover,
  args: {
    label: "Note",
    trigger: (
      <IconButton label="Note" variant="surface">
        <Note />
      </IconButton>
    ),
    children: "Strong integration plan, budget for tranche 2 looks high.",
    isOpen: false,
    onOpenChange: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ padding: "7rem 12rem 10rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = { args: { isOpen: true } };

export const FocusedTrigger: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const Narrow390: Story = {
  args: {
    isOpen: true,
    children:
      "A long reviewer note that wraps across several lines to check the panel inside a phone width: the milestones are clear and the architecture document is linked.",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "390px" }}>
        <Story />
      </div>
    ),
  ],
};

export const Top: Story = { args: { isOpen: true, placement: "top" } };

export const RichContent: Story = {
  args: {
    isOpen: true,
    label: "Account summary",
    children: (
      <div style={{ display: "grid", gap: "0.5rem" }}>
        <strong>GABC…XYZ1</strong>
        <span>Created 14 Mar 2024 · active 3 days ago</span>
        <span>1,204.5 XLM · 3 trustlines</span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Chip variant="purple">Account</Chip>
          <Chip variant="muted">Ledger 51,203,118</Chip>
        </div>
      </div>
    ),
  },
};

export const LongContent: Story = {
  args: {
    isOpen: true,
    children:
      "A long reviewer note that wraps across several lines to check the maximum width of the panel: the milestones are clear, the architecture document is linked, the team section lists three people while Project Stats says five, and the second tranche has no evidence lines yet.",
  },
};
