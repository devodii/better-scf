import { Chat } from '@ai-sdk/react';
import {
  type ChatTransport,
  DefaultChatTransport,
  type DynamicToolUIPart,
  getToolName,
  isToolUIPart,
  lastAssistantMessageIsCompleteWithToolCalls,
  type ToolUIPart,
  type UIMessage,
} from 'ai';
import dayjs from 'dayjs';
import {
  CHAT_LIMITS,
  type ChatRequest,
  type ChatRequestMessage,
  EXTENSION_VERSION,
  type ProposalContext,
  parseChatError,
} from 'shared';
import { getToolDeclarations, runTool } from './tools/registry';

export interface ChatPageRequest extends ProposalContext {
  promptId?: string;
}

export interface BscfChatTransportOptions {
  serverUrl: string;
  getClientId: () => string | Promise<string>;
  getPageRequest: () => ChatPageRequest;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  extensionVersion?: string;
}

export type ChatTransportErrorCode =
  | 'daily_limit'
  | 'rate_limited'
  | 'global_cap'
  | 'server'
  | 'network';

export class ChatTransportError extends Error {
  readonly code: ChatTransportErrorCode;
  readonly status: number;
  readonly retryAfterSeconds: number | null;

  constructor(
    code: ChatTransportErrorCode,
    message: string,
    status: number,
    retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = 'ChatTransportError';
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const GENERIC_MESSAGE = 'Something went wrong while asking. Please try again.';

function formatResetTime(nowMs: number, retryAfterSeconds: number): string {
  return dayjs(nowMs).add(retryAfterSeconds, 'second').format('HH:mm');
}

function parseRetryAfterHeader(value: string | null): number | null {
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.ceil(seconds) : null;
}

async function mapChatErrorResponse(
  response: Response,
  now: () => number,
): Promise<ChatTransportError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = parseChatError(body);
  const detail = parsed.ok ? parsed.data.error : null;
  const retryAfter =
    detail?.retryAfterSeconds ?? parseRetryAfterHeader(response.headers.get('Retry-After'));

  if (response.status === 429) {
    if (detail?.code === 'rate_limited') {
      const wait = retryAfter === null ? 'a moment' : `${retryAfter} seconds`;
      return new ChatTransportError(
        'rate_limited',
        `You're asking too fast. Try again in ${wait}.`,
        429,
        retryAfter,
      );
    }
    const resets = retryAfter === null ? 'tomorrow' : formatResetTime(now(), retryAfter);
    return new ChatTransportError(
      'daily_limit',
      `You've hit the limit for today (${CHAT_LIMITS.dailyQuestionsPerClient} questions). Resets at ${resets}.`,
      429,
      retryAfter,
    );
  }
  if (response.status === 503) {
    return new ChatTransportError(
      'global_cap',
      detail?.message ?? 'The assistant is busy right now. Please try again later.',
      503,
      retryAfter,
    );
  }
  return new ChatTransportError(
    'server',
    detail?.message ?? GENERIC_MESSAGE,
    response.status,
    retryAfter,
  );
}

type AssistantRequestPart = Extract<ChatRequestMessage, { role: 'assistant' }>['parts'][number];

const MAX_TOOL_ERROR_CHARS = 300;
const BODY_SLACK_BYTES = 1024;

function toToolPart(part: ToolUIPart | DynamicToolUIPart): AssistantRequestPart | null {
  const base = {
    type: 'dynamic-tool' as const,
    toolName: getToolName(part),
    toolCallId: part.toolCallId,
  };
  if (part.state === 'output-available') {
    return { ...base, state: 'output-available', input: part.input ?? {}, output: part.output };
  }
  if (part.state === 'output-error') {
    return {
      ...base,
      state: 'output-error',
      input: part.input ?? {},
      errorText: part.errorText.slice(0, MAX_TOOL_ERROR_CHARS),
    };
  }
  return null;
}

function toRequestMessage(message: UIMessage): ChatRequestMessage | null {
  if (message.role === 'user') {
    const text = message.parts
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('')
      .trim()
      .slice(0, CHAT_LIMITS.maxUserMessageChars);
    return text === '' ? null : { id: message.id, role: 'user', parts: [{ type: 'text', text }] };
  }
  if (message.role !== 'assistant') return null;
  let budget = CHAT_LIMITS.maxAssistantMessageChars;
  const parts: AssistantRequestPart[] = [];
  for (const part of message.parts) {
    if (part.type === 'text') {
      const text = part.text.slice(0, budget);
      if (text.trim() === '') continue;
      budget -= text.length;
      parts.push({ type: 'text', text });
    } else if (part.type === 'step-start') {
      parts.push({ type: 'step-start' });
    } else if (isToolUIPart(part)) {
      const toolPart = toToolPart(part);
      if (toolPart) parts.push(toolPart);
    }
  }
  return parts.some((part) => part.type !== 'step-start')
    ? { id: message.id, role: 'assistant', parts }
    : null;
}

function toRequestMessages(messages: readonly UIMessage[]): ChatRequestMessage[] {
  const turns: ChatRequestMessage[] = [];
  for (const message of messages) {
    const turn = toRequestMessage(message);
    if (turn) turns.push(turn);
  }
  const recent = turns.slice(-CHAT_LIMITS.maxMessages);
  const firstUser = recent.findIndex((turn) => turn.role === 'user');
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

function fitBody(body: ChatRequest): ChatRequest {
  const limit = CHAT_LIMITS.maxRequestBytes - BODY_SLACK_BYTES;
  const encoder = new TextEncoder();
  let current = body;
  let start = 0;
  while (encoder.encode(JSON.stringify(current)).length > limit) {
    const next = body.messages.findIndex((turn, index) => index > start && turn.role === 'user');
    if (next === -1) break;
    start = next;
    current = { ...body, messages: body.messages.slice(start) };
  }
  return current;
}

export class BscfChatTransport extends DefaultChatTransport<UIMessage> {
  private readonly inFlight: Set<AbortController>;
  private readonly turn: { steps: number };

  constructor(options: BscfChatTransportOptions) {
    const doFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
    const now = options.now ?? Date.now;
    const version = options.extensionVersion ?? EXTENSION_VERSION;
    const inFlight = new Set<AbortController>();
    const turn = { steps: 0 };

    const guardedFetch: typeof globalThis.fetch = async (input, init) => {
      const controller = new AbortController();
      inFlight.add(controller);
      const outer = init?.signal;
      const forward = () => controller.abort();
      if (outer?.aborted) controller.abort();
      else outer?.addEventListener('abort', forward, { once: true });
      try {
        const response = await doFetch(input, { ...init, signal: controller.signal });
        if (!response.ok) throw await mapChatErrorResponse(response, now);
        return response;
      } catch (error) {
        inFlight.delete(controller);
        if (error instanceof ChatTransportError || controller.signal.aborted) throw error;
        throw new ChatTransportError(
          'network',
          'Could not reach the assistant. Check your connection and try again.',
          0,
          null,
        );
      } finally {
        outer?.removeEventListener('abort', forward);
      }
    };

    super({
      api: `${options.serverUrl}/v1/chat`,
      credentials: 'omit',
      fetch: guardedFetch,
      prepareSendMessagesRequest: async ({ messages }) => {
        const page = options.getPageRequest();
        const tools = page.promptId === undefined ? await getToolDeclarations() : [];
        turn.steps = messages.at(-1)?.role === 'assistant' ? turn.steps + 1 : 1;
        const body: ChatRequest = {
          submissionId: page.submissionId,
          contentHash: page.contentHash,
          page: page.page,
          context: page.context,
          messages: toRequestMessages(messages),
          ...(page.promptId === undefined ? {} : { promptId: page.promptId }),
          ...(tools.length === 0 ? {} : { tools }),
        };
        return {
          body: fitBody(body),
          headers: {
            'X-BSCF-Client': await options.getClientId(),
            'X-BSCF-Version': version,
          },
        };
      },
    });
    this.inFlight = inFlight;
    this.turn = turn;
  }

  canContinue(): boolean {
    return this.turn.steps < CHAT_LIMITS.maxSteps;
  }

  close(): void {
    for (const controller of this.inFlight) controller.abort();
    this.inFlight.clear();
  }

  override async reconnectToStream(
    _options: Parameters<ChatTransport<UIMessage>['reconnectToStream']>[0],
  ): Promise<null> {
    return null;
  }
}

export interface BscfChat {
  chat: Chat<UIMessage>;
  transport: BscfChatTransport;
  close: () => void;
}

export function createBscfChat(options: BscfChatTransportOptions): BscfChat {
  const transport = new BscfChatTransport(options);
  const controller = new AbortController();

  const answer = async (toolName: string, toolCallId: string, input: unknown): Promise<void> => {
    const outcome = await runTool(toolName, input, controller.signal);
    if (controller.signal.aborted) return;
    if (outcome.ok) {
      void chat.addToolOutput({ tool: toolName, toolCallId, output: outcome.output });
    } else {
      void chat.addToolOutput({
        state: 'output-error',
        tool: toolName,
        toolCallId,
        errorText: outcome.error,
      });
    }
  };

  const chat = new Chat<UIMessage>({
    transport,
    onToolCall: ({ toolCall }) => {
      void answer(toolCall.toolName, toolCall.toolCallId, toolCall.input);
    },
    sendAutomaticallyWhen: ({ messages }) =>
      !controller.signal.aborted &&
      transport.canContinue() &&
      lastAssistantMessageIsCompleteWithToolCalls({ messages }),
  });

  return {
    chat,
    transport,
    close: () => {
      controller.abort();
      transport.close();
      void chat.stop();
    },
  };
}
