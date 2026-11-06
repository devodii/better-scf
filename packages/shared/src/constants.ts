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
  maxRequestBytes: 200 * 1024,
  maxPartsPerMessage: 40,
  maxTools: 12,
  maxToolDescriptionChars: 500,
  maxToolSchemaChars: 4096,
  maxToolInputChars: 4096,
  maxToolResultChars: 12000,
  maxToolErrorChars: 2000,
  maxSteps: 8,
} as const;

export const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export const PAGE_KINDS = [
  'round',
  'submission',
  'rounds',
  'projects',
  'dashboard',
  'analytics',
  'public',
  'other',
] as const;

export type QuickPromptScope =
  | 'submission'
  | 'round'
  | 'dashboard'
  | 'projects'
  | 'analytics'
  | 'general';

const PAGE_KIND_SCOPE: Readonly<Record<(typeof PAGE_KINDS)[number], QuickPromptScope>> = {
  round: 'round',
  submission: 'submission',
  rounds: 'dashboard',
  dashboard: 'dashboard',
  projects: 'projects',
  analytics: 'analytics',
  public: 'general',
  other: 'general',
};

export interface QuickPrompt {
  /** Stable id: part of the server's summary-cache key, never rename. */
  readonly id: string;
  readonly scope: QuickPromptScope;
  readonly text: string;
}

const QUICK_PROMPTS: readonly QuickPrompt[] = [
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
    id: 'round-status-track',
    scope: 'round',
    text: 'Break this round down by status and track',
  },
  {
    id: 'round-by-category',
    scope: 'round',
    text: 'Group submissions by category',
  },
  {
    id: 'round-largest-budgets',
    scope: 'round',
    text: 'Which submissions request the largest budgets?',
  },
  {
    id: 'dashboard-open-rounds',
    scope: 'dashboard',
    text: 'Which rounds are open right now?',
  },
  {
    id: 'dashboard-latest-awards',
    scope: 'dashboard',
    text: 'How much was awarded in the latest completed round?',
  },
  {
    id: 'dashboard-funded-last-rounds',
    scope: 'dashboard',
    text: 'How many projects were funded in each of the last 5 rounds?',
  },
  {
    id: 'dashboard-go-analytics',
    scope: 'dashboard',
    text: 'Take me to the analytics page',
  },
  {
    id: 'projects-by-category',
    scope: 'projects',
    text: 'How many funded projects are there in each category?',
  },
  {
    id: 'projects-recent',
    scope: 'projects',
    text: 'Which projects were awarded most recently?',
  },
  {
    id: 'projects-find-payments',
    scope: 'projects',
    text: 'Find funded projects about payments',
  },
  {
    id: 'analytics-funding-trend',
    scope: 'analytics',
    text: 'How have funding totals changed across rounds?',
  },
  {
    id: 'analytics-participation',
    scope: 'analytics',
    text: 'How has participation changed across rounds?',
  },
  {
    id: 'analytics-insights',
    scope: 'analytics',
    text: 'Summarize the generated insights',
  },
  {
    id: 'general-help',
    scope: 'general',
    text: 'What can you help me with on this site?',
  },
  {
    id: 'general-pages',
    scope: 'general',
    text: 'Which pages does this site have?',
  },
  {
    id: 'general-latest-round',
    scope: 'general',
    text: 'Take me to the latest round',
  },
];

export function findQuickPrompt(id: string): QuickPrompt | undefined {
  return QUICK_PROMPTS.find((prompt) => prompt.id === id);
}

export function quickPromptsFor(page: (typeof PAGE_KINDS)[number]): readonly QuickPrompt[] {
  const scope = PAGE_KIND_SCOPE[page];
  return QUICK_PROMPTS.filter((prompt) => prompt.scope === scope);
}
