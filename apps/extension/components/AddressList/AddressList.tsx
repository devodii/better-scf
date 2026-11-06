import clsx from "clsx";
import type { AddressKind } from "../AddressPopover";
import styles from "./AddressList.module.scss";

export interface AddressListItem {
  address: string;
  kind: AddressKind;
  href: string;
}

export interface AddressListProps {
  items: readonly AddressListItem[];
  activeAddress?: string | null;
  describedBy?: string;
  isRevealed?: boolean;
  onActivate?: (address: string) => void;
  onDeactivate?: () => void;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function AddressList({
  items,
  activeAddress = null,
  describedBy,
  isRevealed = false,
  onActivate,
  onDeactivate,
}: AddressListProps) {
  if (items.length === 0) return null;
  return (
    <ul
      aria-label="Stellar addresses in this proposal"
      className={clsx(
        styles.root,
        isRevealed ? styles.revealed : styles.hidden,
      )}
    >
      {items.map((item) => {
        const label = item.kind === "account" ? "Account" : "Contract";
        return (
          <li key={item.address}>
            <a
              className={styles.link}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} ${item.address}, opens stellar.expert in a new tab`}
              aria-describedby={
                item.address === activeAddress ? describedBy : undefined
              }
              onFocus={() => onActivate?.(item.address)}
              onBlur={onDeactivate}
            >
              {label} {shortAddress(item.address)}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
