import styles from './DockHistory.module.scss';

export interface DockHistoryItem {
  id: string;
  text: string;
  meta: string;
}

export interface DockHistoryProps {
  items: readonly DockHistoryItem[];
  onSelect: (item: DockHistoryItem) => void;
  onClear: () => void;
}

export function DockHistory({ items, onSelect, onClear }: DockHistoryProps) {
  return (
    <section className={styles.root} aria-label="Past questions">
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
