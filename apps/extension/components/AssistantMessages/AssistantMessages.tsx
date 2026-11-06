import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  type AssistantDecision,
  AssistantMessage,
  type AssistantMessageItem,
} from "../AssistantMessage";
import {
  type AssistantPromptItem,
  AssistantPrompts,
} from "../AssistantPrompts";
import { Chip } from "../Chip";
import styles from "./AssistantMessages.module.scss";

export interface AssistantNotice {
  tone: "error" | "limit";
  text: string;
}

export interface AssistantMessagesProps {
  messages: readonly AssistantMessageItem[];
  notice?: AssistantNotice | undefined;
  contextLabel: string;
  prompts: readonly AssistantPromptItem[];
  onPromptSelect: (prompt: AssistantPromptItem) => void;
  onDecision?: ((id: string, decision: AssistantDecision) => void) | undefined;
  isBusy?: boolean;
}

const STICK_DISTANCE_PX = 48;

function scrollToEnd(element: HTMLElement | null): void {
  if (element) element.scrollTop = element.scrollHeight;
}

export function AssistantMessages({
  messages,
  notice,
  contextLabel,
  prompts,
  onPromptSelect,
  onDecision,
  isBusy = false,
}: AssistantMessagesProps) {
  const list = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const isStuck = useRef(true);
  const count = useRef(messages.length);
  const [isAway, setIsAway] = useState(false);

  useLayoutEffect(() => {
    if (messages.length > count.current && messages.at(-1)?.role === "user") {
      isStuck.current = true;
    }
    count.current = messages.length;
    if (isStuck.current) scrollToEnd(list.current);
  });

  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (isStuck.current) scrollToEnd(list.current);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handleScroll = (): void => {
    const element = list.current;
    if (!element) return;
    const away =
      element.scrollHeight - element.scrollTop - element.clientHeight >
      STICK_DISTANCE_PX;
    isStuck.current = !away;
    setIsAway(away);
  };

  const handleJump = (): void => {
    const element = list.current;
    if (!element) return;
    isStuck.current = true;
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    element.scrollTo({ top: element.scrollHeight, behavior });
  };

  return (
    <div className={styles.root}>
      <div
        ref={list}
        className={styles.list}
        role="log"
        aria-label="Conversation"
        aria-live="off"
        aria-busy={isBusy}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scrolling region must be reachable by keyboard
        tabIndex={0}
        onScroll={handleScroll}
      >
        <div ref={content} className={styles.content}>
          {messages.length === 0 && (
            <div className={styles.empty}>
              <h3 className={styles.welcome}>How can I help?</h3>
              <p className={styles.hint}>
                Ask about what is on this page, or start with one of these.
              </p>
              <Chip variant="muted">{contextLabel}</Chip>
              <AssistantPrompts
                prompts={prompts}
                isDisabled={isBusy}
                onSelect={onPromptSelect}
              />
            </div>
          )}
          {messages.map((message) => (
            <AssistantMessage
              key={message.id}
              message={message}
              onDecision={onDecision}
            />
          ))}
          {notice && (
            <p
              className={clsx(styles.notice, styles[notice.tone])}
              role="alert"
            >
              {notice.text}
            </p>
          )}
        </div>
      </div>
      <button
        type="button"
        className={clsx(styles.jump, isAway && styles.isVisible)}
        tabIndex={isAway ? 0 : -1}
        aria-hidden={!isAway}
        onClick={handleJump}
      >
        Jump to latest
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 3v10M3.5 8.5L8 13l4.5-4.5" />
        </svg>
      </button>
    </div>
  );
}
