import type { Meta, StoryObj } from '@storybook/react-vite';
import { AvatarStack, type AvatarStackPerson } from './AvatarStack';

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23b8a2ff'/%3E%3Ccircle cx='32' cy='25' r='12' fill='%23282630'/%3E%3Cpath d='M10 64c2-14 11-21 22-21s20 7 22 21z' fill='%23282630'/%3E%3C/svg%3E";

const TEAM: readonly AvatarStackPerson[] = [
  { name: 'Ada Lovelace', role: 'Lead engineer', src: PHOTO, href: 'https://github.com/octocat' },
  { name: 'Grace Hopper', role: 'Smart contracts', href: 'https://x.com/stellarorg' },
  { name: 'Alan Turing', role: 'Product' },
  { name: 'Katherine Johnson', role: 'Design', src: 'data:image/png;base64,broken' },
  { name: 'Edsger Dijkstra', role: 'Backend' },
  { name: 'Barbara Liskov' },
  { name: 'Donald Knuth', role: 'Advisor' },
];

const meta = {
  title: 'UI/AvatarStack',
  component: AvatarStack,
  args: { people: TEAM.slice(0, 3) },
} satisfies Meta<typeof AvatarStack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Few: Story = {};

export const One: Story = { args: { people: TEAM.slice(0, 1) } };

export const AtMax: Story = { args: { people: TEAM.slice(0, 4) } };

export const Overflow: Story = { args: { people: TEAM } };

export const Medium: Story = { args: { people: TEAM, size: 'md' } };

export const FocusedLinks: Story = {
  args: { people: TEAM, size: 'md' },
  decorators: [
    (Story) => (
      <div data-force-focus style={{ padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Hover: Story = {
  args: { people: TEAM, size: 'md' },
  decorators: [
    (Story) => (
      <div data-force-hover style={{ padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Narrow390: Story = {
  args: { people: TEAM, size: 'lg' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '390px' }}>
        <Story />
      </div>
    ),
  ],
};

export const Empty: Story = { args: { people: [] } };
