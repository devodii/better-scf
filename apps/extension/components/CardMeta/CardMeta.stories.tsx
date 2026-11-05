import type { Meta, StoryObj } from '@storybook/react-vite';
import type { AvatarStackPerson } from '../AvatarStack';
import { CardMeta } from './CardMeta';

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23b8a2ff'/%3E%3Ccircle cx='32' cy='25' r='12' fill='%23282630'/%3E%3Cpath d='M10 64c2-14 11-21 22-21s20 7 22 21z' fill='%23282630'/%3E%3C/svg%3E";

const PEOPLE: readonly AvatarStackPerson[] = [
  { name: 'Ada Lovelace', src: PHOTO, href: 'https://github.com/octocat' },
  { name: 'Grace Hopper', href: 'https://x.com/stellarorg' },
  { name: 'Alan Turing', href: 'https://github.com/torvalds' },
  {
    name: 'Katherine Johnson',
    src: 'data:image/png;base64,broken',
    href: 'https://github.com/gaearon',
  },
  { name: 'Edsger Dijkstra', href: 'https://github.com/sindresorhus' },
  { name: 'Barbara Liskov', href: 'https://github.com/tj' },
];

const TRACK = {
  label: 'Integration',
  hint: 'Derived from the on-chain metric section of the submission you opened',
  variant: 'purple',
} as const;

const AWARDED = {
  label: 'Awarded before · $120.0K',
  hint: '3 awarded submissions',
  variant: 'yellow',
} as const;

const meta = {
  title: 'Cards/CardMeta',
  component: CardMeta,
  args: { track: TRACK, awarded: AWARDED, people: PEOPLE.slice(0, 3) },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem', padding: '1.5rem', background: 'var(--bscf-surface)' }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
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
    track: { ...TRACK, label: 'Open', variant: 'olive' },
    awarded: null,
    people: [],
  },
};

export const AwardedOnly: Story = { args: { track: null, people: [] } };

export const PeopleOnly: Story = { args: { track: null, awarded: null } };

export const OverflowingTeam: Story = { args: { people: PEOPLE } };

export const Empty: Story = { args: { track: null, awarded: null, people: [] } };

export const LongText: Story = {
  args: {
    awarded: {
      ...AWARDED,
      label: 'Awarded before · $1.2M across many earlier rounds and tranches',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '14rem', padding: '1.5rem', background: 'var(--bscf-surface)' }}>
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

export const Narrow: Story = {
  args: { people: PEOPLE },
  globals: { viewport: { value: 'phone', isRotated: false } },
  decorators: [
    (Story) => (
      <div style={{ width: '100%', padding: '1rem', background: 'var(--bscf-surface)' }}>
        <Story />
      </div>
    ),
  ],
};
