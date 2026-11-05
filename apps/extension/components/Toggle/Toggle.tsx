import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import styles from './Toggle.module.scss';

export interface ToggleProps
  extends Omit<
    ComponentPropsWithoutRef<'button'>,
    'onChange' | 'onClick' | 'children' | 'role' | 'type'
  > {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

export function Toggle({ label, checked, onChange, className, ref, ...rest }: ToggleProps) {
  return (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      className={clsx(styles.root, checked && styles.on, className)}
      onClick={() => onChange(!checked)}
      {...rest}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
    </button>
  );
}
