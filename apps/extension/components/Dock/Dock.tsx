import clsx from 'clsx';
import { type KeyboardEvent, useEffect, useId, useRef } from 'react';
import { DockHistory, type DockHistoryItem } from '../DockHistory';
import { DockMessage } from '../DockMessage';
import { type DockPromptItem, DockPrompts } from '../DockPrompts';
import { IconButton } from '../IconButton';
import { TextField } from '../TextField';
import styles from './Dock.module.scss';

export type DockStatus = 'idle' | 'streaming';

export interface DockMessageItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  activity?: string | undefined;
  isStreaming?: boolean | undefined;
}

export interface DockProps {
  value: string;
  onValueChange: (next: string) => void;
  onSubmit: () => void;
  placeholder: string;
  status?: DockStatus;
  isDisabled?: boolean;
  isExpanded: boolean;
  onExpandedChange: (next: boolean) => void;
  isHistoryOpen: boolean;
  onHistoryOpenChange: (next: boolean) => void;
  messages: readonly DockMessageItem[];
  error?: string | undefined;
  prompts: readonly DockPromptItem[];
  onPromptSelect: (prompt: DockPromptItem) => void;
  historyItems: readonly DockHistoryItem[];
  onHistorySelect: (item: DockHistoryItem) => void;
  onHistoryClear: () => void;
}

const MAX_QUESTION_CHARS = 2000;
const STICK_DISTANCE_PX = 48;

export function Dock({
  value,
  onValueChange,
  onSubmit,
  placeholder,
  status = 'idle',
  isDisabled = false,
  isExpanded,
  onExpandedChange,
  isHistoryOpen,
  onHistoryOpenChange,
  messages,
  error,
  prompts,
  onPromptSelect,
  historyItems,
  onHistorySelect,
  onHistoryClear,
}: DockProps) {
  const panelId = useId();
  const input = useRef<HTMLInputElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const sticky = useRef(true);
  const isBusy = status === 'streaming';
  const canSend = !isDisabled && !isBusy && value.trim() !== '';

  useEffect(() => {
    const element = log.current;
    if (element && sticky.current) element.scrollTop = element.scrollHeight;
  });

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== 'Escape' || (!isExpanded && !isHistoryOpen)) return;
    event.preventDefault();
    event.stopPropagation();
    onHistoryOpenChange(false);
    onExpandedChange(false);
    input.current?.focus();
  };

  const handleHistoryClick = (): void => {
    if (!isHistoryOpen) onExpandedChange(true);
    onHistoryOpenChange(!isHistoryOpen);
  };

  return (
    <section
      className={clsx(styles.root, isExpanded && styles.isExpanded)}
      aria-label="Assistant"
      onKeyDown={handleKeyDown}
    >
      <form
        className={styles.bar}
        onSubmit={(event) => {
          event.preventDefault();
          if (canSend) onSubmit();
        }}
      >
        <TextField
          ref={input}
          wrapperClassName={styles.field}
          className={styles.input}
          aria-label="Ask the assistant"
          placeholder={placeholder}
          value={value}
          disabled={isDisabled}
          isLoading={isBusy}
          loadingLabel="The assistant is answering"
          autoComplete="off"
          enterKeyHint="send"
          maxLength={MAX_QUESTION_CHARS}
          onChange={(event) => onValueChange(event.target.value)}
          onClick={() => onExpandedChange(true)}
        />
        <IconButton
          type="submit"
          label="Send"
          variant="accent"
          size="lg"
          className={styles.action}
          disabled={!canSend}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
          </svg>
        </IconButton>
        <IconButton
          label="History"
          variant="surface"
          size="lg"
          className={styles.action}
          isPressed={isHistoryOpen}
          aria-controls={panelId}
          aria-expanded={isExpanded && isHistoryOpen}
          onClick={handleHistoryClick}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2.5 8a5.5 5.5 0 1 0 1.7-4M2.5 2.5v3h3M8 5v3.25l2 1.25" />
          </svg>
        </IconButton>
      </form>
      <DockPrompts
        className={styles.prompts}
        prompts={prompts}
        isDisabled={isDisabled || isBusy}
        onSelect={onPromptSelect}
      />
      {isExpanded && (
        <div id={panelId} className={styles.panel}>
          {isHistoryOpen ? (
            <DockHistory
              items={historyItems}
              onSelect={(item) => {
                onHistorySelect(item);
                input.current?.focus();
              }}
              onClear={() => {
                onHistoryClear();
                input.current?.focus();
              }}
            />
          ) : (
            <div
              ref={log}
              className={styles.log}
              role="log"
              aria-label="Conversation"
              aria-live="polite"
              aria-busy={isBusy}
              onScroll={(event) => {
                const { scrollHeight, scrollTop, clientHeight } = event.currentTarget;
                sticky.current = scrollHeight - scrollTop - clientHeight < STICK_DISTANCE_PX;
              }}
            >
              {messages.length === 0 && !error && (
                <p className={styles.empty}>Ask a question or pick a suggestion.</p>
              )}
              {messages.map((message) => (
                <DockMessage
                  key={message.id}
                  role={message.role}
                  text={message.text}
                  activity={message.activity}
                  isStreaming={message.isStreaming ?? false}
                />
              ))}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
