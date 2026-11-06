import clsx from "clsx";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useRef,
} from "react";
import { PANEL_SIDE, type PanelSide } from "../Assistant/side";
import { IconButton } from "../IconButton";
import styles from "./AssistantPanel.module.scss";

export interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  contextLabel: string;
  isHistoryOpen: boolean;
  onHistoryOpenChange: (next: boolean) => void;
  onNewChat: () => void;
  history: ReactNode;
  children: ReactNode;
  side?: PanelSide;
}

const CLOSE_DRAG_RATIO = 0.3;
const CLOSE_DRAG_PX = 120;

interface DragStart {
  pointerId: number;
  y: number;
}

export function AssistantPanel({
  isOpen,
  onClose,
  contextLabel,
  isHistoryOpen,
  onHistoryOpenChange,
  onNewChat,
  history,
  children,
  side = PANEL_SIDE,
}: AssistantPanelProps) {
  const root = useRef<HTMLElement>(null);
  const drag = useRef<DragStart | null>(null);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    if (isHistoryOpen) onHistoryOpenChange(false);
    else onClose();
  };

  const handleDragStart = (event: PointerEvent<HTMLDivElement>): void => {
    drag.current = { pointerId: event.pointerId, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    root.current?.setAttribute("data-dragging", "");
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (drag.current?.pointerId !== event.pointerId) return;
    const offset = Math.max(0, event.clientY - drag.current.y);
    root.current?.style.setProperty("--assistant-drag", `${offset}px`);
  };

  const handleDragEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const start = drag.current;
    const element = root.current;
    if (!start || start.pointerId !== event.pointerId || !element) return;
    drag.current = null;
    const offset = Math.max(0, event.clientY - start.y);
    element.removeAttribute("data-dragging");
    element.style.removeProperty("--assistant-drag");
    if (
      offset > CLOSE_DRAG_PX ||
      offset > element.offsetHeight * CLOSE_DRAG_RATIO
    )
      onClose();
  };

  return (
    <aside
      ref={root}
      className={clsx(styles.root, styles[side], isOpen && styles.isOpen)}
      aria-label="Assistant"
      inert={!isOpen}
      onKeyDown={handleKeyDown}
    >
      <div
        className={styles.handle}
        aria-hidden="true"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
      >
        <span className={styles.grip} />
      </div>
      <header className={styles.header}>
        <h2 className={styles.title}>Assistant</h2>
        <span className={styles.context} title={contextLabel}>
          {contextLabel}
        </span>
        <IconButton
          label="New chat"
          variant="surface"
          size="md"
          onClick={onNewChat}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
        </IconButton>
        <IconButton
          label="Recent chats"
          variant="surface"
          size="md"
          isPressed={isHistoryOpen}
          onClick={() => onHistoryOpenChange(!isHistoryOpen)}
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
        <IconButton
          label="Close assistant"
          variant="surface"
          size="md"
          onClick={onClose}
        >
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </IconButton>
      </header>
      <div className={styles.body}>
        {children}
        <div
          className={clsx(styles.history, isHistoryOpen && styles.isOpen)}
          inert={!isHistoryOpen}
        >
          {history}
        </div>
      </div>
    </aside>
  );
}
