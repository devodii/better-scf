import { z } from 'zod';
import { CHAT_LIMITS } from './constants';
import { type ParseResult, parseWith, proposalContextSchema } from './models';

const nonBlank = (value: string): boolean => value.trim().length > 0;
const NON_BLANK_MESSAGE = 'content must not be empty or whitespace-only';

export const chatRequestMessageSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('user'),
    content: z.string().max(CHAT_LIMITS.maxUserMessageChars).refine(nonBlank, NON_BLANK_MESSAGE),
  }),
  z.object({
    role: z.literal('assistant'),
    content: z
      .string()
      .max(CHAT_LIMITS.maxAssistantMessageChars)
      .refine(nonBlank, NON_BLANK_MESSAGE),
  }),
]);
export type ChatRequestMessage = z.infer<typeof chatRequestMessageSchema>;

export const chatRequestSchema = proposalContextSchema.extend({
  messages: z.array(chatRequestMessageSchema).min(1).max(CHAT_LIMITS.maxMessages),
  // Shape only: the server must check findQuickPrompt(promptId).text equals the last user message before using promptId as a cache key.
  promptId: z.string().min(1).max(CHAT_LIMITS.maxPromptIdChars).optional(),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

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
