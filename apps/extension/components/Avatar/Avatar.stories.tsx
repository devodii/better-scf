import type { Meta, StoryObj } from '@storybook/react-vite';
import { Avatar } from './Avatar';

const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23b8a2ff'/%3E%3Ccircle cx='32' cy='25' r='12' fill='%23282630'/%3E%3Cpath d='M10 64c2-14 11-21 22-21s20 7 22 21z' fill='%23282630'/%3E%3C/svg%3E";

const meta = {
  title: 'UI/Avatar',
  component: Avatar,
  args: { name: 'Ada Lovelace', size: 'md' },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initials: Story = {};

export const SingleName: Story = { args: { name: 'satoshi' } };

export const Image: Story = { args: { src: PHOTO } };

export const BrokenImage: Story = { args: { src: 'data:image/png;base64,broken' } };

export const Link: Story = { args: { href: 'https://github.com/octocat', src: PHOTO } };

export const LinkInitials: Story = { args: { href: 'https://x.com/stellarorg' } };

export const LinkFocused: Story = {
  args: { href: 'https://github.com/octocat', src: PHOTO, size: 'lg' },
  decorators: [
    (Story) => (
      <div data-force-focus style={{ padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
};

export const Small: Story = { args: { size: 'sm' } };

export const Large: Story = { args: { size: 'lg', src: PHOTO } };
