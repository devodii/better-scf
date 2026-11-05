import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchThumbnail } from './SearchThumbnail';

const IMAGE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'><rect width='8' height='8' fill='%23b8a2ff'/><circle cx='4' cy='4' r='2' fill='%23ffda00'/></svg>";

const meta = {
  title: 'Search/SearchThumbnail',
  component: SearchThumbnail,
  args: { src: IMAGE, fallback: 'Soroban Toolkit' },
  decorators: [
    (Story) => (
      <div style={{ padding: '0.5rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loaded: Story = {};

export const NoImage: Story = { args: { src: null } };

export const ImageFailed: Story = { args: { src: 'https://invalid.invalid/thumbnail.png' } };
