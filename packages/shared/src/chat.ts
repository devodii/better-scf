import { z } from 'zod';
import { CHAT_LIMITS, TOOL_NAME_PATTERN } from './constants';
import { type ParseResult, parseWith, proposalContextSchema } from './models';

const jsonLength = (value: unknown): number =>
  typeof value === 'string' ? value.length : (JSON.stringify(value) ?? '').length;

const boundedJson = (maxChars: number) =>
  z
    .unknown()
    .refine((value) => jsonLength(value) <= maxChars, `must be at most ${maxChars} characters`);

const toolIdSchema = z.string().min(1).max(CHAT_LIMITS.maxIdChars);
export const toolNameSchema = z.string().regex(TOOL_NAME_PATTERN);

export const chatToolDeclarationSchema = z.object({
  name: toolNameSchema,
  description: z.string().max(CHAT_LIMITS.maxToolDescriptionChars),
  inputSchema: z
    .looseObject({ type: z.literal('object') })
    .refine(
      (value) => jsonLength(value) <= CHAT_LIMITS.maxToolSchemaChars,
      `must be at most ${CHAT_LIMITS.maxToolSchemaChars} characters`,
    ),
});
export type ChatToolDeclaration = z.infer<typeof chatToolDeclarationSchema>;

const textPartSchema = (maxChars: number) =>
  z.object({ type: z.literal('text'), text: z.string().max(maxChars) });

const stepStartPartSchema = z.object({ type: z.literal('step-start') });

const toolInvocationSchema = z.intersection(
  z.object({ toolCallId: toolIdSchema }),
  z.discriminatedUnion('state', [
    z.object({
      state: z.literal('input-available'),
      input: boundedJson(CHAT_LIMITS.maxToolInputChars),
    }),
    z.object({
      state: z.literal('output-available'),
      input: boundedJson(CHAT_LIMITS.maxToolInputChars),
      output: boundedJson(CHAT_LIMITS.maxToolResultChars),
    }),
    z.object({
      state: z.literal('output-error'),
      input: boundedJson(CHAT_LIMITS.maxToolInputChars),
      errorText: z.string().max(CHAT_LIMITS.maxToolErrorChars),
    }),
  ]),
);

const toolPartSchema = z.intersection(
  z.object({
    type: z.custom<`tool-${string}`>(
      (value) =>
        typeof value === 'string' &&
        value.startsWith('tool-') &&
        TOOL_NAME_PATTERN.test(value.slice(5)),
    ),
  }),
  toolInvocationSchema,
);

const dynamicToolPartSchema = z.intersection(
  z.object({ type: z.literal('dynamic-tool'), toolName: toolNameSchema }),
  toolInvocationSchema,
);

export const chatRequestMessageSchema = z.discriminatedUnion('role', [
  z.object({
    id: toolIdSchema,
    role: z.literal('user'),
    parts: z
      .array(textPartSchema(CHAT_LIMITS.maxUserMessageChars))
      .min(1)
      .max(CHAT_LIMITS.maxPartsPerMessage)
      .refine((parts) => parts.some((part) => part.text.trim().length > 0), {
        message: 'text must not be empty or whitespace-only',
      })
      .refine(
        (parts) =>
          parts.reduce((sum, part) => sum + part.text.length, 0) <= CHAT_LIMITS.maxUserMessageChars,
        `text must be at most ${CHAT_LIMITS.maxUserMessageChars} characters in total`,
      ),
  }),
  z.object({
    id: toolIdSchema,
    role: z.literal('assistant'),
    parts: z
      .array(
        z.union([
          textPartSchema(CHAT_LIMITS.maxAssistantMessageChars),
          stepStartPartSchema,
          toolPartSchema,
          dynamicToolPartSchema,
        ]),
      )
      .min(1)
      .max(CHAT_LIMITS.maxPartsPerMessage)
      .refine(
        (parts) =>
          parts.reduce((sum, part) => (part.type === 'text' ? sum + part.text.length : sum), 0) <=
          CHAT_LIMITS.maxAssistantMessageChars,
        `text must be at most ${CHAT_LIMITS.maxAssistantMessageChars} characters in total`,
      ),
  }),
]);
export type ChatRequestMessage = z.infer<typeof chatRequestMessageSchema>;

export const chatRequestSchema = proposalContextSchema.extend({
  messages: z.array(chatRequestMessageSchema).min(1).max(CHAT_LIMITS.maxMessages),
  // Shape only: the server must check findQuickPrompt(promptId).text equals the last user message before using promptId as a cache key.
  promptId: z.string().min(1).max(CHAT_LIMITS.maxPromptIdChars).optional(),
  tools: z
    .array(chatToolDeclarationSchema)
    .max(CHAT_LIMITS.maxTools)
    .refine((tools) => new Set(tools.map((tool) => tool.name)).size === tools.length, {
      message: 'tool names must be unique',
    })
    .optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export function messageText(message: ChatRequestMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

export const chatErrorCodeSchema = z.enum([
  'bad_request',
  'forbidden_origin',
  'missing_client',
  'rate_limited',
  'daily_limit',
  'global_cap',
  'internal',
]);
export type ChatErrorCode = z.infer<typeof chatErrorCodeSchema>;

export const chatErrorSchema = z.object({
  error: z.object({
    code: chatErrorCodeSchema,
    message: z.string(),
    retryAfterSeconds: z.number().int().nonnegative().optional(),
  }),
});
export type ChatError = z.infer<typeof chatErrorSchema>;

export const healthResponseSchema = z.object({
  ok: z.boolean(),
  version: z.string(),
  model: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const parseChatRequest = (input: unknown): ParseResult<ChatRequest> =>
  parseWith(chatRequestSchema, input);
export const parseChatError = (input: unknown): ParseResult<ChatError> =>
  parseWith(chatErrorSchema, input);

export function chatError(
  code: ChatErrorCode,
  message: string,
  retryAfterSeconds?: number,
): ChatError {
  return {
    error:
      retryAfterSeconds === undefined ? { code, message } : { code, message, retryAfterSeconds },
  };
}
