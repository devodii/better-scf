import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './Collapsible.module.scss';

export interface CollapsibleProps {
  isOpen: boolean;
  children: ReactNode;
  id?: string | undefined;
  className?: string | undefined;
  innerClassName?: string | undefined;
  keepInteractive?: boolean;
}

export function Collapsible({
  isOpen,
  children,
  id,
  className,
  innerClassName,
  keepInteractive = false,
}: CollapsibleProps) {
  return (
    <div id={id} className={clsx(styles.root, isOpen && styles.isOpen, className)}>
      <div
        className={clsx(styles.inner, innerClassName)}
        inert={keepInteractive ? undefined : !isOpen}
      >
        {children}
      </div>
    </div>
  );
}
