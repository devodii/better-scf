import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { Dock, type DockMessageItem, type DockProps } from './Dock';

const PHONE = {
  globals: { viewport: { value: 'phone', isRotated: false } },
  parameters: {
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
      },
    },
  },
} as const;

const PROMPTS = [
  { id: 'summarize-5', text: 'Summarize in 5 bullets' },
  { id: 'deliverables-tranches', text: 'List every deliverable with its tranche and amount' },
  { id: 'onchain-metric', text: 'What exactly is the on-chain metric and how is it measured?' },
  { id: 'team-roles', text: 'Who is on the team and what does each person own?' },
  { id: 'traction-evidence', text: 'What evidence of traction is provided?' },
  { id: 'explain-newcomer', text: 'Explain this for someone new to Stellar' },
];

const QUESTION: DockMessageItem = {
  id: 'u1',
  role: 'user',
  text: 'List every deliverable with its tranche and amount',
};

const ANSWER: DockMessageItem = {
  id: 'a1',
  role: 'assistant',
  text: 'The submission lists three deliverables:\n\n- **Tranche 1**: SDK core ($40,000)\n- **Tranche 2**: Docs and examples ($25,000)\n- **Tranche 3**: Mainnet launch ($35,000)\n\nSee the [Stellar docs](https://developers.stellar.org) for the metric definition.',
};

const CONVERSATION: DockMessageItem[] = [
  QUESTION,
  ANSWER,
  { id: 'u2', role: 'user', text: 'Who is on the team?' },
  {
    id: 'a2',
    role: 'assistant',
    text: 'Three people: Ada (lead), Grace (engineer) and Linus (design).',
  },
];

const HISTORY = [
  { id: 'h1', text: 'Summarize in 5 bullets', meta: 'This submission · 5 Nov 14:02' },
  { id: 'h2', text: 'Take me to the latest round', meta: 'Site · 4 Nov 09:15' },
];

const RATE_LIMIT = "You've hit the limit for today (40 questions). Resets at 14:30.";

const meta = {
  title: 'Dock/Dock',
  component: Dock,
  args: {
    value: '',
    placeholder: 'Ask about Stellar Payments SDK',
    status: 'idle',
    isDisabled: false,
    isExpanded: false,
    isHistoryOpen: false,
    messages: [],
    prompts: PROMPTS,
    historyItems: HISTORY,
    onValueChange: fn(),
    onSubmit: fn(),
    onExpandedChange: fn(),
    onHistoryOpenChange: fn(),
    onPromptSelect: fn(),
    onHistorySelect: fn(),
    onHistoryClear: fn(),
  },
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ padding: '1rem', minHeight: '34rem', display: 'flex', alignItems: 'flex-end' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Dock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Typing: Story = { args: { value: 'Which tranche is the largest?' } };

export const ExpandedEmpty: Story = { args: { isExpanded: true } };

export const Conversation: Story = { args: { isExpanded: true, messages: CONVERSATION } };

export const Thinking: Story = {
  args: {
    isExpanded: true,
    status: 'streaming',
    messages: [QUESTION, { id: 'a', role: 'assistant', text: '', isStreaming: true }],
  },
};

export const Streaming: Story = {
  args: {
    isExpanded: true,
    status: 'streaming',
    messages: [
      QUESTION,
      {
        id: 'a',
        role: 'assistant',
        text: 'The submission lists three deliverables:\n\n- **Tranche 1**: SDK core ($40,000)\n- **Tranche 2**: Do',
        isStreaming: true,
      },
    ],
  },
};

export const ToolLookup: Story = {
  args: {
    isExpanded: true,
    status: 'streaming',
    messages: [
      { id: 'u', role: 'user', text: 'What do I need for the next tier?' },
      {
        id: 'a',
        role: 'assistant',
        text: '',
        activity: 'Looking up your tier requirements...',
        isStreaming: true,
      },
    ],
  },
};

export const ToolNavigate: Story = {
  args: {
    isExpanded: true,
    status: 'streaming',
    messages: [
      { id: 'u', role: 'user', text: 'Take me to my voting history' },
      {
        id: 'a',
        role: 'assistant',
        text: 'Opening it now.',
        activity: 'Taking you to Voting History...',
        isStreaming: true,
      },
    ],
  },
};

export const GenericError: Story = {
  args: {
    isExpanded: true,
    messages: [QUESTION, ANSWER],
    error: 'Something went wrong while asking. Please try again.',
  },
};

export const RateLimited: Story = {
  args: { isExpanded: true, messages: [QUESTION, ANSWER], error: RATE_LIMIT },
};

export const Disabled: Story = { args: { isDisabled: true, value: '' } };

export const HistoryList: Story = { args: { isExpanded: true, isHistoryOpen: true } };

export const HistoryEmpty: Story = {
  args: { isExpanded: true, isHistoryOpen: true, historyItems: [] },
};

export const LongText: Story = {
  args: {
    isExpanded: true,
    value:
      'Compare every tranche in this submission with the deliverables listed in the architecture section',
    placeholder: 'Ask about a submission with an extremely long title that keeps going and going',
    messages: [
      {
        id: 'u',
        role: 'user',
        text: 'Compare every tranche with the deliverables listed in the architecture section and quote the exact lines you rely on GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
      },
      {
        id: 'a',
        role: 'assistant',
        text: 'The amounts in Tranche 2 total $25,000 but the listed deliverables add up to $27,500 in the architecture section, which states: `Deliverable 2.3: Integration tests ($2,500)` that is not repeated in the tranche table.',
      },
    ],
  },
};

export const Focused: Story = {
  args: { isExpanded: true, messages: [QUESTION, ANSWER] },
  decorators: [
    (Story) => (
      <div data-force-focus style={{ width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

function Interactive(args: DockProps) {
  const [value, setValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [messages, setMessages] = useState<DockMessageItem[]>([]);
  const submit = (text: string): void => {
    setMessages((current) => [
      ...current,
      { id: `u${current.length}`, role: 'user', text },
      { id: `a${current.length}`, role: 'assistant', text: `You asked: **${text}**` },
    ]);
    setValue('');
    setIsExpanded(true);
    setIsHistoryOpen(false);
  };
  return (
    <Dock
      {...args}
      value={value}
      onValueChange={setValue}
      onSubmit={() => submit(value)}
      isExpanded={isExpanded}
      onExpandedChange={setIsExpanded}
      isHistoryOpen={isHistoryOpen}
      onHistoryOpenChange={setIsHistoryOpen}
      messages={messages}
      onPromptSelect={(prompt) => submit(prompt.text)}
    />
  );
}

export const Playground: Story = { render: (args) => <Interactive {...args} /> };

export const NarrowCollapsed: Story = { ...PHONE };

export const NarrowTyping: Story = {
  ...PHONE,
  args: { value: 'Which tranche is the largest and why does it differ from the others?' },
};

export const NarrowConversation: Story = {
  ...PHONE,
  args: { isExpanded: true, messages: CONVERSATION },
};

export const NarrowStreaming: Story = {
  ...PHONE,
  args: {
    isExpanded: true,
    status: 'streaming',
    messages: [
      { id: 'u', role: 'user', text: 'What do I need for the next tier?' },
      {
        id: 'a',
        role: 'assistant',
        text: '',
        activity: 'Looking up your tier requirements...',
        isStreaming: true,
      },
    ],
  },
};

export const NarrowRateLimited: Story = {
  ...PHONE,
  args: { isExpanded: true, error: RATE_LIMIT },
};

export const NarrowHistory: Story = {
  ...PHONE,
  args: { isExpanded: true, isHistoryOpen: true },
};
