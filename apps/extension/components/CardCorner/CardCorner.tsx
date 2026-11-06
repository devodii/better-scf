import clsx from "clsx";
import type { Stance } from "shared";
import { IconButton } from "../IconButton";
import { Tooltip } from "../Tooltip";
import styles from "./CardCorner.module.scss";

export type CardDot = "unread" | "opened";

export interface CardCornerProps {
  dot?: CardDot | null | undefined;
  shortlisted?: boolean | undefined;
  onShortlistChange?: ((next: boolean) => void) | undefined;
  stance?: Stance | undefined;
  onStanceChange?: ((next: Stance) => void) | undefined;
  isFit?: boolean | undefined;
  onFitChange?: ((next: boolean) => void) | undefined;
}

const STANCE_ORDER: readonly Stance[] = [
  "none",
  "support",
  "unsure",
  "against",
];

const STANCE_LABEL: Record<Stance, string> = {
  none: "No stance",
  support: "Support",
  unsure: "Unsure",
  against: "Against",
};

const STANCE_GLYPH: Record<Stance, string | null> = {
  none: null,
  support: "M4 8.5l3 3 5-6",
  unsure: "M4.5 8h7",
  against: "M4.5 4.5l7 7M11.5 4.5l-7 7",
};

function nextStance(stance: Stance): Stance {
  const index = STANCE_ORDER.indexOf(stance);
  return STANCE_ORDER[(index + 1) % STANCE_ORDER.length] ?? "none";
}

export function CardCorner({
  dot,
  shortlisted = false,
  onShortlistChange,
  stance = "none",
  onStanceChange,
  isFit = false,
  onFitChange,
}: CardCornerProps) {
  const glyph = STANCE_GLYPH[stance];
  const dotLabel = dot === "opened" ? "Opened" : "Not opened yet";

  if (!dot && !onShortlistChange && !onStanceChange && !onFitChange)
    return null;

  return (
    <div className={styles.root}>
      {dot && (
        <Tooltip content={dotLabel}>
          <span
            className={clsx(styles.dot, styles[dot])}
            role="img"
            aria-label={dotLabel}
          />
        </Tooltip>
      )}
      {onFitChange && (
        <Tooltip content="Fit whole cover without cropping">
          <IconButton
            label="Fit whole cover without cropping"
            size="md"
            isPressed={isFit}
            className={clsx(styles.action, styles.reveal)}
            onClick={() => onFitChange(!isFit)}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M2.5 5.5v-3h3M10.5 2.5h3v3M13.5 10.5v3h-3M5.5 13.5h-3v-3" />
            </svg>
          </IconButton>
        </Tooltip>
      )}
      {onStanceChange && (
        <Tooltip content={STANCE_LABEL[stance]}>
          <button
            type="button"
            className={clsx(
              styles.pip,
              styles.action,
              stance === "none" && styles.reveal,
            )}
            aria-label={`Stance: ${STANCE_LABEL[stance]}. Change stance`}
            onClick={() => onStanceChange(nextStance(stance))}
          >
            <span className={clsx(styles.face, styles[stance])}>
              {glyph && (
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={glyph} />
                </svg>
              )}
            </span>
          </button>
        </Tooltip>
      )}
      {onShortlistChange && (
        <Tooltip
          content={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
        >
          <IconButton
            label="Shortlist"
            size="md"
            isPressed={shortlisted}
            className={clsx(styles.action, !shortlisted && styles.reveal)}
            onClick={() => onShortlistChange(!shortlisted)}
          >
            <svg
              viewBox="0 0 16 16"
              fill={shortlisted ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 1.75l1.9 3.85 4.25.62-3.08 3 .73 4.23L8 11.45l-3.8 2 .73-4.23-3.08-3 4.25-.62z" />
            </svg>
          </IconButton>
        </Tooltip>
      )}
    </div>
  );
}
