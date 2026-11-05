import { createHash } from 'node:crypto';
import { createAnthropic } from '@ai-sdk/anthropic';
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type JSONSchema7,
  jsonSchema,
  type LanguageModel,
  stepCountIs,
  streamText,
  type ToolSet,
  tool,
} from 'ai';
import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import {
  CHAT_LIMITS,
  type ChatErrorCode,
  type ChatRequest,
  type ChatRequestMessage,
  chatError,
  chatRequestSchema,
  messageText,
} from 'shared';
import { z } from 'zod';
import { type AnswerCache, cacheKey } from '../ai/cache.js';
import { buildContextBlock, promptMatches, SYSTEM_PROMPT } from '../ai/prompts.js';
import type { Env } from '../env.js';
import type { ClientVariables } from '../middleware/client.js';

const MAX_OUTPUT_TOKENS = 900;
const TEMPERATURE = 0.2;
const BURST_WINDOW_SECONDS = 60;

export interface ChatLogEntry {
  ts: string;
  clientId: string;
  submissionId: string;
  promptId: string;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
}

export interface ChatRouteDeps {
  getModel: () => LanguageModel;
  cache: AnswerCache;
  log: (entry: ChatLogEntry) => void;
  now?: () => number;
}

export function createModelFactory(env: Pick<Env, 'ANTHROPIC_API_KEY' | 'MODEL'>) {
  let provider: ReturnType<typeof createAnthropic> | undefined;
  return (): LanguageModel => {
    if (env.ANTHROPIC_API_KEY === undefined) {
      throw new Error('model is not configured');
    }
    provider ??= createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return provider(env.MODEL);
  };
}

export function logChatEntry(entry: ChatLogEntry): void {
  console.log(JSON.stringify({ event: 'chat', ...entry }));
}

type ChatContext = Context<{ Variables: ClientVariables }>;

function badRequest(c: ChatContext, status: 400 | 413 = 400): Response {
  const message = status === 413 ? 'The request is too large.' : 'The request is not valid.';
  return c.json(chatError('bad_request', message), status);
}

async function parseBody(c: ChatContext): Promise<ChatRequest | undefined> {
  const raw: unknown = await c.req.json().catch(() => undefined);
  const parsed = chatRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function hasToolResult(message: ChatRequestMessage): boolean {
  return (
    message.role === 'assistant' &&
    message.parts.some(
      (part) =>
        'state' in part && (part.state === 'output-available' || part.state === 'output-error'),
    )
  );
}

function lastUserText(messages: readonly ChatRequestMessage[]): string | undefined {
  const lastUser = messages.findLast((message) => message.role === 'user');
  return lastUser === undefined ? undefined : messageText(lastUser);
}

function declaredTools(body: ChatRequest): ToolSet | undefined {
  if (body.tools === undefined || body.tools.length === 0) return undefined;
  return Object.fromEntries(
    body.tools.map((declared) => [
      declared.name,
      tool({
        description: declared.description,
        inputSchema: jsonSchema(declared.inputSchema as JSONSchema7),
      }),
    ]),
  );
}

// Hono drops headers set with c.header when a handler returns a raw Response.
function corsHeaders(c: ChatContext): Record<string, string> {
  const requestOrigin = c.req.header('origin');
  return requestOrigin === undefined
    ? {}
    : { 'Access-Control-Allow-Origin': requestOrigin, Vary: 'Origin' };
}

function streamCachedAnswer(answer: string, headers: Record<string, string>): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'text-start', id: 'cached' });
      writer.write({ type: 'text-delta', id: 'cached', delta: answer });
      writer.write({ type: 'text-end', id: 'cached' });
    },
  });
  return createUIMessageStreamResponse({ stream, headers });
}

