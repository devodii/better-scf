import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Collapsible } from "./Collapsible";

const meta = {
  title: "Controls/Collapsible",
  component: Collapsible,
  args: { isOpen: false, children: null },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

function Demo({ startOpen }: { startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div
      style={{
        width: "20rem",
        padding: "1rem",
        background: "var(--bscf-bg)",
        color: "white",
      }}
    >
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Toggle
      </button>
      <Collapsible isOpen={open}>
        <p style={{ margin: 0, padding: "1rem 0" }}>
          Content that slides open and closed with a soft fade.
        </p>
      </Collapsible>
    </div>
  );
}

export const Closed: Story = { render: () => <Demo startOpen={false} /> };

export const Open: Story = { render: () => <Demo startOpen /> };
