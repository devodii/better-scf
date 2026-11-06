import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatIcon } from './StatIcon';

const meta = { title: 'UI/StatIcon', component: StatIcon } satisfies Meta<typeof StatIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Clock: Story = { args: { kind: 'clock' } };
export const Submissions: Story = { args: { kind: 'submissions' } };
export const Total: Story = { args: { kind: 'total' } };
export const Median: Story = { args: { kind: 'median' } };
