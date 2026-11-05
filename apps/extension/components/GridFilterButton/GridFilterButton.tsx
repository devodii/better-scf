import clsx from 'clsx';
import type { ComponentPropsWithoutRef, Ref } from 'react';
import { Chip } from '../Chip';
import styles from './GridFilterButton.module.scss';

export interface GridFilterButtonProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'aria-pressed' | 'children' | 'onClick'> {
  label: string;
  isPressed: boolean;
  onPressedChange: (isPressed: boolean) => void;
  ref?: Ref<HTMLButtonElement>;
}

export function GridFilterButton({
  label,
  isPressed,
  onPressedChange,
  type = 'button',
  className,
  ref,
  ...rest
}: GridFilterButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      aria-pressed={isPressed}
      className={clsx(styles.root, className)}
      onClick={() => onPressedChange(!isPressed)}
      {...rest}
    >
      <Chip variant={isPressed ? 'yellow' : 'muted'}>{label}</Chip>
    </button>
  );
}
