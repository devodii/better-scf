import clsx from 'clsx';
import {
  cloneElement,
  type ReactElement,
  type ReactNode,
  type ToggleEvent,
  useEffect,
  useId,
  useRef,
} from 'react';
import styles from './Popover.module.scss';

export type PopoverPlacement = 'top' | 'bottom';

export interface PopoverProps {
  label: string;
  trigger: ReactElement<{ popoverTarget?: string | undefined }>;
  children: ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  placement?: PopoverPlacement;
  className?: string | undefined;
}

export function Popover({
  label,
  trigger,
  children,
  isOpen,
  onOpenChange,
  placement = 'bottom',
  className,
}: PopoverProps) {
  const id = useId();
  const anchor = `--bscf-popover${id}`;
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.togglePopover(isOpen);
  }, [isOpen]);

  const handleToggle = (event: ToggleEvent<HTMLDivElement>): void => {
    const next = event.newState === 'open';
    if (next !== isOpen) onOpenChange(next);
  };

  return (
    <>
      <span className={styles.anchor} style={{ anchorName: anchor }}>
        {cloneElement(trigger, { popoverTarget: id })}
      </span>
      <div
        ref={panel}
        id={id}
        role="dialog"
        aria-label={label}
        popover="auto"
        className={clsx(styles.panel, styles[placement], className)}
        style={{ positionAnchor: anchor }}
        onToggle={handleToggle}
      >
        {children}
      </div>
    </>
  );
}
