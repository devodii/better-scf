import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { fn } from 'storybook/test';
import { createPagePush } from '../../entrypoints/scf.content/features/dock/push';
import dockCss from '../../entrypoints/scf.content/styles/dock.scss?inline';
import type { AssistantMessageItem } from '../AssistantMessage';
import { Assistant, type AssistantProps } from './Assistant';
import { PANEL_SIDE, type PanelSide } from './side';

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
  { id: 'explain-newcomer', text: 'Explain this for someone new to Stellar' },
];

const HISTORY = [
  { id: 'h1', text: 'Summarize in 5 bullets', meta: 'This submission · 5 Nov 14:02' },
  { id: 'h2', text: 'Take me to the latest round', meta: 'Site · 4 Nov 09:15' },
];

function user(id: string, text: string): AssistantMessageItem {
  return { id, role: 'user', parts: [{ kind: 'text', id: `${id}:t`, text }] };
}

function assistant(id: string, text: string): AssistantMessageItem {
  return { id, role: 'assistant', parts: [{ kind: 'text', id: `${id}:t`, text }] };
}

const QUESTION = user('u1', 'List every deliverable with its tranche and amount');

const ANSWER_TEXT =
  'The submission lists three deliverables:\n\n- **Tranche 1**: SDK core ($40,000)\n- **Tranche 2**: Docs and examples ($25,000)\n- **Tranche 3**: Mainnet launch ($35,000)\n\nSee the [Stellar docs](https://developers.stellar.org) for the metric definition.';

const ANSWER = assistant('a1', ANSWER_TEXT);

const TIER_QUESTION = user('u', 'What do I need for the next tier?');

const LONG_ANSWER = assistant(
  'a',
  '## Comparison\n\nThe amounts in **Tranche 2** total $25,000 but the listed deliverables add up to $27,500:\n\n1. Deliverable 2.1: Docs ($10,000)\n2. Deliverable 2.2: Examples ($15,000)\n3. Deliverable 2.3: Integration tests ($2,500)\n\nA sample of how the check works:\n\n```\nconst total = deliverables.reduce((sum, item) => sum + item.amount, 0);\nif (total !== tranche.amount) report(tranche);\n```\n\nSee the [Stellar docs](https://developers.stellar.org) for the metric definition.',
);

