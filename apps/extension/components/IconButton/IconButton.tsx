import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import styles from './IconButton.module.scss';

export type IconButtonVariant = 'ghost' | 'surface' | 'accent';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-label' | 'aria-pressed'> {
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  isPressed?: boolean | undefined;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  isPressed,
  type = 'button',
  className,
  children,
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      aria-pressed={isPressed}
      className={clsx(styles.root, styles[variant], styles[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
