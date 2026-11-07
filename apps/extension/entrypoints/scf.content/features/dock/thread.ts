import { getToolName, isToolUIPart, type UIMessage } from "ai";
import {
  CHAT_LIMITS,
  type ChatMessage,
  type PageKind,
  type StoredPart,
} from "shared";
import type { AssistantActivityStatus } from "../../../../components/AssistantActivity";
import type {
  AssistantMessageItem,
  AssistantPart,
} from "../../../../components/AssistantMessage";
import type { AssistantNotice } from "../../../../components/AssistantMessages";
import {
  ChatTransportError,
  type ToolDecision,
} from "../../../../lib/ai/transport";
import { assertNever, isAppError } from "../../../../lib/errors";
import type { PageData } from "../../../../lib/site/store";

const CLIP_CHARS = 60;
const DETAIL_CHARS = 120;
const GENERIC_ERROR = "Something went wrong while asking. Please try again.";

function clip(text: string, max = CLIP_CHARS): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function readString(input: unknown, key: string): string | null {
  if (typeof input !== "object" || input === null) return null;
  const value: unknown = Reflect.get(input, key);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function endpointWords(endpoint: string): string {
  return clip(
    endpoint
      .replace(/[-_/.:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function confirmText(name: string, input: unknown): string {
  if (name === "navigate") {
    const target = readString(input, "target");
    return target ? `Take you to ${clip(target)}` : "Take you to another page";
  }
  const endpoint = readString(input, "endpoint");
  return endpoint
    ? `Read your Community Fund data (${endpointWords(endpoint)}) and send it to the assistant`
    : "Read your Community Fund data and send it to the assistant";
}

const STELLARLIGHT_ACTIVITY: Record<string, string> = {
  get_builders: "Searching Stellarlight builders",
  search_projects: "Searching Stellarlight projects",
  search_repos: "Searching Stellarlight repos",
  get_hackathons: "Looking up hackathons on Stellarlight",
  get_audits: "Looking up audits on Stellarlight",
  get_partners: "Looking up partners on Stellarlight",
  vet_idea: "Checking the competition on Stellarlight",
  scf_pitch: "Preparing SCF pitch facts from Stellarlight",
  analyze_ecosystem: "Checking ecosystem totals on Stellarlight",
};

function activityText(name: string, input: unknown): string {
  switch (name) {
    case "navigate": {
      const target = readString(input, "target");
      return target ? `Taking you to ${clip(target)}` : "Taking you there";
    }
    case "backend_get": {
      const endpoint = readString(input, "endpoint");
      return endpoint
        ? `Looking up ${endpointWords(endpoint)}`
        : "Looking up your data";
    }
    case "search_projects": {
      const query = readString(input, "query");
      return query
        ? `Searching projects for ${clip(query)}`
        : "Searching projects";
    }
    case "read_page":
      return "Reading this page";
    case "fetch_page": {
      const path = readString(input, "path");
      return path ? `Reading ${clip(path)}` : "Reading a page";
    }
    case "run_js":
      return "Working out the answer";
    case "read_proposals":
      return "Reading the proposals";
    case "submission_details":
      return "Reading the proposal";
    case "find_builder": {
      const handle = readString(input, "handle") ?? readString(input, "query");
      return handle
        ? `Finding ${clip(handle)} on Stellarlight`
        : "Searching Stellarlight builders";
    }
    case "stellarlight":
      return (
        STELLARLIGHT_ACTIVITY[readString(input, "tool") ?? ""] ??
        "Checking Stellarlight"
      );
    case "list_routes":
      return "Checking the site map";
    case "list_endpoints":
      return "Checking what data is available";
    default:
      return "Working on it";
  }
}

function runningActivity(message: UIMessage): string | undefined {
  for (let index = message.parts.length - 1; index >= 0; index -= 1) {
    const part = message.parts[index];
    if (
      part &&
      isToolUIPart(part) &&
      (part.state === "input-streaming" || part.state === "input-available")
    ) {
      return activityText(getToolName(part), part.input);
    }
  }
  return undefined;
}

export function toolIsReady(message: UIMessage): boolean {
  return message.parts.some(
    (part) => isToolUIPart(part) && part.state === "input-available",
  );
}

function messageText(message: UIMessage): string {
  const texts: string[] = [];
  for (const part of message.parts) {
    if (part.type === "text" && part.text.trim() !== "") texts.push(part.text);
  }
  return texts.join("\n\n");
}

export function storedText(message: UIMessage): string {
  return messageText(message) || runningActivity(message) || "";
}

function boundedOutput(output: unknown): unknown {
  const json = JSON.stringify(output) ?? "";
  return json.length <= CHAT_LIMITS.maxToolResultChars
    ? output
    : json.slice(0, CHAT_LIMITS.maxToolResultChars);
}

function boundedInput(input: unknown): unknown {
  const json = JSON.stringify(input ?? {}) ?? "";
  return json.length <= CHAT_LIMITS.maxToolInputChars ? (input ?? {}) : {};
}

export function storedParts(message: UIMessage): StoredPart[] {
  const parts: StoredPart[] = [];
  for (const part of message.parts) {
    if (part.type === "text") {
      if (part.text.trim() !== "")
        parts.push({ type: "text", text: part.text });
      continue;
    }
    if (!isToolUIPart(part)) continue;
    const base = {
      type: part.type,
      toolCallId: part.toolCallId,
      input: boundedInput(part.input),
      ...(part.type === "dynamic-tool" ? { toolName: getToolName(part) } : {}),
    };
    if (part.state === "output-available")
      parts.push({
        ...base,
        state: "output-available",
        output: boundedOutput(part.output),
      });
    else if (part.state === "output-error")
      parts.push({
        ...base,
        state: "output-error",
        errorText: part.errorText.slice(0, CHAT_LIMITS.maxToolErrorChars),
      });
  }
  return parts;
}

function toolDetail(errorText: string): string {
  const separator = errorText.indexOf(": ");
  return clip(
    separator === -1 ? errorText : errorText.slice(separator + 2),
    DETAIL_CHARS,
  );
}

function refusalOf(errorText: string): "denied" | "expired" | null {
  if (errorText.startsWith("denied:")) return "denied";
  if (errorText.startsWith("expired:")) return "expired";
  return null;
}

function toParts(
  message: UIMessage,
  decisions: ReadonlyMap<string, ToolDecision>,
): AssistantPart[] {
  const parts: AssistantPart[] = [];
  message.parts.forEach((part, index) => {
    const id = `${message.id}:${index}`;
    if (part.type === "text") {
      if (part.text.trim() !== "")
        parts.push({ kind: "text", id, text: part.text });
      return;
    }
    if (!isToolUIPart(part)) return;
    const text = confirmText(getToolName(part), part.input);
    const decision = decisions.get(part.toolCallId);
    if (part.state === "input-available" && decision !== undefined) {
      const status = decision === "allowed" ? "allowed" : "pending";
      parts.push({ kind: "confirm", id: part.toolCallId, text, status });
      return;
    }
    const refusal =
      part.state === "output-error" ? refusalOf(part.errorText) : null;
    if (refusal) {
      parts.push({
        kind: "confirm",
        id: part.toolCallId,
        text,
        status: refusal,
      });
      return;
    }
    let status: AssistantActivityStatus = "running";
    let detail: string | undefined;
    if (part.state === "output-available") status = "done";
    else if (part.state === "output-error") {
      status = "error";
      detail = toolDetail(part.errorText);
    }
    parts.push({
      kind: "activity",
      id: part.toolCallId,
      text: activityText(getToolName(part), part.input),
      status,
      detail,
    });
  });
  return parts;
}

export function toItems(
  messages: readonly UIMessage[],
  isBusy: boolean,
  decisions: ReadonlyMap<string, ToolDecision>,
): AssistantMessageItem[] {
  const items: AssistantMessageItem[] = [];
  messages.forEach((message, index) => {
    const isLast = index === messages.length - 1;
    if (message.role === "user") {
      items.push({
        id: message.id,
        role: "user",
        parts: [
          { kind: "text", id: `${message.id}:0`, text: messageText(message) },
        ],
      });
      return;
    }
    if (message.role !== "assistant") return;
    const parts = toParts(message, decisions);
    const isStreaming = isLast && isBusy;
    if (parts.length === 0 && !isStreaming) return;
    items.push({ id: message.id, role: "assistant", parts, isStreaming });
  });
  if (isBusy && messages.at(-1)?.role === "user") {
    items.push({
      id: "pending",
      role: "assistant",
      parts: [],
      isStreaming: true,
    });
  }
  return items;
}

function toUiPart(part: StoredPart): UIMessage["parts"][number] {
  if (part.type === "text" && "text" in part)
    return { type: "text", text: part.text };
  return part as unknown as UIMessage["parts"][number];
}

export function toUiMessage(row: ChatMessage): UIMessage {
  return {
    id: row.id,
    role: row.role,
    parts:
      row.parts && row.parts.length > 0
        ? row.parts.map(toUiPart)
        : [{ type: "text", text: row.content }],
  };
}

export function describeError(error: Error): AssistantNotice {
  if (error instanceof ChatTransportError) {
    switch (error.kind) {
      case "rate-limited":
      case "daily-limit":
        return { tone: "limit", text: error.userMessage() };
      case "global-cap":
      case "server":
      case "network":
      case "not-configured":
      case "not-allowed":
        return { tone: "error", text: error.userMessage() };
      default:
        return assertNever(error.kind);
    }
  }
  return {
    tone: "error",
    text: isAppError(error) ? error.userMessage() : GENERIC_ERROR,
  };
}

export function subjectOf(page: PageData): string | null {
  if (page.kind === "submission")
    return page.page?.submission.title.trim() || null;
  if (page.kind === "round") return page.roundName;
  return null;
}

export function contextLabelFor(
  kind: PageKind,
  subject: string | null,
): string {
  switch (kind) {
    case "submission":
      return subject ? clip(subject) : "This submission";
    case "round":
      return subject ?? "This round";
    case "rounds":
      return "Funding rounds";
    case "dashboard":
      return "SCF dashboard";
    case "projects":
      return "Funded projects";
    case "analytics":
      return "Funding analytics";
    case "public":
      return "Stellar Community Fund";
    case "other":
      return "This page";
    default:
      return kind satisfies never;
  }
}

export function placeholderFor(kind: PageKind, subject: string | null): string {
  switch (kind) {
    case "submission":
      return subject
        ? `Ask about ${clip(subject)}`
        : "Ask about this submission";
    case "round":
      return subject
        ? `Ask about ${clip(subject)} submissions`
        : "Ask about this round";
    case "rounds":
      return "Ask about funding rounds";
    case "dashboard":
      return "Ask about the SCF dashboard";
    case "projects":
      return "Ask about funded projects";
    case "analytics":
      return "Ask about funding analytics";
    case "public":
      return "Ask about the Stellar Community Fund";
    case "other":
      return "Ask about this page";
    default:
      return kind satisfies never;
  }
}
