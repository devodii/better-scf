import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AvatarStackPerson } from "../AvatarStack";
import { CardMeta } from "./CardMeta";

const PEOPLE: readonly AvatarStackPerson[] = [
  {
    name: "Ada Lovelace",
    role: "Founder",
    href: "https://www.linkedin.com/in/ada-lovelace",
  },
  { name: "Grace Hopper", role: "Engineer" },
  {
    name: "Alan Turing",
    role: "Research",
    href: "https://www.linkedin.com/in/alan-turing",
  },
  {
    name: "Katherine Johnson",
    href: "https://www.linkedin.com/in/katherine-johnson",
  },
  { name: "Edsger Dijkstra", role: "Advisor" },
  {
    name: "Barbara Liskov",
    href: "https://www.linkedin.com/in/barbara-liskov",
  },
];

const TRACK = {
  label: "Integration",
  hint: "Derived from the proposal's on-chain metric section",
  variant: "purple",
} as const;

const AWARDED = {
  label: "Awarded before $120K",
  shortLabel: "Awarded $120K",
  hint: "3 awarded submissions",
  variant: "yellow",
} as const;

const meta = {
  title: "Cards/CardMeta",
  component: CardMeta,
  args: { track: TRACK, awarded: AWARDED, people: PEOPLE.slice(0, 3) },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: "22rem",
          padding: "1.5rem",
          background: "var(--bscf-surface)",
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
} satisfies Meta<typeof CardMeta>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};

export const TrackOnly: Story = { args: { awarded: null, people: [] } };

export const OpenTrack: Story = {
  args: {
    track: { ...TRACK, label: "Open", variant: "olive" },
    awarded: null,
    people: [],
  },
};

export const RfpTrack: Story = {
  args: {
    track: { ...TRACK, label: "RFP", variant: "yellow" },
    awarded: null,
    people: [],
  },
};

export const AwardedOnly: Story = { args: { track: null, people: [] } };

export const PeopleOnly: Story = { args: { track: null, awarded: null } };

export const OverflowingTeam: Story = { args: { people: PEOPLE } };

export const Empty: Story = {
  args: { track: null, awarded: null, people: [] },
};

export const LongText: Story = {
  args: {
    awarded: {
      ...AWARDED,
      label: "Awarded before $1.2M across many earlier rounds and tranches",
    },
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "14rem",
          padding: "1.5rem",
          background: "var(--bscf-surface)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const FocusedAvatars: Story = {
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const TouchTargets: Story = {
  args: { people: PEOPLE.slice(0, 3) },
  globals: { viewport: { value: "phone", isRotated: false } },
  decorators: [
    (Story) => (
      <div
        data-force-focus
        style={{
          width: "100%",
          padding: "1rem",
          background: "var(--bscf-surface)",
        }}
      >
        <style>
          {
            "ul a::after { background: rgb(255 214 0 / 0.3); outline: 1px dashed currentColor; }"
          }
        </style>
        <Story />
      </div>
    ),
  ],
};

export const Narrow: Story = {
  args: { people: PEOPLE },
  globals: { viewport: { value: "phone", isRotated: false } },
  decorators: [
    (Story) => (
      <div
        style={{
          width: "100%",
          padding: "1rem",
          background: "var(--bscf-surface)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
