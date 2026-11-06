import styles from "./GridCounts.module.scss";

export interface GridCountsProps {
  total: number;
  shown: number;
}

export function GridCounts({ total, shown }: GridCountsProps) {
  if (shown === total) return null;
  return (
    <p role="status" className={styles.root}>
      <span>
        Showing {shown} of {total}
      </span>
      {shown === 0 && (
        <span className={styles.empty}>
          {" "}
          No submissions match the current filters.
        </span>
      )}
    </p>
  );
}
