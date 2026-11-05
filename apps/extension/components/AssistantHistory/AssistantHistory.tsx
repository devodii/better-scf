import { IconButton } from '../IconButton';
import styles from './AssistantHistory.module.scss';

export interface AssistantHistoryItem {
  id: string;
  text: string;
  meta: string;
}

export interface AssistantHistoryProps {
  items: readonly AssistantHistoryItem[];
  onSelect: (item: AssistantHistoryItem) => void;
  onClear: () => void;
  onBack: () => void;
}

export function AssistantHistory({ items, onSelect, onClear, onBack }: AssistantHistoryProps) {
  return (
    <section className={styles.root} aria-label="Past questions">
      <div className={styles.header}>
        <IconButton label="Back to conversation" size="md" onClick={onBack}>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
        </IconButton>
        <h3 className={styles.title}>Past questions</h3>
      </div>
      <div className={styles.scroll}>
        {items.length === 0 ? (
          <p className={styles.empty}>No questions yet.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className={styles.item} onClick={() => onSelect(item)}>
                  <span className={styles.text}>{item.text}</span>
                  <span className={styles.meta}>{item.meta}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        className={styles.clear}
        disabled={items.length === 0}
        onClick={onClear}
      >
        Clear conversation
      </button>
    </section>
  );
}
