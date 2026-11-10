import { createAnthropic } from "@ai-sdk/anthropic";
import {
  convertToModelMessages,
  type JSONSchema7,
  jsonSchema,
  type LanguageModel,
  stepCountIs,
  streamText,
  type ToolSet,
  tool,
} from "ai";
import dayjs from "dayjs";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  CHAT_LIMITS,
  type ChatRequest,
  type ChatRequestMessage,
  chatError,
  chatRequestSchema,
  messageText,
  SERVER_TOOL_NAMES,
} from "shared";
import {
  buildContextBlock,
  promptMatches,
  SYSTEM_PROMPT,
} from "../ai/prompts.js";
import { createStellarlightTools } from "../ai/stellarlight.js";
import type { Env } from "../env.js";
import type { ClientVariables } from "../middleware/client.js";

const MAX_OUTPUT_TOKENS = 1500;
const TEMPERATURE = 0.2;

export interface ChatLogEntry {
  ts: string;
  clientId: string;
  submissionId: string;
  promptId: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ChatRouteDeps {
  getModel: () => LanguageModel;
  log: (entry: ChatLogEntry) => void;
  now?: () => number;
}

export function createModelFactory(
  env: Pick<Env, "ANTHROPIC_API_KEY" | "MODEL">,
) {
  let provider: ReturnType<typeof createAnthropic> | undefined;
  return (): LanguageModel => {
    if (env.ANTHROPIC_API_KEY === undefined) {
      throw new Error("model is not configured");
    }
    provider ??= createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
    return provider(env.MODEL);
  };
}

export function logChatEntry(entry: ChatLogEntry): void {
  console.log(JSON.stringify({ event: "chat", ...entry }));
}

type ChatContext = Context<{ Variables: ClientVariables }>;

function badRequest(c: ChatContext, status: 400 | 413 = 400): Response {
  const message =
    status === 413 ? "The request is too large." : "The request is not valid.";
  return c.json(chatError("bad_request", message), status);
}

async function parseBody(c: ChatContext): Promise<ChatRequest | undefined> {
  const raw: unknown = await c.req.json().catch(() => undefined);
  const parsed = chatRequestSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

function hasToolResult(message: ChatRequestMessage): boolean {
  return (
    message.role === "assistant" &&
    message.parts.some(
      (part) =>
        "state" in part &&
        (part.state === "output-available" || part.state === "output-error"),
    )
  );
}

function lastUserText(
  messages: readonly ChatRequestMessage[],
): string | undefined {
  const lastUser = messages.findLast((message) => message.role === "user");
  return lastUser === undefined ? undefined : messageText(lastUser);
}

function declaredTools(body: ChatRequest): ToolSet | undefined {
  if (body.tools === undefined || body.tools.length === 0) return undefined;
  const reserved: readonly string[] = SERVER_TOOL_NAMES;
  return Object.fromEntries(
    body.tools
      .filter((declared) => !reserved.includes(declared.name))
      .map((declared) => [
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
  const requestOrigin = c.req.header("origin");
  return requestOrigin === undefined
    ? {}
    : { "Access-Control-Allow-Origin": requestOrigin, Vary: "Origin" };
}

const MAX_LOGGED_MESSAGE = 240;

function describeModelError(error: unknown): string {
  if (!(error instanceof Error)) return "chat model error: unknown";
  const status =
    "statusCode" in error && typeof error.statusCode === "number"
      ? error.statusCode
      : null;
  const message = error.message
    .replace(/sk-[A-Za-z0-9_-]+/g, "[key]")
    .slice(0, MAX_LOGGED_MESSAGE);
  return `chat model error: ${error.name}${status === null ? "" : ` ${status}`}: ${message}`;
}

export function createChatRoute(deps: ChatRouteDeps) {
  const now = deps.now ?? Date.now;
  const record = (
    clientId: string,
    body: ChatRequest,
    usage: { inputTokens: number; outputTokens: number },
  ): void => {
    deps.log({
      ts: dayjs(now()).toISOString(),
      clientId,
      submissionId: body.submissionId,
      promptId: body.promptId ?? "free",
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    });
  };

  const stellarlight = createStellarlightTools();
  const route = new Hono<{ Variables: ClientVariables }>();

  route.post(
    "/",
    bodyLimit({
      maxSize: CHAT_LIMITS.maxRequestBytes,
      onError: (c) => badRequest(c, 413),
    }),
    async (c) => {
      const body = await parseBody(c);
      const last = body?.messages[body.messages.length - 1];
      if (body === undefined || last === undefined) return badRequest(c);
      const userText = lastUserText(body.messages);
      const clientTools = declaredTools(body);
      if (
        userText === undefined ||
        (last.role !== "user" &&
          (clientTools === undefined || !hasToolResult(last)))
      ) {
        return badRequest(c);
      }
      if (!promptMatches(body.promptId, userText)) {
        return badRequest(c);
      }

      const tools = { ...clientTools, ...stellarlight };
      const clientId = c.get("clientId");
      const result = streamText({
        model: deps.getModel(),
        instructions: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "system",
            content: buildContextBlock(body.context, body.page),
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
        ],
        messages: await convertToModelMessages(body.messages, {
          tools,
          ignoreIncompleteToolCalls: true,
        }),
        tools,
        stopWhen: stepCountIs(CHAT_LIMITS.maxSteps),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        abortSignal: c.req.raw.signal,
        onError: ({ error }) => {
          console.error(describeModelError(error));
        },
        onEnd: (event) => {
          record(clientId, body, {
            inputTokens: event.totalUsage.inputTokens ?? 0,
            outputTokens: event.totalUsage.outputTokens ?? 0,
          });
        },
      });

      return result.toUIMessageStreamResponse({
        headers: corsHeaders(c),
        onError: () => "model_error",
      });
    },
  );

  return route;
}
