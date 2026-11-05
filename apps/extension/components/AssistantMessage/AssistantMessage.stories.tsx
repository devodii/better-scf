import type { Meta, StoryObj } from '@storybook/react-vite';
import { AssistantMessage, type AssistantMessageItem } from './AssistantMessage';

function assistant(
  parts: AssistantMessageItem['parts'],
  isStreaming = false,
): AssistantMessageItem {
  return { id: 'a', role: 'assistant', parts, isStreaming };
}

const meta = {
  title: 'Assistant/AssistantMessage',
  component: AssistantMessage,
  args: {
    message: assistant([
      {
        kind: 'text',
        id: 't',
        text: 'The project requests **$150,000** across three tranches.',
      },
    ]),
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '22rem', padding: '1rem', display: 'flex' }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof AssistantMessage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Assistant: Story = {};

export const User: Story = {
  args: {
    message: {
      id: 'u',
      role: 'user',
      parts: [
        { kind: 'text', id: 't', text: 'List every deliverable with its tranche and amount' },
      ],
    },
  },
};

export const Typing: Story = { args: { message: assistant([], true) } };

export const Streaming: Story = {
  args: {
    message: assistant(
      [{ kind: 'text', id: 't', text: 'The team has three members:\n\n- Ada, lead engi' }],
      true,
    ),
  },
};

export const ToolRunning: Story = {
  args: {
    message: assistant(
      [{ kind: 'activity', id: 'x', text: 'Looking up your tier requirements', status: 'running' }],
      true,
    ),
  },
};

export const ToolDone: Story = {
  args: {
    message: assistant(
      [{ kind: 'activity', id: 'x', text: 'Looking up your tier requirements', status: 'done' }],
      true,
    ),
  },
};

export const ToolError: Story = {
  args: {
    message: assistant([
      {
        kind: 'activity',
        id: 'x',
        text: 'Looking up your tier requirements',
        status: 'error',
        detail: 'The backend is rate limited. Wait before asking again.',
      },
      { kind: 'text', id: 't', text: 'I could not read your tier data right now.' },
    ]),
  },
};

export const Navigating: Story = {
  args: {
    message: assistant(
      [
        { kind: 'text', id: 't', text: 'Sure, opening it for you.' },
        { kind: 'activity', id: 'x', text: 'Taking you to Voting History', status: 'running' },
      ],
      true,
    ),
  },
};

export const LongUser: Story = {
  args: {
    message: {
      id: 'u',
      role: 'user',
      parts: [
        {
          kind: 'text',
          id: 't',
          text: 'Please compare every tranche in this submission with the deliverables listed in the architecture section. GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        },
      ],
    },
  },
};
