import { Spinner } from "../Spinner";
import styles from "./AddressSummary.module.scss";

export interface AddressSummaryRow {
  label: string;
  value: string;
}

export type AddressSummaryState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "success"; rows: readonly AddressSummaryRow[] };

export interface AddressSummaryProps {
  address: string;
  state: AddressSummaryState;
}

function Body({ state }: { state: AddressSummaryState }) {
  switch (state.status) {
    case "loading":
      return (
        <p className={styles.note}>
          <Spinner size="sm" label="Loading account" />
          Loading account
        </p>
      );
    case "unavailable":
      return <p className={styles.note}>No public account details available</p>;
    case "success":
      return (
        <dl className={styles.rows}>
          {state.rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>{row.value}</dd>
            </div>
          ))}
        </dl>
      );
    default: {
      const unreachable: never = state;
      return unreachable;
    }
  }
}

export function AddressSummary({ address, state }: AddressSummaryProps) {
  return (
    <div className={styles.root}>
      <p className={styles.address}>{address}</p>
      <Body state={state} />
    </div>
  );
}
