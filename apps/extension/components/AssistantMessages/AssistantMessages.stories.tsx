import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { AssistantMessageItem } from '../AssistantMessage';
import { AssistantMessages, type AssistantMessagesProps } from './AssistantMessages';

const PROMPTS = [
  { id: 'summarize-5', text: 'Summarize in 5 bullets' },
  { id: 'deliverables-tranches', text: 'List every deliverable with its tranche and amount' },
  { id: 'team-roles', text: 'Who is on the team and what does each person own?' },
];

function user(id: string, text: string): AssistantMessageItem {
  return { id, role: 'user', parts: [{ kind: 'text', id: `${id}:t`, text }] };
}

function assistant(id: string, text: string): AssistantMessageItem {
  return { id, role: 'assistant', parts: [{ kind: 'text', id: `${id}:t`, text }] };
}

const CONVERSATION = [
  user('u1', 'List every deliverable with its tranche and amount'),
  assistant(
    'a1',
    'The submission lists three deliverables:\n\n- **Tranche 1**: SDK core ($40,000)\n- **Tranche 2**: Docs and examples ($25,000)\n- **Tranche 3**: Mainnet launch ($35,000)',
  ),
  user('u2', 'Who is on the team?'),
  assistant('a2', 'Three people: Ada (lead), Grace (engineer) and Linus (design).'),
];

const MANY = Array.from({ length: 8 }, (_, index) => [
  user(`mu${index}`, `Question number ${index + 1} about the submission`),
  assistant(
    `ma${index}`,
    `Answer ${index + 1}: the project requests **$150,000** across three tranches, and every tranche has its own deliverables and on-chain metric.`,
  ),
]).flat();

const meta = {
  title: 'Assistant/AssistantMessages',
  component: AssistantMessages,
  args: {
    messages: [],
    contextLabel: 'Stellar Payments SDK',
    prompts: PROMPTS,
    onPromptSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: 'flex',
          width: '25rem',
          height: '32rem',
          background: 'var(--bscf-surface)',
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantMessages>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Conversation: Story = { args: { messages: CONVERSATION } };

export const Thinking: Story = {
  args: {
    isBusy: true,
    messages: [
      user('u', 'What do I need for the next tier?'),
      { id: 'a', role: 'assistant', parts: [], isStreaming: true },
    ],
  },
};

export const Streaming: Story = {
  args: {
    isBusy: true,
    messages: [
      user('u', 'List every deliverable'),
      {
        id: 'a',
        role: 'assistant',
        isStreaming: true,
        parts: [
          {
            kind: 'text',
            id: 't',
            text: 'The submission lists three deliverables:\n\n- **Tranche 1**: SDK core ($40,000)\n- **Tranche 2**: Do',
          },
        ],
      },
    ],
  },
};

export const ToolRunning: Story = {
  args: {
    isBusy: true,
    messages: [
      user('u', 'What do I need for the next tier?'),
      {
        id: 'a',
        role: 'assistant',
        isStreaming: true,
        parts: [
          {
            kind: 'activity',
            id: 'x',
            text: 'Looking up your tier requirements',
            status: 'running',
          },
        ],
      },
    ],
  },
};

export const ToolDone: Story = {
  args: {
    isBusy: true,
    messages: [
      user('u', 'What do I need for the next tier?'),
      {
        id: 'a',
        role: 'assistant',
        isStreaming: true,
        parts: [
          { kind: 'activity', id: 'x', text: 'Looking up your tier requirements', status: 'done' },
        ],
      },
    ],
  },
};

export const ToolError: Story = {
  args: {
    messages: [
      user('u', 'What do I need for the next tier?'),
      {
        id: 'a',
        role: 'assistant',
        parts: [
          {
            kind: 'activity',
            id: 'x',
            text: 'Looking up your tier requirements',
            status: 'error',
            detail: 'The backend is rate limited. Wait before asking again.',
          },
          { kind: 'text', id: 't', text: 'I could not read your tier data right now.' },
        ],
      },
    ],
  },
};

export const GenericError: Story = {
  args: {
    messages: CONVERSATION.slice(0, 2),
    notice: { tone: 'error', text: 'Something went wrong while asking. Please try again.' },
  },
};

export const NetworkError: Story = {
  args: {
    messages: CONVERSATION.slice(0, 1),
    notice: {
      tone: 'error',
      text: 'Could not reach the assistant. Check your connection and try again.',
    },
  },
};

export const RateLimited: Story = {
  args: {
    messages: CONVERSATION.slice(0, 2),
    notice: {
      tone: 'limit',
      text: "You've hit the limit for today (40 questions). Resets at 14:30.",
    },
  },
};

export const LongMessage: Story = {
  args: {
    messages: [
      user(
        'u',
        'Compare every tranche with the deliverables listed in the architecture section and quote the exact lines you rely on GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      ),
      assistant(
        'a',
        '## Comparison\n\nThe amounts in **Tranche 2** total $25,000 but the listed deliverables add up to $27,500:\n\n1. Deliverable 2.1: Docs ($10,000)\n2. Deliverable 2.2: Examples ($15,000)\n3. Deliverable 2.3: Integration tests ($2,500)\n\nThe architecture section states `Deliverable 2.3: Integration tests ($2,500)`, which is not repeated in the tranche table. A sample of how the check works:\n\n```\nconst total = deliverables.reduce((sum, item) => sum + item.amount, 0);\nif (total !== tranche.amount) report(tranche);\n```\n\nSee the [Stellar docs](https://developers.stellar.org) for the metric definition.',
      ),
    ],
  },
};

export const Scrollable: Story = { args: { messages: MANY } };

function Streamer(args: AssistantMessagesProps) {
  const [count, setCount] = useState(1);
  const messages = MANY.slice(0, count * 2);
  return (
    <>
      <AssistantMessages {...args} messages={messages} />
      <button
        type="button"
        style={{ position: 'absolute', top: 8, right: 8 }}
        onClick={() => setCount((value) => Math.min(value + 1, MANY.length / 2))}
      >
        Add exchange
      </button>
    </>
  );
}

export const Playground: Story = { render: (args) => <Streamer {...args} /> };
