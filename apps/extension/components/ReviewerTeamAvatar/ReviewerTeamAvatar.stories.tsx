import type { Meta, StoryObj } from '@storybook/react-vite';

import { ReviewerTeamAvatar } from './ReviewerTeamAvatar';

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23b8a2ff'/%3E%3Ccircle cx='32' cy='25' r='12' fill='%23282630'/%3E%3Cpath d='M10 64c2-14 11-21 22-21s20 7 22 21z' fill='%23282630'/%3E%3C/svg%3E";

const meta = {
  title: 'Reviewer/ReviewerTeamAvatar',
  component: ReviewerTeamAvatar,
  args: { name: 'Jerome d’Orchimont', src: PHOTO },
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '24.5rem',
          height: '13rem',
          overflow: 'hidden',
          background: '#3a3844',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <span>Site placeholder</span>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ReviewerTeamAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Linked: Story = { args: { href: 'https://github.com/octocat' } };

export const LinkedFocused: Story = {
  args: { href: 'https://github.com/octocat' },
  decorators: [
    (Story) => (
      <div data-force-focus>
        <Story />
      </div>
    ),
  ],
};

export const BrokenImageKeepsPlaceholder: Story = {
  args: { src: 'data:image/png;base64,broken' },
};

export const Narrow: Story = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
};
