import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Select } from "./Select";

const SORT = [
  { value: "site", label: "Site order" },
  { value: "budgetDesc", label: "Budget, high to low" },
  { value: "budgetAsc", label: "Budget, low to high" },
  { value: "title", label: "Title, A to Z" },
] as const;

const FILTERS = [
  { value: "support", label: "Support", group: "Stance" },
  { value: "unsure", label: "Unsure", group: "Stance" },
  { value: "against", label: "Against", group: "Stance" },
  { value: "shortlisted", label: "Shortlisted", group: "Status" },
  { value: "unread", label: "Unread", group: "Status" },
  { value: "open", label: "Open", group: "Track" },
  { value: "integration", label: "Integration", group: "Track" },
] as const;

function SingleDemo({ initial }: { initial: string }) {
  const [value, setValue] = useState<string>(initial);
  return (
    <Select label="Sort" value={value} options={SORT} onChange={setValue} />
  );
}

function MultipleDemo({ initial }: { initial: string[] }) {
  const [values, setValues] = useState<string[]>(initial);
  return (
    <Select
      multiple
      label="Filters"
      options={FILTERS}
      values={values}
      onValuesChange={setValues}
    />
  );
}

const meta = {
  title: "Controls/Select",
  component: SingleDemo,
  args: { initial: "site" },
  decorators: [
    (Story) => (
      <div style={{ width: "18rem", padding: "1rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SingleDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = { args: { initial: "budgetDesc" } };

export const NearBottom: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "18rem", padding: "1rem", paddingTop: "22rem" }}>
        <Story />
      </div>
    ),
  ],
};

export const MultipleEmpty: Story = {
  render: () => <MultipleDemo initial={[]} />,
};

export const MultipleSelected: Story = {
  render: () => <MultipleDemo initial={["support", "open"]} />,
};
