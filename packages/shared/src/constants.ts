/** Keep in step with the root package.json version. */
export const EXTENSION_VERSION = '0.1.0';

export const CHAT_LIMITS = {
  maxMessages: 20,
  maxUserMessageChars: 2000,
  maxAssistantMessageChars: 6000,
  maxContextChars: 24000,
  maxIdChars: 128,
  maxPromptIdChars: 64,
  dailyQuestionsPerClient: 40,
} as const;

export type QuickPromptScope = 'submission' | 'round';

export interface QuickPrompt {
  /** Stable id: part of the server's summary-cache key, never rename. */
  readonly id: string;
  readonly scope: QuickPromptScope;
  readonly text: string;
}

export const QUICK_PROMPTS: readonly QuickPrompt[] = [
  { id: 'summarize-5', scope: 'submission', text: 'Summarize in 5 bullets' },
  {
    id: 'deliverables-tranches',
    scope: 'submission',
    text: 'List every deliverable with its tranche and amount',
  },
  {
    id: 'onchain-metric',
    scope: 'submission',
    text: 'What exactly is the on-chain metric and how is it measured?',
  },
  {
    id: 'team-roles',
    scope: 'submission',
    text: 'Who is on the team and what does each person own?',
  },
  {
    id: 'traction-evidence',
    scope: 'submission',
    text: 'What evidence of traction is provided?',
  },
  {
    id: 'explain-newcomer',
    scope: 'submission',
    text: 'Explain this for someone new to Stellar',
  },
  {
    id: 'round-integration',
    scope: 'round',
    text: 'Which submissions are Integration track?',
  },
  {
    id: 'round-by-category',
    scope: 'round',
    text: 'Group submissions by category',
  },
];

export function findQuickPrompt(id: string): QuickPrompt | undefined {
  return QUICK_PROMPTS.find((prompt) => prompt.id === id);
}
