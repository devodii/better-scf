import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { TocNav, type TocNavProps } from "./TocNav";

const ITEMS = [
  { id: "products-services", title: "Products & Services" },
  { id: "requested-budget", title: "Requested Budget" },
  { id: "traction-evidence", title: "Traction Evidence" },
  { id: "tranche-1", title: "Tranche 1 (Deliverable Roadmap) - MVP" },
  { id: "tranche-2", title: "Tranche 2 (Deliverable Roadmap) - Testnet" },
  { id: "tranche-3", title: "Tranche 3 (Deliverable Roadmap) - Mainnet" },
  { id: "tranche-3-metric", title: "Tranche 3 Onchain Metric Information" },
  { id: "team", title: "Team" },
];

const meta = {
  title: "Submission/TocNav",
  component: TocNav,
  args: {
    items: ITEMS,
    activeId: "tranche-1",
    isOpen: true,
    onOpenChange: fn(),
    onSelect: fn(),
  },
} satisfies Meta<typeof TocNav>;

export default meta;
type Story = StoryObj<typeof meta>;

function Interactive(args: TocNavProps) {
  const [isOpen, setOpen] = useState(args.isOpen);
  const [activeId, setActive] = useState(args.activeId);
  return (
    <TocNav
      {...args}
      isOpen={isOpen}
      onOpenChange={setOpen}
      activeId={activeId}
      onSelect={setActive}
    />
  );
}

const inWidth =
  (width: string): Decorator =>
  (Story) => (
    <div style={{ width }}>
      <Story />
    </div>
  );

export const Default: Story = { render: (args) => <Interactive {...args} /> };

export const Collapsed: Story = {
  args: { isOpen: false },
  render: (args) => <Interactive {...args} />,
};

export const CollapsedWithoutActive: Story = {
  args: { isOpen: false, activeId: null },
};

export const FirstSectionActive: Story = {
  args: { activeId: "products-services" },
};

export const Empty: Story = { args: { items: [], activeId: null } };

export const LongTitles: Story = {
  args: {
    activeId: "long",
    items: [
      ...ITEMS.slice(0, 2),
      {
        id: "long",
        title:
          "Tranche #3: Public launch, maintenance and distribution of the verified tokenized asset registry (mainnet)",
      },
      {
        id: "unbroken",
        title:
          "Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious",
      },
    ],
  },
  decorators: [inWidth("15rem")],
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

export const Rail: Story = {
  render: (args) => <Interactive {...args} />,
  decorators: [inWidth("15rem")],
};

export const Narrow: Story = {
  render: (args) => <Interactive {...args} />,
  decorators: [inWidth("24.375rem")],
};

export const NarrowCollapsed: Story = {
  args: { isOpen: false },
  render: (args) => <Interactive {...args} />,
  decorators: [inWidth("24.375rem")],
};