const meta = {
  title: 'Assistant/Assistant',
  component: Assistant,
  args: {
    isOpen: true,
    hasUnread: false,
    contextLabel: 'Stellar Payments SDK',
    value: '',
    placeholder: 'Ask about Stellar Payments SDK',
    maxLength: 2000,
    status: 'idle',
    messages: [],
    prompts: PROMPTS,
    isHistoryOpen: false,
    historyItems: HISTORY,
    onOpenChange: fn(),
    onValueChange: fn(),
    onSubmit: fn(),
    onStop: fn(),
    onPromptSelect: fn(),
    onDecision: fn(),
    onHistoryOpenChange: fn(),
    onHistorySelect: fn(),
    onHistoryClear: fn(),
  },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Assistant>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = { args: { isOpen: false } };

export const ClosedUnread: Story = { args: { isOpen: false, hasUnread: true } };

export const Empty: Story = {};

export const LeftOpen: Story = { args: { side: 'left', messages: [QUESTION, ANSWER] } };

export const RightOpen: Story = { args: { side: 'right', messages: [QUESTION, ANSWER] } };

export const RightClosedUnread: Story = {
  args: { side: 'right', isOpen: false, hasUnread: true },
};

export const LeftClosedUnread: Story = {
  args: { side: 'left', isOpen: false, hasUnread: true },
};

export const RightHistory: Story = {
  args: { side: 'right', isHistoryOpen: true, messages: [QUESTION, ANSWER] },
};

export const Typing: Story = {
  args: {
    status: 'streaming',
    value: 'Which tranche is the largest?',
    messages: [QUESTION, { id: 'a', role: 'assistant', parts: [], isStreaming: true }],
  },
};

export const Streaming: Story = {
  args: {
    status: 'streaming',
    messages: [
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
    ],
  },
};

export const ToolRunning: Story = {
  args: {
    status: 'streaming',
    messages: [
      TIER_QUESTION,
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

export const ToolNavigating: Story = {
  args: {
    status: 'streaming',
    messages: [
      user('u', 'Take me to my voting history'),
      {
        id: 'a',
        role: 'assistant',
        isStreaming: true,
        parts: [
          { kind: 'text', id: 't', text: 'Opening it now.' },
          { kind: 'activity', id: 'x', text: 'Taking you to Voting History', status: 'running' },
        ],
      },
    ],
  },
};

export const ToolDone: Story = {
  args: {
    status: 'streaming',
    messages: [
      TIER_QUESTION,
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
      TIER_QUESTION,
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

export const ToolConfirmPending: Story = {
  args: {
    messages: [
      user('u', 'Summarize this proposal'),
      {
        id: 'a',
        role: 'assistant',
        parts: [
          { kind: 'text', id: 't', text: 'I read the page. Taking you to the voting page next.' },
          { kind: 'confirm', id: 'x', text: 'Take you to Voting History', status: 'pending' },
        ],
      },
    ],
  },
};

export const ToolConfirmAllowed: Story = {
  args: {
    messages: [
      user('u', 'Summarize this proposal'),
      {
        id: 'a',
        role: 'assistant',
        parts: [
          { kind: 'confirm', id: 'x', text: 'Take you to Voting History', status: 'allowed' },
        ],
      },
    ],
  },
};

export const ToolConfirmDenied: Story = {
  args: {
    messages: [
      user('u', 'Summarize this proposal'),
      {
        id: 'a',
        role: 'assistant',
        parts: [
          {
            kind: 'confirm',
            id: 'x',
            text: 'Read your Community Fund data (dashboard user) and send it to the assistant',
            status: 'denied',
          },
          { kind: 'text', id: 't', text: 'Understood, I will not look at your account data.' },
        ],
      },
    ],
  },
};

export const ToolConfirmExpired: Story = {
  args: {
    messages: [
      user('u', 'Summarize this proposal'),
      {
        id: 'a',
        role: 'assistant',
        parts: [
          { kind: 'confirm', id: 'x', text: 'Take you to Voting History', status: 'expired' },
        ],
      },
      user('u2', 'Never mind, who is on the team?'),
    ],
  },
};

export const ServerNotConfigured: Story = {
  args: {
    notice: {
      tone: 'error',
      text: 'The assistant server is not configured, so the assistant is unavailable in this build.',
    },
  },
};

export const Conversation: Story = { args: { messages: [QUESTION, ANSWER] } };

export const ErrorState: Story = {
  args: {
    messages: [QUESTION, ANSWER],
    notice: { tone: 'error', text: 'Something went wrong while asking. Please try again.' },
  },
};

export const RateLimited: Story = {
  args: {
    messages: [QUESTION, ANSWER],
    notice: {
      tone: 'limit',
      text: "You've hit the limit for today (40 questions). Resets at 14:30.",
    },
  },
};

export const LongMessage: Story = {
  args: {
    value: 'Compare every tranche with the deliverables in the architecture section',
    messages: [
      user(
        'u',
        'Compare every tranche with the deliverables listed in the architecture section and quote the exact lines you rely on',
      ),
      LONG_ANSWER,
    ],
  },
};

export const History: Story = { args: { isHistoryOpen: true, messages: [QUESTION, ANSWER] } };

export const HistoryEmpty: Story = { args: { isHistoryOpen: true, historyItems: [] } };

export const PhoneSheetEmpty: Story = { ...PHONE };

export const PhoneSheetConversation: Story = {
  ...PHONE,
  args: { messages: [QUESTION, ANSWER] },
};

export const PhoneSheetStreaming: Story = {
  ...PHONE,
  args: {
    status: 'streaming',
    messages: [
      TIER_QUESTION,
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

export const PhoneSheetRateLimited: Story = {
  ...PHONE,
  args: {
    messages: [QUESTION, ANSWER],
    notice: {
      tone: 'limit',
      text: "You've hit the limit for today (40 questions). Resets at 14:30.",
    },
  },
};

export const PhoneSheetHistory: Story = { ...PHONE, args: { isHistoryOpen: true } };

export const PhoneLauncher: Story = { ...PHONE, args: { isOpen: false, hasUnread: true } };

function Interactive(args: AssistantProps) {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [value, setValue] = useState('');
  const [messages, setMessages] = useState<AssistantMessageItem[]>([]);
  const submit = (text: string): void => {
    const question = text.trim();
    if (question === '') return;
    setMessages((current) => [
      ...current,
      user(`u${current.length}`, question),
      assistant(`a${current.length}`, `You asked: **${question}**\n\n${ANSWER_TEXT}`),
    ]);
    setValue('');
    setIsHistoryOpen(false);
  };
  return (
    <Assistant
      {...args}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      value={value}
      onValueChange={setValue}
      onSubmit={() => submit(value)}
      messages={messages}
      isHistoryOpen={isHistoryOpen}
      onHistoryOpenChange={setIsHistoryOpen}
      onPromptSelect={(prompt) => submit(prompt.text)}
      onHistorySelect={(item) => {
        setValue(item.text);
        setIsHistoryOpen(false);
      }}
    />
  );
}

export const Playground: Story = {
  args: { isOpen: false },
  render: (args) => <Interactive {...args} />,
};

const FILLER = Array.from({ length: 6 }, (_, index) => `Section ${index + 1}`);

const NAV_LINKS = [
  'Award Rounds',
  'My Projects',
  'Tasks',
  'Verify Tier',
  'Delegate & Trust',
  'Community Vote',
  'Voting History',
  'Analytics',
  'odii.xlm',
];

const FAKE_SITE_CSS = `
.fake-nav {
  position: fixed;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  height: 6rem;
  padding: 0 5.25rem;
  background: #0f0f0f;
  border-bottom: 1px solid #282630;
}
.fake-sidebar {
  position: fixed;
  top: 6rem;
  left: 0;
  z-index: 40;
  width: 16rem;
  height: calc(100% - 110px);
  margin: 1rem;
}
`;

function FakeSite({ isOpen, side }: { isOpen: boolean; side: PanelSide }) {
  useEffect(() => {
    const push = createPagePush(side);
    push.set(isOpen, true);
  }, [isOpen, side]);
  useEffect(() => {
    const push = createPagePush();
    return () => push.release();
  }, []);
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        marginBottom: '2.5rem',
      }}
    >
      <main>
        <style>{FAKE_SITE_CSS}</style>
        <nav data-testid="site-nav" className="fake-nav">
          <a href="/" data-testid="site-logo" style={{ width: '3rem', color: '#fff' }}>
            SCF
          </a>
        </nav>
        <aside data-testid="site-sidebar" className="fake-sidebar">
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem',
              height: '100%',
              overflowY: 'auto',
            }}
          >
            {NAV_LINKS.map((label, index) => (
              <a
                key={label}
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  color: 'rgb(255 255 255 / 60%)',
                  marginTop: index === NAV_LINKS.length - 1 ? 'auto' : undefined,
                }}
              >
                <span style={{ width: '2rem', height: '2rem', background: '#282630' }} />
                {label}
              </a>
            ))}
          </div>
        </aside>
      </main>
      <aside data-testid="site-content" style={{ marginTop: '8rem', marginLeft: '16rem' }}>
        <div style={{ padding: '1.5rem' }}>
          {FILLER.map((label) => (
            <section
              key={label}
              style={{ height: '10rem', marginBottom: '1rem', background: '#282630' }}
            >
              {label}
            </section>
          ))}
        </div>
      </aside>
    </main>
  );
}

function PushedPage(args: AssistantProps) {
  const [isOpen, setIsOpen] = useState(args.isOpen);
  const side = args.side ?? PANEL_SIDE;
  return (
    <>
      <style>{dockCss}</style>
      <FakeSite isOpen={isOpen} side={side} />
      <Assistant {...args} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

export const PushedPageClosed: Story = {
  args: { isOpen: false, messages: [QUESTION, ANSWER] },
  render: (args) => <PushedPage {...args} />,
};

export const PushedPageOpen: Story = {
  args: { isOpen: true, messages: [QUESTION, ANSWER] },
  render: (args) => <PushedPage {...args} />,
};

export const PushedPageLeftClosed: Story = {
  args: { side: 'left', isOpen: false, messages: [QUESTION, ANSWER] },
  render: (args) => <PushedPage {...args} />,
};

export const PushedPageLeftOpen: Story = {
  args: { side: 'left', isOpen: true, messages: [QUESTION, ANSWER] },
  render: (args) => <PushedPage {...args} />,
};

export const PushedPagePhone: Story = {
  ...PHONE,
  args: { isOpen: true, messages: [QUESTION, ANSWER] },
  render: (args) => <PushedPage {...args} />,
};
