import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { IconButton } from './IconButton';

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
  </svg>
);

const Arrow = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M11.84 7.25 7.12 2.53l1.06-1.06 6.53 6.53-6.53 6.53-1.06-1.06 4.72-4.72H1.65v-1.5z" />
  </svg>
);

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  args: { label: 'Shortlist', children: <Star />, onClick: fn() },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};

export const GhostPressed: Story = { args: { isPressed: true } };

export const Surface: Story = { args: { variant: 'surface' } };

export const SurfacePressed: Story = { args: { variant: 'surface', isPressed: true } };

export const Accent: Story = {
  args: { variant: 'accent', size: 'lg', label: 'Send', children: <Arrow /> },
};

export const Small: Story = { args: { size: 'sm', variant: 'surface' } };

export const Focused: Story = {
  render: (args) => (
    <div data-force-focus style={{ display: 'flex', gap: '1rem', padding: '0.5rem' }}>
      <IconButton {...args} />
      <IconButton {...args} variant="surface" />
      <IconButton {...args} variant="accent" size="lg" label="Send" />
    </div>
  ),
};

export const Disabled: Story = {
  args: { variant: 'accent', size: 'lg', label: 'Send', children: <Arrow />, disabled: true },
};

export const SurfaceDisabled: Story = {
  args: { variant: 'surface', size: 'lg', label: 'Next', children: <Arrow />, disabled: true },
};

export const Carousel: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem' }}>
      <IconButton {...args} variant="surface" size="lg" label="Previous">
        <Arrow />
      </IconButton>
      <IconButton {...args} variant="surface" size="lg" label="Next">
        <Arrow />
      </IconButton>
    </div>
  ),
};

export const Hover: Story = {
  render: (args) => (
    <div data-force-hover style={{ display: 'flex', gap: '1rem', padding: '0.5rem' }}>
      <IconButton {...args} />
      <IconButton {...args} variant="surface" size="lg" />
      <IconButton {...args} variant="accent" size="lg" label="Send" />
    </div>
  ),
};

export const Narrow390: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', maxWidth: '390px' }}>
      <IconButton {...args} size="sm" />
      <IconButton {...args} variant="surface" size="md" />
      <IconButton {...args} variant="surface" size="lg" isPressed />
      <IconButton {...args} variant="accent" size="lg" label="Send" />
    </div>
  ),
};
