import { type ChatTransport, DefaultChatTransport, type UIMessage } from 'ai';
import {
  CHAT_LIMITS,
  type ChatRequest,
  type ChatRequestMessage,
  EXTENSION_VERSION,
  type ProposalContext,
  parseChatError,
} from 'shared';

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
  return new Date(nowMs + retryAfterSeconds * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
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

function messageText(message: UIMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim();
}

function toRequestMessages(messages: readonly UIMessage[]): ChatRequestMessage[] {
  const turns: ChatRequestMessage[] = [];
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const text = messageText(message);
    if (text === '') continue;
    const max =
      message.role === 'user'
        ? CHAT_LIMITS.maxUserMessageChars
        : CHAT_LIMITS.maxAssistantMessageChars;
    turns.push({ role: message.role, content: text.slice(0, max) });
  }
  const recent = turns.slice(-CHAT_LIMITS.maxMessages);
  const firstUser = recent.findIndex((turn) => turn.role === 'user');
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

export class BscfChatTransport extends DefaultChatTransport<UIMessage> {
  private readonly inFlight: Set<AbortController>;

  constructor(options: BscfChatTransportOptions) {
    const doFetch = options.fetch ?? ((...args) => globalThis.fetch(...args));
    const now = options.now ?? Date.now;
    const version = options.extensionVersion ?? EXTENSION_VERSION;
    const inFlight = new Set<AbortController>();

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
        const body: ChatRequest = {
          submissionId: page.submissionId,
          contentHash: page.contentHash,
          page: page.page,
          context: page.context,
          messages: toRequestMessages(messages),
          ...(page.promptId === undefined ? {} : { promptId: page.promptId }),
        };
        return {
          body,
          headers: {
            'X-BSCF-Client': await options.getClientId(),
            'X-BSCF-Version': version,
          },
        };
      },
    });
    this.inFlight = inFlight;
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
