import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import { PANEL_SIDE, type PanelSide } from '../Assistant/side';
import styles from './AssistantLauncher.module.scss';

export interface AssistantLauncherProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'children'> {
  isHidden?: boolean;
  hasUnread?: boolean;
  side?: PanelSide;
  ref?: Ref<HTMLButtonElement>;
}

export function AssistantLauncher({
  isHidden = false,
  hasUnread = false,
  side = PANEL_SIDE,
  className,
  type = 'button',
  ref,
  ...rest
}: AssistantLauncherProps) {
  return (
    <div
      className={clsx(styles.root, styles[side], isHidden && styles.isHidden, className)}
      inert={isHidden}
    >
      <button
        ref={ref}
        type={type}
        className={styles.button}
        aria-label={hasUnread ? 'Open assistant, new reply' : 'Open assistant'}
        aria-keyshortcuts="Alt+A"
        {...rest}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.2A7.5 7.5 0 1 1 20 12z" />
        </svg>
        {hasUnread && <span className={styles.dot} aria-hidden="true" />}
      </button>
      <span className={styles.label} aria-hidden="true">
        Ask the assistant
        <kbd className={styles.key}>Alt+A</kbd>
      </span>
    </div>
  );
}
