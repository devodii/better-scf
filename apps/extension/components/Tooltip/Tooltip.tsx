import clsx from 'clsx';
import { cloneElement, type ReactElement, type ReactNode, useEffect, useId, useRef } from 'react';
import styles from './Tooltip.module.scss';

export type TooltipPlacement = 'top' | 'bottom';

export interface TooltipProps {
  content: ReactNode;
  children: ReactElement<{ 'aria-describedby'?: string | undefined }>;
  placement?: TooltipPlacement;
  isOpen?: boolean;
}

export function Tooltip({ content, children, placement = 'top', isOpen = false }: TooltipProps) {
  const id = useId();
  const anchor = `--bscf-tooltip${id}`;
  const bubble = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    bubble.current?.togglePopover(isOpen);
  }, [isOpen]);

  const handleShow = (): void => {
    bubble.current?.togglePopover(true);
  };
  const handleHide = (): void => {
    if (!isOpen) bubble.current?.togglePopover(false);
  };

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: listens to the trigger's bubbled hover and focus, the trigger stays the interactive element */}
      <span
        className={styles.anchor}
        style={{ anchorName: anchor }}
        onPointerEnter={handleShow}
        onPointerLeave={handleHide}
        onFocus={handleShow}
        onBlur={handleHide}
      >
        {cloneElement(children, { 'aria-describedby': id })}
      </span>
      <span
        ref={bubble}
        id={id}
        role="tooltip"
        popover={isOpen ? 'manual' : 'hint'}
        className={clsx(styles.bubble, styles[placement])}
        style={{ positionAnchor: anchor }}
      >
        {content}
      </span>
    </>
  );
}
