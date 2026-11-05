import { useEffect, useRef } from 'react';
import { AddressSummary, type AddressSummaryState } from '../AddressSummary';
import { Chip } from '../Chip';
import { Tooltip } from '../Tooltip';
import styles from './AddressPill.module.scss';

export type AddressKind = 'account' | 'contract';

export interface AddressPillProps {
  address: string;
  kind: AddressKind;
  href: string;
  summary?: AddressSummaryState;
  onPreview?: () => void;
  isOpen?: boolean;
}

const PREVIEW_DELAY_MS = 250;
const LOADING: AddressSummaryState = { status: 'loading' };

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function AddressPill({
  address,
  kind,
  href,
  summary = LOADING,
  onPreview,
  isOpen = false,
}: AddressPillProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleStart = (): void => {
    if (kind !== 'account' || !onPreview) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(onPreview, PREVIEW_DELAY_MS);
  };
  const handleStop = (): void => {
    clearTimeout(timer.current);
  };

  const content =
    kind === 'account' ? (
      <AddressSummary address={address} state={summary} />
    ) : (
      <span className={styles.contract}>
        <span className={styles.kind}>Contract</span>
        <span className={styles.address}>{address}</span>
      </span>
    );

  return (
    <Tooltip content={content} isOpen={isOpen} placement="bottom">
      <Chip
        variant={kind === 'account' ? 'purple' : 'olive'}
        href={href}
        className={styles.pill}
        aria-label={`${kind === 'account' ? 'Account' : 'Contract'} ${address}, opens stellar.expert in a new tab`}
        onPointerEnter={handleStart}
        onPointerLeave={handleStop}
        onFocus={handleStart}
        onBlur={handleStop}
      >
        {shortAddress(address)}
      </Chip>
    </Tooltip>
  );
}
