import clsx from "clsx";
import {
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { PANEL_SIDE, type PanelSide } from "../Assistant/side";
import {
  clampWidth,
  KEY_STEP,
  maxWidth,
  minWidth,
  WIDTH_VAR,
} from "../Assistant/width";
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
  onResize?: ((width: number | null) => void) | undefined;
}

const CLOSE_DRAG_RATIO = 0.3;
const CLOSE_DRAG_PX = 120;

interface DragStart {
  pointerId: number;
  y: number;
}

interface ResizeStart {
  pointerId: number;
  x: number;
  width: number;
}

const MOTION_ATTRIBUTE = "data-bscf-motion";

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
  onResize,
}: AssistantPanelProps) {
  const root = useRef<HTMLElement>(null);
  const drag = useRef<DragStart | null>(null);
  const resize = useRef<ResizeStart | null>(null);
  const direction = side === "right" ? -1 : 1;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (isOpen && root.current) setWidth(root.current.offsetWidth);
  }, [isOpen]);

  const applyWidth = (width: number): number => {
    const next = clampWidth(width);
    document.documentElement.style.setProperty(WIDTH_VAR, `${next}px`);
    setWidth(next);
    return next;
  };

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>): void => {
    const element = root.current;
    if (!element) return;
    resize.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      width: element.offsetWidth,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    element.setAttribute("data-resizing", "");
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
  };

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>): void => {
    const start = resize.current;
    if (start?.pointerId !== event.pointerId) return;
    applyWidth(start.width + direction * (event.clientX - start.x));
  };

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const start = resize.current;
    if (start?.pointerId !== event.pointerId) return;
    resize.current = null;
    root.current?.removeAttribute("data-resizing");
    onResize?.(applyWidth(start.width + direction * (event.clientX - start.x)));
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const element = root.current;
    if (!element) return;
    const step =
      event.key === "ArrowLeft"
        ? -KEY_STEP
        : event.key === "ArrowRight"
          ? KEY_STEP
          : 0;
    if (step === 0) return;
    event.preventDefault();
    event.stopPropagation();
    document.documentElement.removeAttribute(MOTION_ATTRIBUTE);
    onResize?.(applyWidth(element.offsetWidth + direction * step));
  };

  const handleResizeReset = (): void => {
    document.documentElement.style.removeProperty(WIDTH_VAR);
    setWidth(root.current?.offsetWidth ?? 0);
    onResize?.(null);
  };

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
      <hr
        className={clsx(styles.resizer, styles[`resizer-${side}`])}
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={minWidth()}
        aria-valuemax={maxWidth()}
        aria-label="Resize assistant"
        tabIndex={isOpen ? 0 : -1}
        onPointerDown={handleResizeStart}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeEnd}
        onPointerCancel={handleResizeEnd}
        onKeyDown={handleResizeKeyDown}
        onDoubleClick={handleResizeReset}
      />
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
