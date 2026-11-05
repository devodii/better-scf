import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import styles from './AssistantLauncher.module.scss';

export interface AssistantLauncherProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'children'> {
  isHidden?: boolean;
  hasUnread?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function AssistantLauncher({
  isHidden = false,
  hasUnread = false,
  className,
  type = 'button',
  ref,
  ...rest
}: AssistantLauncherProps) {
  return (
    <div className={clsx(styles.root, isHidden && styles.isHidden, className)} inert={isHidden}>
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
          <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
          <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
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
