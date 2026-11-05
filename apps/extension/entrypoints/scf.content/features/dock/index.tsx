import type { UIMessage } from 'ai';
import dayjs from 'dayjs';
import { type ChatMessage, quickPromptsFor } from 'shared';
import { Dock } from '../../../../components/Dock';
import type { DockHistoryItem } from '../../../../components/DockHistory';
import type { DockPromptItem } from '../../../../components/DockPrompts';
import { detectPageKind } from '../../../../lib/ai/context';
import { type BscfChat, type ChatPageRequest, createBscfChat } from '../../../../lib/ai/transport';
import { isAppError } from '../../../../lib/errors';
import type { Feature, FeatureContext } from '../../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../../lib/ui/mount';
import dockCss from '../../styles/dock.scss?inline';
import { createRequestSource } from './request';
import {
  placeholderFor,
  SITE_THREAD,
  storedText,
  subjectOf,
  toItems,
  toolIsReady,
  toUiMessage,
} from './thread';

const DEFAULT_SERVER_URL = 'http://localhost:8787';
const GENERIC_ERROR = 'Something went wrong while asking. Please try again.';
const RENDER_THROTTLE_MS = 50;
const HISTORY_LIMIT = 30;
const SLOT = 'dock-slot';

const NO_PAGE: ChatPageRequest = {
  submissionId: 'page:/',
  contentHash: 'none',
  page: 'other',
  context: '',
};

function afterHydration(signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const onAbort = (): void => resolve(false);
    const ready = (): void => {
      requestAnimationFrame(() => {
        signal.removeEventListener('abort', onAbort);
        resolve(!signal.aborted);
      });
    };
    signal.addEventListener('abort', onAbort, { once: true });
    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready, { once: true });
  });
}

