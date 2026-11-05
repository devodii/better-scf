import type { ReactNode } from 'react';
import styles from './SearchHighlight.module.scss';

export interface SearchHighlightRange {
  start: number;
  end: number;
}

export interface SearchHighlightProps {
  text: string;
  ranges: readonly SearchHighlightRange[];
}

export function SearchHighlight({ text, ranges }: SearchHighlightProps) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const { start, end } of ranges) {
    const from = Math.max(start, cursor);
    const to = Math.min(end, text.length);
    if (to <= from) continue;
    if (from > cursor) parts.push(text.slice(cursor, from));
    parts.push(
      <mark key={from} className={styles.mark}>
        {text.slice(from, to)}
      </mark>,
    );
    cursor = to;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}
