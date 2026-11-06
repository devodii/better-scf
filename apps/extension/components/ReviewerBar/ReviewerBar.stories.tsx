import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import {
  ReviewerBar,
  type ReviewerBarProps,
  type ReviewerCopyStatus,
} from "./ReviewerBar";

const PHONE = {
  globals: { viewport: { value: "phone", isRotated: false } },
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
} as const;

const meta = {
  title: "Reviewer/ReviewerBar",
  component: ReviewerBar,
  args: {
    stance: "none",
    shortlisted: false,
    note: "",
    noteStatus: "idle",
    copyStatus: "idle",
    isExpanded: true,
    onStanceChange: fn(),
    onShortlistChange: fn(),
    onNoteChange: fn(),
    onCopy: fn(),
    onExpandedChange: fn(),
  },
} satisfies Meta<typeof ReviewerBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Support: Story = { args: { stance: "support" } };

export const Unsure: Story = { args: { stance: "unsure" } };

export const Against: Story = { args: { stance: "against" } };

export const Shortlisted: Story = {
  args: { shortlisted: true, stance: "support" },
};

export const FilledNote: Story = {
  args: {
    note: "Budget for tranche 2 looks high, ask in the Q&A.",
    noteStatus: "saved",
  },
};

export const LongNote: Story = {
  args: {
    note: "The milestones are clear, the architecture document is linked, the team section lists three people while Project Stats says five, and the second tranche has no evidence lines yet.",
  },
};

export const Saving: Story = {
  args: { note: "Revisit after the call", noteStatus: "saving" },
};

export const CopyDone: Story = { args: { copyStatus: "copied" } };

export const CopyFailed: Story = { args: { copyStatus: "failed" } };

export const Collapsed: Story = { args: { isExpanded: false } };

export const CollapsedWithReview: Story = {
  args: { isExpanded: false, stance: "unsure", shortlisted: true },
};

export const Focused: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

function Interactive(args: ReviewerBarProps) {
  const [stance, setStance] = useState(args.stance);
  const [shortlisted, setShortlisted] = useState(args.shortlisted);
  const [note, setNote] = useState(args.note);
  const [isExpanded, setIsExpanded] = useState(args.isExpanded);
  const [copyStatus, setCopyStatus] = useState<ReviewerCopyStatus>(
    args.copyStatus ?? "idle",
  );
  return (
    <ReviewerBar
      {...args}
      stance={stance}
      onStanceChange={setStance}
      shortlisted={shortlisted}
      onShortlistChange={setShortlisted}
      note={note}
      noteStatus={note ? "saved" : "idle"}
      onNoteChange={setNote}
      copyStatus={copyStatus}
      onCopy={() => setCopyStatus("copied")}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
    />
  );
}

export const Playground: Story = {
  render: (args) => <Interactive {...args} />,
};

export const NarrowExpanded: Story = {
  ...PHONE,
  args: {
    stance: "support",
    shortlisted: true,
    note: "Strong integration plan",
  },
};

export const NarrowCollapsed: Story = {
  ...PHONE,
  args: { isExpanded: false, stance: "support", shortlisted: true },
};
