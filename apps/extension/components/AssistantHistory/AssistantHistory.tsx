import { IconButton } from "../IconButton";
import styles from "./AssistantHistory.module.scss";

export interface AssistantHistoryItem {
  id: string;
  text: string;
  meta: string;
}

export interface AssistantHistoryProps {
  items: readonly AssistantHistoryItem[];
  onSelect: (item: AssistantHistoryItem) => void;
  onBranch: (item: AssistantHistoryItem) => void;
  onDelete: (item: AssistantHistoryItem) => void;
  onNew: () => void;
  onBack: () => void;
}

const ICON = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function AssistantHistory({
  items,
  onSelect,
  onBranch,
  onDelete,
  onNew,
  onBack,
}: AssistantHistoryProps) {
  return (
    <section className={styles.root} aria-label="Recent chats">
      <div className={styles.header}>
        <IconButton label="Back to conversation" size="md" onClick={onBack}>
          <svg {...ICON} aria-hidden="true">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </IconButton>
        <h3 className={styles.title}>Recent chats</h3>
        <button type="button" className={styles.new} onClick={onNew}>
          <svg {...ICON} aria-hidden="true">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New chat
        </button>
      </div>
      <div className={styles.scroll}>
        {items.length === 0 ? (
          <p className={styles.empty}>No chats yet.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.item}
                  onClick={() => onSelect(item)}
                >
                  <span className={styles.text}>{item.text}</span>
                  <span className={styles.meta}>{item.meta}</span>
                </button>
                <IconButton
                  label="Branch into a new chat"
                  size="md"
                  onClick={() => onBranch(item)}
                >
                  <svg {...ICON} aria-hidden="true">
                    <path d="M4.5 2.5v7a3 3 0 0 0 3 3h4M4.5 5.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM11.5 14a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                  </svg>
                </IconButton>
                <IconButton
                  label="Delete chat"
                  size="md"
                  onClick={() => onDelete(item)}
                >
                  <svg {...ICON} aria-hidden="true">
                    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8h5l.5-8" />
                  </svg>
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