export function createChatRoute(deps: ChatRouteDeps) {
  const now = deps.now ?? Date.now;
  const record = (
    clientId: string,
    body: ChatRequest,
    usage: { inputTokens: number; outputTokens: number },
    cacheHit: boolean,
  ): void => {
    deps.log({
      ts: new Date(now()).toISOString(),
      clientId,
      submissionId: body.submissionId,
      promptId: body.promptId ?? 'free',
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheHit,
    });
  };

  const route = new Hono<{ Variables: ClientVariables }>();

  route.post(
    '/',
    bodyLimit({ maxSize: CHAT_LIMITS.maxRequestBytes, onError: (c) => badRequest(c, 413) }),
    async (c) => {
      const body = await parseBody(c);
      const last = body?.messages[body.messages.length - 1];
      if (body === undefined || last === undefined) return badRequest(c);
      const userText = lastUserText(body.messages);
      const tools = declaredTools(body);
      if (
        userText === undefined ||
        (last.role !== 'user' && (tools === undefined || !hasToolResult(last)))
      ) {
        return badRequest(c);
      }
      if (!promptMatches(body.promptId, userText)) {
        return badRequest(c);
      }

      const clientId = c.get('clientId');
      const key =
        body.promptId !== undefined && body.messages.length === 1 && tools === undefined
          ? cacheKey({
              submissionId: body.submissionId,
              contentHash: createHash('sha256')
                .update(JSON.stringify([body.contentHash, body.page, body.context]))
                .digest('hex'),
              promptId: body.promptId,
            })
          : undefined;

      if (key !== undefined) {
        const hit = deps.cache.get(key);
        if (hit !== undefined) {
          record(clientId, body, { inputTokens: 0, outputTokens: 0 }, true);
          return streamCachedAnswer(hit, corsHeaders(c));
        }
      }

      const result = streamText({
        model: deps.getModel(),
        instructions: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'system',
            content: buildContextBlock(body.context, body.page),
            providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
          },
        ],
        messages: await convertToModelMessages(body.messages, {
          ...(tools === undefined ? {} : { tools }),
          ignoreIncompleteToolCalls: true,
        }),
        ...(tools === undefined ? {} : { tools, stopWhen: stepCountIs(CHAT_LIMITS.maxSteps) }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        abortSignal: c.req.raw.signal,
        onError: ({ error }) => {
          console.error(`chat model error: ${error instanceof Error ? error.name : 'unknown'}`);
        },
        onEnd: (event) => {
          record(
            clientId,
            body,
            {
              inputTokens: event.totalUsage.inputTokens ?? 0,
              outputTokens: event.totalUsage.outputTokens ?? 0,
            },
            false,
          );
          if (key !== undefined && event.finishReason === 'stop' && event.text.length > 0) {
            deps.cache.set(key, event.text);
          }
        },
      });

      return result.toUIMessageStreamResponse({
        headers: corsHeaders(c),
        onError: () => 'model_error',
      });
    },
  );

  return route;
}

const legacyErrorSchema = z.object({
  error: z.string(),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
});

function mapLegacyError(
  legacy: z.infer<typeof legacyErrorSchema>,
): { code: ChatErrorCode; message: string } | undefined {
  switch (legacy.error) {
    case 'forbidden_origin':
      return { code: 'forbidden_origin', message: 'This origin is not allowed.' };
    case 'invalid_client':
      return { code: 'missing_client', message: 'A valid client id is required.' };
    case 'internal_error':
      return { code: 'internal', message: 'Something went wrong. Please try again.' };
    case 'service_busy':
      return {
        code: 'global_cap',
        message: 'The assistant has reached its daily capacity. Please try again later.',
      };
    case 'rate_limited':
      return (legacy.retryAfterSeconds ?? 0) > BURST_WINDOW_SECONDS
        ? { code: 'daily_limit', message: 'You have reached the daily question limit.' }
        : {
            code: 'rate_limited',
            message: 'You are asking too quickly. Please wait a moment and try again.',
          };
    default:
      return undefined;
  }
}

export const chatErrorShape: MiddlewareHandler = async (c, next) => {
  await next();
  if (c.res.status < 400) return undefined;
  const body = await c.res
    .clone()
    .json()
    .catch(() => undefined);
  const legacy = legacyErrorSchema.safeParse(body);
  if (!legacy.success) return undefined;
  const mapped = mapLegacyError(legacy.data);
  if (mapped === undefined) return undefined;
  c.res = c.json(chatError(mapped.code, mapped.message, legacy.data.retryAfterSeconds), c.res);
  return undefined;
};
