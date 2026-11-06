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
import { AppError, assertNever, isAppError } from '../errors';
import { gateFor } from './safety';
import { getToolDeclarations, runTool, ToolError } from './tools/registry';

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

export type ChatTransportErrorKind =
  | 'daily-limit'
  | 'rate-limited'
  | 'global-cap'
  | 'server'
  | 'network'
  | 'not-configured';

interface ChatTransportErrorDetail {
  status: number;
  retryAfterSeconds: number | null;
  serverMessage?: string | undefined;
  resetsAt?: string | undefined;
  cause?: unknown;
}

const GENERIC_MESSAGE = 'Something went wrong while asking. Please try again.';

function formatResetTime(nowMs: number, retryAfterSeconds: number): string {
  return dayjs(nowMs).add(retryAfterSeconds, 'second').format('HH:mm');
}

export class ChatTransportError extends AppError<ChatTransportErrorKind> {
  readonly status: number;
  readonly retryAfterSeconds: number | null;
  private readonly serverMessage: string | undefined;
  private readonly resetsAt: string | undefined;

  private constructor(kind: ChatTransportErrorKind, detail: ChatTransportErrorDetail) {
    super({
      name: 'ChatTransportError',
      kind,
      message: `The assistant request failed (${kind}, status ${detail.status}).`,
      cause: detail.cause,
    });
    this.status = detail.status;
    this.retryAfterSeconds = detail.retryAfterSeconds;
    this.serverMessage = detail.serverMessage;
    this.resetsAt = detail.resetsAt;
  }

  static rateLimited(retryAfterSeconds: number | null): ChatTransportError {
    return new ChatTransportError('rate-limited', { status: 429, retryAfterSeconds });
  }

  static dailyLimit(retryAfterSeconds: number | null, nowMs: number): ChatTransportError {
    return new ChatTransportError('daily-limit', {
      status: 429,
      retryAfterSeconds,
      resetsAt: retryAfterSeconds === null ? undefined : formatResetTime(nowMs, retryAfterSeconds),
    });
  }

  static globalCap(
    serverMessage: string | undefined,
    retryAfterSeconds: number | null,
  ): ChatTransportError {
    return new ChatTransportError('global-cap', { status: 503, retryAfterSeconds, serverMessage });
  }

  static server(
    status: number,
    serverMessage: string | undefined,
    retryAfterSeconds: number | null,
  ): ChatTransportError {
    return new ChatTransportError('server', { status, retryAfterSeconds, serverMessage });
  }

  static network(cause: unknown): ChatTransportError {
    return new ChatTransportError('network', { status: 0, retryAfterSeconds: null, cause });
  }

  static notConfigured(): ChatTransportError {
    return new ChatTransportError('not-configured', { status: 0, retryAfterSeconds: null });
  }

