import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import styles from './Chip.module.scss';

export type ChipVariant = 'purple' | 'olive' | 'yellow' | 'muted';

export interface ChipProps extends ComponentPropsWithoutRef<'span'> {
  variant?: ChipVariant;
  ref?: Ref<HTMLSpanElement>;
}

export function Chip({ variant = 'purple', className, children, ref, ...rest }: ChipProps) {
  return (
    <span ref={ref} className={clsx(styles.root, styles[variant], className)} {...rest}>
      <span className={styles.label}>{children}</span>
    </span>
  );
}
