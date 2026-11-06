import type { UIMessage } from 'ai';
import dayjs from 'dayjs';
import { CHAT_LIMITS, type ChatMessage, quickPromptsFor } from 'shared';
import { Assistant } from '../../../../components/Assistant';
import type { AssistantHistoryItem } from '../../../../components/AssistantHistory';
import type { AssistantPromptItem } from '../../../../components/AssistantPrompts';
import { detectPageKind } from '../../../../lib/ai/context';
import {
  type BscfChat,
  type ChatPageRequest,
  ChatTransportError,
  createBscfChat,
  type ToolDecision,
} from '../../../../lib/ai/transport';
import type { FeatureContext } from '../../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../../lib/ui/mount';
import dockCss from '../../styles/dock.scss?inline';
import { createPagePush } from './push';
import { createRequestSource } from './request';
import { isToggleShortcut, readOpen, writeOpen } from './state';
import {
  contextLabelFor,
  describeError,
  placeholderFor,
  SITE_THREAD,
  storedText,
  subjectOf,
  toItems,
  toolIsReady,
  toUiMessage,
} from './thread';

const RENDER_THROTTLE_MS = 50;
const NOT_CONFIGURED = describeError(ChatTransportError.notConfigured());
const NO_DECISIONS: ReadonlyMap<string, ToolDecision> = new Map();
const HISTORY_LIMIT = 30;

const NO_PAGE: ChatPageRequest = {
  submissionId: 'page:/',
  contentHash: 'none',
  page: 'other',
  context: '',
};

export function mountPanel(
  context: FeatureContext,
  handle: MountedUi,
  openAfterMount: boolean,
): () => void {
  const { page, settings, store, signal, warn } = context;
  const threadKey = page.kind === 'submission' ? page.submissionId : SITE_THREAD;
  const subject = subjectOf(page);
  const nextRequest = createRequestSource(page);
  const serverUrl = settings.serverUrlOverride || import.meta.env.WXT_SERVER_URL || '';

  if (signal.aborted) return () => {};

  let restored: UIMessage[] = [];
  const stored = new Map<string, ChatMessage>();
  let lastStamp = 0;
  let value = '';
  let isOpen = readOpen();
  let hasUnread = false;
  let isHistoryOpen = false;
  let historyItems: AssistantHistoryItem[] = [];
  let seenPath = location.pathname;
  let pageRequest = NO_PAGE;
  let session: BscfChat | null = null;
  let detach: (() => void)[] = [];
  let starting = false;
  let closed = false;
  let isCleared = false;
  const ui: MountedUi = handle;
  const push = createPagePush();

  const isBusy = (): boolean =>
    session?.chat.status === 'submitted' || session?.chat.status === 'streaming';

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
    const error = session?.chat.error;
    return (
      <Assistant
        isOpen={isOpen}
        onOpenChange={setOpen}
        hasUnread={hasUnread}
        contextLabel={contextLabelFor(kind, subject)}
        value={value}
        onValueChange={(next) => {
          value = next;
          render();
        }}
        onSubmit={() => void submit(value)}
        onStop={() => void session?.chat.stop()}
        placeholder={placeholderFor(kind, subject)}
        maxLength={CHAT_LIMITS.maxUserMessageChars}
        status={busy ? 'streaming' : 'idle'}
        messages={toItems(
          session?.chat.messages ?? restored,
          busy,
          session?.decisions ?? NO_DECISIONS,
        )}
        notice={serverUrl === '' ? NOT_CONFIGURED : error ? describeError(error) : undefined}
        prompts={quickPromptsFor(kind)}
        onPromptSelect={(prompt) => void submit(prompt.text, prompt)}
        onDecision={(id, decision) => {
          session?.decide(id, decision);
          render();
        }}
        isHistoryOpen={isHistoryOpen}
        onHistoryOpenChange={(next) => {
          isHistoryOpen = next;
          render();
          if (next) void loadHistory();
        }}
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
    if (!closed) ui.render(view());
  }

  function setOpen(next: boolean): void {
    if (closed || next === isOpen) return;
    isOpen = next;
    writeOpen(next);
    if (next) hasUnread = false;
    else isHistoryOpen = false;
    push.set(next, true);
    render();
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
    isCleared = true;
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
    if (session?.chat.status === 'ready') {
      persistLast();
      if (!isOpen && session.chat.messages.at(-1)?.role === 'assistant') hasUnread = true;
    }
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

  const thread = store.send('listChat', threadKey).then(
    (rows) => {
      if (closed || isCleared) return;
      restored = rows.map(toUiMessage);
      for (const row of rows) stored.set(row.id, row);
      lastStamp = rows.at(-1)?.createdAt ?? 0;
      render();
    },
    (error: unknown) => warn('read thread', error),
  );

  async function submit(text: string, prompt?: AssistantPromptItem): Promise<void> {
    const question = text.trim();
    if (question === '' || starting || isBusy() || closed || serverUrl === '') return;
    starting = true;
    value = '';
    isHistoryOpen = false;
    render();
    try {
      await thread;
      const source = await nextRequest();
      if (closed) return;
      const promptId = prompt && source.cacheable ? prompt.id : undefined;
      pageRequest = { ...source.request, ...(promptId === undefined ? {} : { promptId }) };
      const active = ensureSession();
      await active.expire();
      if (closed) return;
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

  const onKeyDown = (event: KeyboardEvent): void => {
    if (!isToggleShortcut(event)) return;
    event.preventDefault();
    setOpen(!isOpen);
  };

  const style = document.createElement('style');
  style.setAttribute(OWN_ATTRIBUTE, 'dock');
  style.textContent = dockCss;
  (document.head ?? document.documentElement).append(style);

  if (isOpen) push.set(true, false);

  ui.render(view());
  if (openAfterMount) setOpen(true);

  window.addEventListener('keydown', onKeyDown);
  context.onMutation(() => {
    if (location.pathname === seenPath) return;
    seenPath = location.pathname;
    render();
  });

  return () => {
    closed = true;
    window.removeEventListener('keydown', onKeyDown);
    persistLast();
    dropSession();
    push.release();
    ui.remove();
    style.remove();
  };
}
