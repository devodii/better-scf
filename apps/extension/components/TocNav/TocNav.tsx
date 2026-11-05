import clsx from 'clsx';
import { useId } from 'react';
import styles from './TocNav.module.scss';

export interface TocNavItem {
  id: string;
  title: string;
}

export interface TocNavProps {
  items: readonly TocNavItem[];
  activeId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (id: string) => void;
}

export function TocNav({ items, activeId, isOpen, onOpenChange, onSelect }: TocNavProps) {
  const listId = useId();
  const active = items.find((item) => item.id === activeId);
  return (
    <nav className={styles.root} aria-label="Table of contents">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => onOpenChange(!isOpen)}
      >
        <span className={styles.heading}>
          <span className={styles.title}>Contents</span>
          {!isOpen && active && <span className={styles.current}>{active.title}</span>}
        </span>
        <svg
          className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z" />
        </svg>
      </button>
      <div id={listId} className={styles.body} hidden={!isOpen}>
        {items.length === 0 ? (
          <p className={styles.empty}>No sections found on this page.</p>
        ) : (
          <ol className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={clsx(styles.link, item.id === activeId && styles.isActive)}
                  aria-current={item.id === activeId ? 'location' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  {item.title}
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </nav>
  );
}