async function mountDock(context: FeatureContext): Promise<() => void> {
  const { page, settings, store, signal, warn } = context;
  const threadKey = page.kind === 'submission' ? page.submissionId : SITE_THREAD;
  const subject = subjectOf(page);
  const nextRequest = createRequestSource(page);
  const serverUrl =
    settings.serverUrlOverride || import.meta.env.WXT_SERVER_URL || DEFAULT_SERVER_URL;

  const rows = await store.send('listChat', threadKey).catch((error: unknown) => {
    warn('read thread', error);
    return [];
  });
  if (signal.aborted) return () => {};

  let restored: UIMessage[] = rows.map(toUiMessage);
  const stored = new Map<string, ChatMessage>(rows.map((row) => [row.id, row]));
  let lastStamp = rows.at(-1)?.createdAt ?? 0;
  let value = '';
  let isExpanded = false;
  let isHistoryOpen = false;
  let historyItems: DockHistoryItem[] = [];
  let seenPath = location.pathname;
  let pageRequest = NO_PAGE;
  let session: BscfChat | null = null;
  let detach: (() => void)[] = [];
  let starting = false;
  let closed = false;
  let ui: MountedUi | null = null;

  const isBusy = (): boolean =>
    session?.chat.status === 'submitted' || session?.chat.status === 'streaming';

  const errorText = (): string | undefined => {
    const error = session?.chat.error;
    if (!error) return undefined;
    return isAppError(error) ? error.userMessage() : GENERIC_ERROR;
  };

  const persist = (message: UIMessage, promptId?: string): void => {
    if (message.role !== 'user' && message.role !== 'assistant') return;
    const content = storedText(message);
    if (content === '') return;
    const before = stored.get(message.id);
    if (before?.content === content) return;
    lastStamp = Math.max(Date.now(), lastStamp + 1);
    const row: ChatMessage = {
      id: message.id,
      submissionId: threadKey,
      role: message.role,
      content,
      createdAt: before?.createdAt ?? lastStamp,
      ...(promptId === undefined ? {} : { promptId }),
    };
    stored.set(row.id, row);
    store.send('putChatMessage', row).catch((error: unknown) => warn('save message', error));
  };

  const persistLast = (): void => {
    const last = session?.chat.messages.at(-1);
    if (last?.role === 'assistant') persist(last);
  };

  const view = () => {
    const kind = detectPageKind(location.pathname);
    const busy = isBusy();
    return (
      <Dock
        value={value}
        onValueChange={(next) => {
          value = next;
          render();
        }}
        onSubmit={() => void submit(value)}
        placeholder={placeholderFor(kind, subject)}
        status={busy ? 'streaming' : 'idle'}
        isExpanded={isExpanded}
        onExpandedChange={(next) => {
          isExpanded = next;
          if (!next) isHistoryOpen = false;
          render();
        }}
        isHistoryOpen={isHistoryOpen}
        onHistoryOpenChange={(next) => {
          isHistoryOpen = next;
          render();
          if (next) void loadHistory();
        }}
        messages={toItems(session?.chat.messages ?? restored, busy)}
        error={errorText()}
        prompts={quickPromptsFor(kind)}
        onPromptSelect={(prompt) => void submit(prompt.text, prompt)}
        historyItems={historyItems}
        onHistorySelect={(item) => {
          value = item.text;
          isHistoryOpen = false;
          render();
        }}
        onHistoryClear={clear}
      />
    );
  };

  function render(): void {
    if (!closed) ui?.render(view());
  }

  async function loadHistory(): Promise<void> {
    const keys = threadKey === SITE_THREAD ? [SITE_THREAD] : [threadKey, SITE_THREAD];
    const lists = await Promise.all(
      keys.map((key) =>
        store.send('listChat', key).catch((error: unknown) => {
          warn('read history', error);
          return [];
        }),
      ),
    );
    if (closed) return;
    historyItems = lists
      .flatMap((list, index) =>
        list
          .filter((row) => row.role === 'user')
          .map((row) => ({
            at: row.createdAt,
            item: {
              id: row.id,
              text: row.content,
              meta: `${index === 0 && keys.length > 1 ? 'This submission' : 'Site'} · ${dayjs(row.createdAt).format('D MMM HH:mm')}`,
            },
          })),
      )
      .sort((a, b) => b.at - a.at)
      .slice(0, HISTORY_LIMIT)
      .map(({ item }) => item);
    render();
  }

  function dropSession(): void {
    for (const off of detach) off();
    detach = [];
    session?.close();
    session = null;
  }

  function clear(): void {
    dropSession();
    restored = [];
    stored.clear();
    historyItems = [];
    isHistoryOpen = false;
    store.send('clearChat', threadKey).catch((error: unknown) => warn('clear thread', error));
    render();
  }

  function onMessages(): void {
    const last = session?.chat.messages.at(-1);
    if (last?.role === 'assistant' && toolIsReady(last)) persist(last);
  }

  function onStatus(): void {
    if (closed) return;
    if (session?.chat.status === 'ready') persistLast();
    render();
  }

  function ensureSession(): BscfChat {
    if (session) return session;
    const created = createBscfChat({
      serverUrl,
      getClientId: () => store.send('getClientId', undefined),
      getPageRequest: () => pageRequest,
    });
    created.chat.messages = restored;
    detach = [
      created.chat['~registerMessagesCallback'](onMessages),
      created.chat['~registerMessagesCallback'](render, RENDER_THROTTLE_MS),
      created.chat['~registerStatusCallback'](onStatus),
      created.chat['~registerErrorCallback'](render),
    ];
    session = created;
    return created;
  }

  async function submit(text: string, prompt?: DockPromptItem): Promise<void> {
    const question = text.trim();
    if (question === '' || starting || isBusy() || closed) return;
    starting = true;
    value = '';
    isExpanded = true;
    isHistoryOpen = false;
    render();
    try {
      const source = await nextRequest();
      if (closed) return;
      const promptId = prompt && source.cacheable ? prompt.id : undefined;
      pageRequest = { ...source.request, ...(promptId === undefined ? {} : { promptId }) };
      const active = ensureSession();
      const sending = active.chat.sendMessage({
        id: crypto.randomUUID(),
        parts: [{ type: 'text', text: question }],
      });
      const sent = active.chat.messages.at(-1);
      if (sent) persist(sent, promptId);
      starting = false;
      await sending;
    } catch (error) {
      if (!closed) {
        warn('send', error);
        value = question;
        render();
      }
    } finally {
      starting = false;
    }
  }

  const style = document.createElement('style');
  style.setAttribute(OWN_ATTRIBUTE, 'dock');
  style.textContent = dockCss;
  (document.head ?? document.documentElement).append(style);

  const slot = document.createElement('div');
  slot.setAttribute(OWN_ATTRIBUTE, SLOT);
  document.body.append(slot);

  const handle = await context.mount({ anchor: slot, children: view() });
  if (!handle) {
    slot.remove();
    style.remove();
    return () => {};
  }
  ui = handle;

  context.onMutation(() => {
    if (location.pathname === seenPath) return;
    seenPath = location.pathname;
    render();
  });

  return () => {
    closed = true;
    persistLast();
    dropSession();
    ui?.remove();
    slot.remove();
    style.remove();
  };
}

export const feature: Feature = {
  pages: ['roundList', 'round', 'submission', 'myProjects', 'other'],
  toggles: ['aiDock'],
  async mount(context) {
    if (!(await afterHydration(context.signal))) return;
    return mountDock(context);
  },
};
