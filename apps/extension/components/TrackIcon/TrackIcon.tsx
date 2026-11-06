import styles from "./TrackIcon.module.scss";

export type TrackIconKind = "open" | "integration" | "rfp";

export interface TrackIconProps {
  kind: TrackIconKind;
}

const PATHS: Record<TrackIconKind, string[]> = {
  open: ["M5 19c0-8 4-13 14-14 0 9-4 14-12 14", "M5 19c2-4 5-7 9-9"],
  integration: ["M9 3v5", "M15 3v5", "M6 8h12v3a6 6 0 0 1-12 0z", "M12 17v4"],
  rfp: ["M7 3h8l4 4v14H7z", "M15 3v4h4", "M10 14l2 2 3.5-4"],
};

export function TrackIcon({ kind }: TrackIconProps) {
  return (
    <svg
      className={styles.root}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[kind].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
