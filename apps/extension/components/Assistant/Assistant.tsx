import { useEffect, useRef } from "react";
import { AssistantComposer } from "../AssistantComposer";
import {
  AssistantHistory,
  type AssistantHistoryItem,
} from "../AssistantHistory";
import { AssistantLauncher } from "../AssistantLauncher";
import type {
  AssistantDecision,
  AssistantMessageItem,
} from "../AssistantMessage";
import { AssistantMessages, type AssistantNotice } from "../AssistantMessages";
import { AssistantPanel } from "../AssistantPanel";
import type { AssistantPromptItem } from "../AssistantPrompts";
import styles from "./Assistant.module.scss";
import { PANEL_SIDE, type PanelSide } from "./side";

export type AssistantStatus = "idle" | "streaming";

export interface AssistantProps {
  isOpen: boolean;
  onOpenChange: (next: boolean) => void;
  hasUnread?: boolean;
  side?: PanelSide;
  contextLabel: string;
  value: string;
  onValueChange: (next: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  placeholder: string;
  maxLength: number;
  status?: AssistantStatus;
  messages: readonly AssistantMessageItem[];
  notice?: AssistantNotice | undefined;
  prompts: readonly AssistantPromptItem[];
  onPromptSelect: (prompt: AssistantPromptItem) => void;
  onDecision?: ((id: string, decision: AssistantDecision) => void) | undefined;
  isHistoryOpen: boolean;
  onHistoryOpenChange: (next: boolean) => void;
  historyItems: readonly AssistantHistoryItem[];
  onHistorySelect: (item: AssistantHistoryItem) => void;
  onHistoryBranch: (item: AssistantHistoryItem) => void;
  onHistoryDelete: (item: AssistantHistoryItem) => void;
  onNewChat: () => void;
}

const ANNOUNCE_CHARS = 160;

function announcementFor(
  messages: readonly AssistantMessageItem[],
  isStreaming: boolean,
): string {
  const last = messages.at(-1);
  if (isStreaming || last?.role !== "assistant") return "";
  const text = last.parts
    .map((part) => part.text)
    .join(" ")
    .trim();
  return text.length > ANNOUNCE_CHARS
    ? `${text.slice(0, ANNOUNCE_CHARS)}…`
    : text;
}

export function Assistant({
  isOpen,
  onOpenChange,
  hasUnread = false,
  side = PANEL_SIDE,
  contextLabel,
  value,
  onValueChange,
  onSubmit,
  onStop,
  placeholder,
  maxLength,
  status = "idle",
  messages,
  notice,
  prompts,
  onPromptSelect,
  onDecision,
  isHistoryOpen,
  onHistoryOpenChange,
  historyItems,
  onHistorySelect,
  onHistoryBranch,
  onHistoryDelete,
  onNewChat,
}: AssistantProps) {
  const launcher = useRef<HTMLButtonElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const wasOpen = useRef(isOpen);
  const isStreaming = status === "streaming";

  useEffect(() => {
    if (wasOpen.current === isOpen) return;
    wasOpen.current = isOpen;
    if (!isOpen) {
      launcher.current?.focus({ preventScroll: true });
      return;
    }
    const frame = requestAnimationFrame(() =>
      composer.current?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  return (
    <>
      <AssistantLauncher
        ref={launcher}
        isOpen={isOpen}
        hasUnread={hasUnread}
        side={side}
        onClick={() => onOpenChange(!isOpen)}
      />
      <AssistantPanel
        isOpen={isOpen}
        onClose={() => onOpenChange(false)}
        contextLabel={contextLabel}
        side={side}
        isHistoryOpen={isHistoryOpen}
        onHistoryOpenChange={onHistoryOpenChange}
        onNewChat={onNewChat}
        history={
          <AssistantHistory
            items={historyItems}
            onBack={() => onHistoryOpenChange(false)}
            onSelect={(item) => {
              onHistorySelect(item);
              composer.current?.focus({ preventScroll: true });
            }}
            onBranch={(item) => {
              onHistoryBranch(item);
              composer.current?.focus({ preventScroll: true });
            }}
            onDelete={onHistoryDelete}
            onNew={() => {
              onNewChat();
              composer.current?.focus({ preventScroll: true });
            }}
          />
        }
      >
        <AssistantMessages
          messages={messages}
          notice={notice}
          contextLabel={contextLabel}
          prompts={prompts}
          isBusy={isStreaming}
          onPromptSelect={onPromptSelect}
          onDecision={onDecision}
        />
        <AssistantComposer
          ref={composer}
          value={value}
          onValueChange={onValueChange}
          onSubmit={onSubmit}
          onStop={onStop}
          placeholder={placeholder}
          maxLength={maxLength}
          isStreaming={isStreaming}
        />
      </AssistantPanel>
      <p className={styles.announcer} role="status" aria-live="polite">
        {announcementFor(messages, isStreaming)}
      </p>
    </>
  );
}
