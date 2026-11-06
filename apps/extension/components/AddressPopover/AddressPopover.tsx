import clsx from 'clsx';
import { useLayoutEffect, useRef } from 'react';
import { AddressSummary, type AddressSummaryState } from '../AddressSummary';
import styles from './AddressPopover.module.scss';

export type AddressKind = 'account' | 'contract';
export type AddressPopoverPlacement = 'top' | 'bottom';

export interface AddressPopoverProps {
  id: string;
  address: string;
  kind: AddressKind;
  x: number;
  y: number;
  summary?: AddressSummaryState;
  isOpen?: boolean;
  placement?: AddressPopoverPlacement;
}

const LOADING: AddressSummaryState = { status: 'loading' };

export function AddressPopover({
  id,
  address,
  kind,
  x,
  y,
  summary = LOADING,
  isOpen = true,
  placement = 'bottom',
}: AddressPopoverProps) {
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = panel.current;
    if (!element) return;
    element.style.setProperty('--x', `${x}px`);
    element.style.setProperty('--y', `${y}px`);
    element.togglePopover(isOpen);
  }, [x, y, isOpen]);

  return (
    <div
      ref={panel}
      id={id}
      role="tooltip"
      popover="manual"
      className={clsx(styles.root, styles[placement])}
    >
      {kind === 'account' ? (
        <AddressSummary address={address} state={summary} />
      ) : (
        <div className={styles.contract}>
          <span className={styles.kind}>Contract</span>
          <span className={styles.address}>{address}</span>
        </div>
      )}
      <p className={styles.hint}>Opens stellar.expert in a new tab</p>
    </div>
  );
}
