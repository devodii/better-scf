import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import type { ChatMessage, PageKind } from 'shared';
import type { DockMessageItem } from '../../../../components/Dock';
import type { PageData } from '../../../../lib/site/store';

export const SITE_THREAD = 'site';

const CLIP_CHARS = 60;

function clip(text: string): string {
  return text.length > CLIP_CHARS ? `${text.slice(0, CLIP_CHARS)}…` : text;
}

function readString(input: unknown, key: string): string | null {
  if (typeof input !== 'object' || input === null) return null;
  const value: unknown = Reflect.get(input, key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function activityText(name: string, input: unknown): string {
  switch (name) {
    case 'navigate': {
      const target = readString(input, 'target');
      return target ? `Taking you to ${clip(target)}...` : 'Taking you there...';
    }
    case 'backend_get': {
      const endpoint = readString(input, 'endpoint');
      return endpoint
        ? `Looking up ${clip(
            endpoint
              .replace(/[-_/.:]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim(),
          )}...`
        : 'Looking up your data...';
    }
    case 'search_projects': {
      const query = readString(input, 'query');
      return query ? `Searching projects for ${clip(query)}...` : 'Searching projects...';
    }
    case 'read_page':
      return 'Reading this page...';
    case 'list_routes':
      return 'Checking the site map...';
    case 'list_endpoints':
      return 'Checking what data is available...';
    default:
      return 'Working on it...';
  }
}

export function runningActivity(message: UIMessage): string | undefined {
  for (let index = message.parts.length - 1; index >= 0; index -= 1) {
    const part = message.parts[index];
    if (
      part &&
      isToolUIPart(part) &&
      (part.state === 'input-streaming' || part.state === 'input-available')
    ) {
      return activityText(getToolName(part), part.input);
    }
  }
  return undefined;
}

export function toolIsReady(message: UIMessage): boolean {
  return message.parts.some((part) => isToolUIPart(part) && part.state === 'input-available');
}

export function messageText(message: UIMessage): string {
  const texts: string[] = [];
  for (const part of message.parts) {
    if (part.type === 'text' && part.text.trim() !== '') texts.push(part.text);
  }
  return texts.join('\n\n');
}

export function storedText(message: UIMessage): string {
  return messageText(message) || runningActivity(message) || '';
}

export function toItems(messages: readonly UIMessage[], isBusy: boolean): DockMessageItem[] {
  const items: DockMessageItem[] = [];
  messages.forEach((message, index) => {
    const isLast = index === messages.length - 1;
    if (message.role === 'user') {
      items.push({ id: message.id, role: 'user', text: messageText(message) });
      return;
    }
    if (message.role !== 'assistant') return;
    const text = messageText(message);
    const activity = isLast && isBusy ? runningActivity(message) : undefined;
    const isStreaming = isLast && isBusy;
    if (text === '' && !activity && !isStreaming) return;
    items.push({ id: message.id, role: 'assistant', text, activity, isStreaming });
  });
  if (isBusy && messages.at(-1)?.role === 'user') {
    items.push({ id: 'pending', role: 'assistant', text: '', isStreaming: true });
  }
  return items;
}

export function toUiMessage(row: ChatMessage): UIMessage {
  return { id: row.id, role: row.role, parts: [{ type: 'text', text: row.content }] };
}

export function subjectOf(page: PageData): string | null {
  if (page.kind === 'submission') return page.page?.submission.title.trim() || null;
  if (page.kind === 'round') return page.roundName;
  return null;
}

export function placeholderFor(kind: PageKind, subject: string | null): string {
  switch (kind) {
    case 'submission':
      return subject ? `Ask about ${clip(subject)}` : 'Ask about this submission';
    case 'round':
      return subject ? `Ask about ${clip(subject)} submissions` : 'Ask about this round';
    case 'rounds':
      return 'Ask about funding rounds';
    case 'dashboard':
      return 'Ask about the SCF dashboard';
    case 'projects':
      return 'Ask about funded projects';
    case 'analytics':
      return 'Ask about funding analytics';
    case 'public':
      return 'Ask about the Stellar Community Fund';
    case 'other':
      return 'Ask about this page';
    default:
      return kind satisfies never;
  }
}
