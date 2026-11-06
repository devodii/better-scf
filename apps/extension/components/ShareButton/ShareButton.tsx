import clsx from "clsx";
import styles from "./ShareButton.module.scss";

export type ShareStatus = "idle" | "copied" | "failed";

export interface ShareButtonProps {
  status?: ShareStatus;
  onShare: () => void;
}

const LABEL: Record<ShareStatus, string> = {
  idle: "Share this proposal",
  copied: "Public link copied",
  failed: "Could not copy the link",
};

export function ShareButton({ status = "idle", onShare }: ShareButtonProps) {
  return (
    <button
      type="button"
      className={clsx(styles.root, status === "copied" && styles.isCopied)}
      onClick={onShare}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {status === "copied" ? (
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        ) : (
          <>
            <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
            <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
          </>
        )}
      </svg>
      <span role="status" aria-live="polite">
        {LABEL[status]}
      </span>
    </button>
  );
}
