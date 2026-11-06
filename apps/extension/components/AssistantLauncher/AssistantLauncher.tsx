import clsx from "clsx";
import type { ComponentPropsWithoutRef, Ref } from "react";
import { PANEL_SIDE, type PanelSide } from "../Assistant/side";
import styles from "./AssistantLauncher.module.scss";

export interface AssistantLauncherProps extends Omit<
  ComponentPropsWithoutRef<"button">,
  "aria-label" | "children"
> {
  isOpen?: boolean;
  hasUnread?: boolean;
  side?: PanelSide;
  ref?: Ref<HTMLButtonElement>;
}

export function AssistantLauncher({
  isOpen = false,
  hasUnread = false,
  side = PANEL_SIDE,
  className,
  type = "button",
  ref,
  ...rest
}: AssistantLauncherProps) {
  const label = isOpen ? "Close assistant" : "Ask the assistant";
  return (
    <div
      className={clsx(
        styles.root,
        styles[side],
        isOpen && styles.isOpen,
        className,
      )}
    >
      <button
        ref={ref}
        type={type}
        className={styles.button}
        aria-label={
          isOpen
            ? label
            : hasUnread
              ? "Open assistant, new reply"
              : "Open assistant"
        }
        aria-expanded={isOpen}
        aria-keyshortcuts="Alt+A"
        {...rest}
      >
        <svg
          className={styles.chat}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4.5H7.5a3 3 0 0 0-3 3v7a3 3 0 0 0 3 3H9v3l3.5-3h4a3 3 0 0 0 3-3V12" />
          <path d="M17.5 3.5c.3 1.9 1.1 2.7 3 3-1.9.3-2.7 1.1-3 3-.3-1.9-1.1-2.7-3-3 1.9-.3 2.7-1.1 3-3z" />
          <path d="M8.5 10.5h5M8.5 14h7" />
        </svg>
        <svg
          className={styles.close}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        {hasUnread && !isOpen && (
          <span className={styles.dot} aria-hidden="true" />
        )}
      </button>
      <span className={styles.label} aria-hidden="true">
        {label}
        <kbd className={styles.key}>Alt+A</kbd>
      </span>
    </div>
  );
}