  userMessage(): string {
    switch (this.kind) {
      case 'not-configured':
        return 'The assistant server is not configured, so the assistant is unavailable in this build.';
      case 'rate-limited': {
        const wait =
          this.retryAfterSeconds === null ? 'a moment' : `${this.retryAfterSeconds} seconds`;
        return `You're asking too fast. Try again in ${wait}.`;
      }
      case 'daily-limit':
        return `You've hit the limit for today (${CHAT_LIMITS.dailyQuestionsPerClient} questions). Resets at ${this.resetsAt ?? 'tomorrow'}.`;
      case 'global-cap':
        return this.serverMessage ?? 'The assistant is busy right now. Please try again later.';
      case 'server':
        return this.serverMessage ?? GENERIC_MESSAGE;
      case 'network':
        return 'Could not reach the assistant. Check your connection. If it keeps failing, the server may not allow this extension yet.';
      default:
        return assertNever(this.kind);
    }
  }
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
    return detail?.code === 'rate_limited'
      ? ChatTransportError.rateLimited(retryAfter)
      : ChatTransportError.dailyLimit(retryAfter, now());
  }
  if (response.status === 503) return ChatTransportError.globalCap(detail?.message, retryAfter);
  return ChatTransportError.server(response.status, detail?.message, retryAfter);
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
  private readonly turn: { steps: number; sawPageText: boolean };

  constructor(options: BscfChatTransportOptions) {
    const doFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
    const now = options.now ?? Date.now;
    const version = options.extensionVersion ?? EXTENSION_VERSION;
    const inFlight = new Set<AbortController>();
    const turn = { steps: 0, sawPageText: false };

    const guardedFetch: typeof globalThis.fetch = async (input, init) => {
      const controller = new AbortController();
      inFlight.add(controller);
      const outer = init?.signal;
      const forward = () => controller.abort();
      const settle = () => {
        inFlight.delete(controller);
        outer?.removeEventListener('abort', forward);
      };
      if (outer?.aborted) controller.abort();
      else outer?.addEventListener('abort', forward, { once: true });
      try {
        const response = await doFetch(input, { ...init, signal: controller.signal });
        if (!response.ok) throw await mapChatErrorResponse(response, now);
        if (!response.body) {
          settle();
          return response;
        }
        const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
        response.body
          .pipeTo(writable)
          .catch(() => undefined)
          .finally(settle);
        return new Response(readable, response);
      } catch (error) {
        settle();
        if (isAppError(error) || controller.signal.aborted) throw error;
        throw ChatTransportError.network(error);
      }
    };

    super({
      api: `${options.serverUrl}/v1/chat`,
      credentials: 'omit',
      fetch: guardedFetch,
      prepareSendMessagesRequest: async ({ messages }) => {
        const page = options.getPageRequest();
        const tools = page.promptId === undefined ? await getToolDeclarations() : [];
        if (messages.at(-1)?.role === 'assistant') {
          turn.steps += 1;
        } else {
          turn.steps = 1;
          turn.sawPageText = false;
        }
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

  isUserInitiated(): boolean {
    return this.turn.steps === 1 && !this.turn.sawPageText;
  }

  markPageText(): void {
    this.turn.sawPageText = true;
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

export type ToolDecision = 'pending' | 'allowed';

export interface BscfChat {
  chat: Chat<UIMessage>;
  transport: BscfChatTransport;
  decisions: ReadonlyMap<string, ToolDecision>;
  decide: (toolCallId: string, decision: 'allow' | 'deny') => void;
  expire: () => Promise<void>;
  close: () => void;
}

interface HeldCall {
  toolName: string;
  input: unknown;
  decision: ToolDecision;
}

function errorText(error: ToolError): string {
  const { error: kind, message } = error.toToolResult();
  return `${kind}: ${message}`;
}

export function createBscfChat(options: BscfChatTransportOptions): BscfChat {
  const transport = new BscfChatTransport(options);
  const controller = new AbortController();
  const held = new Map<string, HeldCall>();
  const decisions = new Map<string, ToolDecision>();
  let isExpiring = false;

  const refuse = async (toolName: string, toolCallId: string, error: ToolError): Promise<void> =>
    chat.addToolOutput({
      state: 'output-error',
      tool: toolName,
      toolCallId,
      errorText: errorText(error),
    });

  const answer = async (toolName: string, toolCallId: string, input: unknown): Promise<void> => {
    const outcome = await runTool(toolName, input, controller.signal);
    if (controller.signal.aborted) return;
    if (toolName === 'read_page') transport.markPageText();
    if (outcome.ok) {
      void chat.addToolOutput({ tool: toolName, toolCallId, output: outcome.output });
    } else {
      void refuse(toolName, toolCallId, outcome.error);
    }
  };

  const forget = (toolCallId: string): void => {
    held.delete(toolCallId);
    decisions.delete(toolCallId);
  };

  const chat = new Chat<UIMessage>({
    transport,
    onToolCall: ({ toolCall }) => {
      const { toolName, toolCallId, input } = toolCall;
      if (gateFor(toolName, input, transport.isUserInitiated()) === 'run') {
        void answer(toolName, toolCallId, input);
        return;
      }
      held.set(toolCallId, { toolName, input, decision: 'pending' });
      decisions.set(toolCallId, 'pending');
    },
    sendAutomaticallyWhen: ({ messages }) =>
      !controller.signal.aborted &&
      !isExpiring &&
      transport.canContinue() &&
      lastAssistantMessageIsCompleteWithToolCalls({ messages }),
  });

  return {
    chat,
    transport,
    decisions,
    decide: (toolCallId, decision) => {
      const call = held.get(toolCallId);
      if (call?.decision !== 'pending' || controller.signal.aborted) return;
      if (decision === 'deny') {
        forget(toolCallId);
        void refuse(call.toolName, toolCallId, ToolError.denied());
        return;
      }
      call.decision = 'allowed';
      decisions.set(toolCallId, 'allowed');
      void answer(call.toolName, toolCallId, call.input).finally(() => forget(toolCallId));
    },
    expire: async () => {
      const stale = [...held].filter(([, call]) => call.decision === 'pending');
      if (stale.length === 0) return;
      isExpiring = true;
      try {
        await Promise.all(
          stale.map(([toolCallId, call]) => {
            forget(toolCallId);
            return refuse(call.toolName, toolCallId, ToolError.expired());
          }),
        );
      } finally {
        isExpiring = false;
      }
    },
    close: () => {
      controller.abort();
      held.clear();
      decisions.clear();
      transport.close();
      void chat.stop();
    },
  };
}
