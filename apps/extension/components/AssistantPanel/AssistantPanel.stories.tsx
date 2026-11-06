import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { PANEL_SIDE } from '../Assistant/side';
import { AssistantComposer } from '../AssistantComposer';
import { AssistantHistory } from '../AssistantHistory';
import type { AssistantMessageItem } from '../AssistantMessage';
import { AssistantMessages, type AssistantNotice } from '../AssistantMessages';
import { AssistantPanel, type AssistantPanelProps } from './AssistantPanel';

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
];

const HISTORY = [
  { id: 'h1', text: 'Summarize in 5 bullets', meta: 'This submission · 5 Nov 14:02' },
  { id: 'h2', text: 'Take me to the latest round', meta: 'Site · 4 Nov 09:15' },
];

const QUESTION: AssistantMessageItem = {
  id: 'u1',
  role: 'user',
  parts: [{ kind: 'text', id: 'u1:t', text: 'List every deliverable with its tranche and amount' }],
};

const ANSWER: AssistantMessageItem = {
  id: 'a1',
  role: 'assistant',
  parts: [
    {
      kind: 'text',
      id: 'a1:t',
      text: 'The submission lists three deliverables:\n\n- **Tranche 1**: SDK core ($40,000)\n- **Tranche 2**: Docs and examples ($25,000)\n- **Tranche 3**: Mainnet launch ($35,000)\n\nSee the [Stellar docs](https://developers.stellar.org) for the metric definition.',
    },
  ],
};

const LONG_ANSWER: AssistantMessageItem = {
  id: 'a2',
  role: 'assistant',
  parts: [
    {
      kind: 'text',
      id: 'a2:t',
      text: '## Comparison\n\nThe amounts in **Tranche 2** total $25,000 but the listed deliverables add up to $27,500:\n\n1. Deliverable 2.1: Docs ($10,000)\n2. Deliverable 2.2: Examples ($15,000)\n3. Deliverable 2.3: Integration tests ($2,500)\n\nA sample of how the check works:\n\n```\nconst total = deliverables.reduce((sum, item) => sum + item.amount, 0);\nif (total !== tranche.amount) report(tranche);\n```\n\nSee the [Stellar docs](https://developers.stellar.org) for the metric definition.',
    },
  ],
};

const TIER_QUESTION: AssistantMessageItem = {
  id: 'u2',
  role: 'user',
  parts: [{ kind: 'text', id: 'u2:t', text: 'What do I need for the next tier?' }],
};

function activity(
  status: 'running' | 'done' | 'error',
  detail?: string,
): readonly AssistantMessageItem[] {
  return [
    TIER_QUESTION,
    {
      id: 'a',
      role: 'assistant',
      isStreaming: status !== 'error',
      parts: [
        {
          kind: 'activity',
          id: 'x',
          text: 'Looking up your tier requirements',
          status,
          ...(detail ? { detail } : {}),
        },
        ...(status === 'error'
          ? [{ kind: 'text' as const, id: 't', text: 'I could not read your tier data right now.' }]
          : []),
      ],
    },
  ];
}

interface ContentProps {
  messages: readonly AssistantMessageItem[];
  notice?: AssistantNotice;
  isStreaming?: boolean;
}

function Content({ messages, notice, isStreaming = false }: ContentProps) {
  return (
    <>
      <AssistantMessages
        messages={messages}
        notice={notice}
        contextLabel="Stellar Payments SDK"
        prompts={PROMPTS}
        isBusy={isStreaming}
        onPromptSelect={fn()}
      />
      <AssistantComposer
        value=""
        onValueChange={fn()}
        onSubmit={fn()}
        onStop={fn()}
        placeholder="Ask about Stellar Payments SDK"
        maxLength={2000}
        isStreaming={isStreaming}
      />
    </>
  );
}

const history = <AssistantHistory items={HISTORY} onBack={fn()} onSelect={fn()} onClear={fn()} />;

const meta = {
  title: 'Assistant/AssistantPanel',
  component: AssistantPanel,
  args: {
    isOpen: true,
    onClose: fn(),
    contextLabel: 'Stellar Payments SDK',
    isHistoryOpen: false,
    onHistoryOpenChange: fn(),
    history,
    children: <Content messages={[]} />,
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AssistantPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Streaming: Story = {
  args: {
    children: (
      <Content
        isStreaming
        messages={[
          QUESTION,
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
        ]}
      />
    ),
  },
};

export const ToolRunning: Story = {
  args: { children: <Content isStreaming messages={activity('running')} /> },
};

export const ToolDone: Story = {
  args: { children: <Content isStreaming messages={activity('done')} /> },
};

export const ToolError: Story = {
  args: {
    children: (
      <Content
        messages={activity('error', 'The backend is rate limited. Wait before asking again.')}
      />
    ),
  },
};

export const ErrorState: Story = {
  args: {
    children: (
      <Content
        messages={[QUESTION, ANSWER]}
        notice={{ tone: 'error', text: 'Something went wrong while asking. Please try again.' }}
      />
    ),
  },
};

export const RateLimited: Story = {
  args: {
    children: (
      <Content
        messages={[QUESTION, ANSWER]}
        notice={{
          tone: 'limit',
          text: "You've hit the limit for today (40 questions). Resets at 14:30.",
        }}
      />
    ),
  },
};

export const LongAnswer: Story = {
  args: { children: <Content messages={[QUESTION, LONG_ANSWER]} /> },
};

export const HistoryOverlay: Story = {
  args: { isHistoryOpen: true, children: <Content messages={[QUESTION, ANSWER]} /> },
};

export const SideLeft: Story = {
  args: { side: 'left', children: <Content messages={[QUESTION, ANSWER]} /> },
};

export const SideRight: Story = {
  args: { side: 'right', children: <Content messages={[QUESTION, ANSWER]} /> },
};

export const DefaultSide: Story = {
  args: { side: PANEL_SIDE, children: <Content messages={[QUESTION, ANSWER]} /> },
};

export const Closed: Story = { args: { isOpen: false } };

function Sheet(args: AssistantPanelProps) {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  const [isHistoryOpen, setIsHistoryOpen] = useState(args.isHistoryOpen);
  return (
    <AssistantPanel
      {...args}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      isHistoryOpen={isHistoryOpen}
      onHistoryOpenChange={setIsHistoryOpen}
    />
  );
}

export const PhoneBottomSheet: Story = {
  ...PHONE,
  args: { children: <Content messages={[QUESTION, ANSWER]} /> },
  render: (args) => <Sheet {...args} />,
};

export const PhoneBottomSheetEmpty: Story = {
  ...PHONE,
  render: (args) => <Sheet {...args} />,
};

export const PhoneBottomSheetHistory: Story = {
  ...PHONE,
  args: { isHistoryOpen: true },
  render: (args) => <Sheet {...args} />,
};
