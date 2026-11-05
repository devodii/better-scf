import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssistantMarkdown } from './AssistantMarkdown';

const meta = {
  title: 'Assistant/AssistantMarkdown',
  component: AssistantMarkdown,
  args: {
    text: 'This project builds a **payments SDK** for Stellar. See the [docs](https://developers.stellar.org).',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '24rem', padding: '1rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantMarkdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Paragraph: Story = {};

export const Lists: Story = {
  args: {
    text: 'Deliverables:\n\n- Tranche 1: SDK core ($40,000)\n- Tranche 2: *Docs* and examples ($25,000)\n\nSteps:\n\n1. Read the spec\n2. Run `npm install`\n3. Ship it',
  },
};

export const CodeAndHeading: Story = {
  args: {
    text: '## Metric\n\nThe metric is measured with:\n\n```\nSELECT count(*) FROM payments\nWHERE asset = "USDC"\n```',
  },
};

export const UnsafeLinks: Story = {
  args: {
    text: 'Never links: [click me](javascript:alert(1)) and [data](data:text/html,hi). Fine: [site](/dashboard) and [external](https://stellar.org).',
  },
};

export const StreamingCaret: Story = {
  args: { text: 'The team has three members:\n\n- Ada, lead engi', isStreaming: true },
};

export const StreamingParagraphCaret: Story = {
  args: { text: 'The submission lists three deliverables and the first one is', isStreaming: true },
};

export const LongText: Story = {
  args: {
    text: 'A very long unbroken value: GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA and a long sentence that should wrap instead of overflowing the message column on narrow screens.',
  },
};

export const Empty: Story = { args: { text: '' } };
