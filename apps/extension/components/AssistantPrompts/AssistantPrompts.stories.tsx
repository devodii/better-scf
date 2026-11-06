import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { AssistantPrompts } from "./AssistantPrompts";

const SUBMISSION_PROMPTS = [
  { id: "summarize-5", text: "Summarize in 5 bullets" },
  {
    id: "deliverables-tranches",
    text: "List every deliverable with its tranche and amount",
  },
  {
    id: "onchain-metric",
    text: "What exactly is the on-chain metric and how is it measured?",
  },
  {
    id: "team-roles",
    text: "Who is on the team and what does each person own?",
  },
  { id: "traction-evidence", text: "What evidence of traction is provided?" },
  { id: "explain-newcomer", text: "Explain this for someone new to Stellar" },
];

const meta = {
  title: "Assistant/AssistantPrompts",
  component: AssistantPrompts,
  args: { prompts: SUBMISSION_PROMPTS, onSelect: fn() },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "24rem", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantPrompts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { isDisabled: true } };

export const Single: Story = {
  args: { prompts: SUBMISSION_PROMPTS.slice(0, 1) },
};

export const Empty: Story = { args: { prompts: [] } };

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};
