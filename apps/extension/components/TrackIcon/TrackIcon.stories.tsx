import type { Meta, StoryObj } from '@storybook/react-vite';
import { Chip } from '../Chip';
import { TrackIcon } from './TrackIcon';

const meta = { title: 'UI/TrackIcon', component: TrackIcon } satisfies Meta<typeof TrackIcon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  args: { kind: 'open' },
  render: (args) => (
    <Chip variant="olive" icon={<TrackIcon {...args} />}>
      Open
    </Chip>
  ),
};

export const Integration: Story = {
  args: { kind: 'integration' },
  render: (args) => (
    <Chip variant="purple" icon={<TrackIcon {...args} />}>
      Integration
    </Chip>
  ),
};

export const Rfp: Story = {
  args: { kind: 'rfp' },
  render: (args) => (
    <Chip variant="yellow" icon={<TrackIcon {...args} />}>
      RFP
    </Chip>
  ),
};
