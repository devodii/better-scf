import clsx from "clsx";
import { Spinner } from "../Spinner";
import styles from "./AssistantActivity.module.scss";

export type AssistantActivityStatus = "running" | "done" | "error";

export interface AssistantActivityProps {
  text: string;
  status: AssistantActivityStatus;
  detail?: string | undefined;
}

const OUTCOME: Record<Exclude<AssistantActivityStatus, "running">, string> = {
  done: "done",
  error: "failed",
};

export function AssistantActivity({
  text,
  status,
  detail,
}: AssistantActivityProps) {
  return (
    <div className={clsx(styles.root, styles[status])}>
      {status === "running" ? (
        <Spinner size="sm" label={text} />
      ) : (
        <span className={styles.mark} aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {status === "done" ? (
              <path d="M3.5 8.5l3 3 6-7" />
            ) : (
              <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
            )}
          </svg>
        </span>
      )}
      <span className={styles.body}>
        <span aria-hidden={status === "running"}>
          {text}
          {status !== "running" && (
            <span className={styles.outcome}> ({OUTCOME[status]})</span>
          )}
        </span>
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
    </div>
  );
}
