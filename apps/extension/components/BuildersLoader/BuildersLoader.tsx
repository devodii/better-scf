import clsx from "clsx";
import { IconButton } from "../IconButton";
import { Spinner } from "../Spinner";
import { Tooltip } from "../Tooltip";
import styles from "./BuildersLoader.module.scss";

export type BuildersLoaderStatus =
  "idle" | "running" | "done" | "cancelled" | "stopped";

export interface BuildersLoaderProps {
  status: BuildersLoaderStatus;
  done: number;
  total: number;
  message?: string | null | undefined;
  onStart: () => void;
  onCancel: () => void;
  compact?: boolean;
  className?: string | undefined;
}

function CancelIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.5v3h-3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export function BuildersLoader({
  status,
  done,
  total,
  message,
  onStart,
  onCancel,
  compact = false,
  className,
}: BuildersLoaderProps) {
  const progress = `${done} of ${total}`;
  const running = status === "running";
  const label = {
    idle: "Tracks and teams not loaded yet",
    running: `Reading proposals for tracks and teams, ${progress}`,
    done: "Tracks and teams up to date",
    cancelled: `Paused at ${progress}`,
    stopped: message ?? `Stopped at ${progress}`,
  }[status];

  return (
    <div className={clsx(styles.root, compact && styles.compact, className)}>
      {running && <Spinner size="sm" label="Loading tracks and teams" />}
      {status === "done" && (
        <span className={styles.check}>
          <CheckIcon />
        </span>
      )}
      <span
        className={clsx(styles.label, status === "stopped" && styles.warning)}
        role="status"
        aria-live="polite"
      >
        {label}
      </span>
      {running && (
        <progress className={styles.bar} value={done} max={Math.max(total, 1)}>
          {progress}
        </progress>
      )}
      {running ? (
        <Tooltip content="Cancel">
          <IconButton
            label="Cancel loading"
            variant="surface"
            onClick={onCancel}
          >
            <CancelIcon />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip content="Reload tracks and teams">
          <IconButton
            label="Reload tracks and teams"
            variant="surface"
            disabled={status === "stopped" || total === 0}
            onClick={onStart}
          >
            <ReloadIcon />
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
}
