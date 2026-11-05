import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import styles from './Spinner.module.scss';

export type SpinnerSize = 'sm' | 'md';

export interface SpinnerProps
  extends Omit<ComponentPropsWithoutRef<'span'>, 'role' | 'aria-label' | 'children'> {
  size?: SpinnerSize;
  label?: string;
  ref?: Ref<HTMLSpanElement>;
}

export function Spinner({ size = 'md', label = 'Loading', className, ref, ...rest }: SpinnerProps) {
  return (
    <span
      ref={ref}
      role="status"
      aria-label={label}
      className={clsx(styles.root, styles[size], className)}
      {...rest}
    />
  );
}
