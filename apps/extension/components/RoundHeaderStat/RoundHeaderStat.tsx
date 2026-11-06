import type { ReactNode } from "react";
import { Tooltip } from "../Tooltip";
import styles from "./RoundHeaderStat.module.scss";

export interface RoundHeaderStatProps {
  label: string;
  value: string;
  hint?: string | undefined;
  note?: string | undefined;
  icon?: ReactNode;
}

export function RoundHeaderStat({
  label,
  value,
  hint,
  note,
  icon,
}: RoundHeaderStatProps) {
  return (
    <div className={styles.root}>
      <dt className={styles.label}>
        {icon ? (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {label}
      </dt>
      <dd className={styles.value}>
        {hint ? (
          <Tooltip content={hint}>
            <button
              type="button"
              className={styles.trigger}
              aria-label={`${label}: ${value}`}
            >
              {value}
            </button>
          </Tooltip>
        ) : (
          value
        )}
      </dd>
      {note ? <dd className={styles.note}>{note}</dd> : null}
    </div>
  );
}
