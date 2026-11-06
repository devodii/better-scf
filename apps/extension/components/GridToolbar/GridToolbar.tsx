import type { KeyboardEvent, Ref } from 'react';
import { Collapsible } from '../Collapsible';
import { GridCounts, type GridCountsProps } from '../GridCounts';
import { type GridFilterState, GridFilters, type GridTrack } from '../GridFilters';
import { GridNote } from '../GridNote';
import { GridSort, type GridSortKey } from '../GridSort';
import { IconButton } from '../IconButton';
import { Popover } from '../Popover';
import { TextField } from '../TextField';
import styles from './GridToolbar.module.scss';

export interface GridToolbarNote {
  title: string;
  value: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onChange: (value: string) => void;
}

export interface GridToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  filters: GridFilterState;
  onFiltersChange: (filters: GridFilterState) => void;
  sort: GridSortKey;
  onSortChange: (sort: GridSortKey) => void;
  availableTracks: readonly GridTrack[];
  hasReviews: boolean;
  counts: GridCountsProps;
  isFiltered: boolean;
  onReset: () => void;
  isExpanded: boolean;
  onExpandedChange: (isExpanded: boolean) => void;
  note: GridToolbarNote | null;
  searchRef?: Ref<HTMLInputElement>;
}

export function GridToolbar({
  query,
  onQueryChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  availableTracks,
  hasReviews,
  counts,
  isFiltered,
  onReset,
  isExpanded,
  onExpandedChange,
  note,
  searchRef,
}: GridToolbarProps) {
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    if (query) onQueryChange('');
    else event.currentTarget.blur();
  };

  return (
    <section className={styles.root} aria-label="Submission tools">
      <div className={styles.bar}>
        <div className={styles.search}>
          <TextField
            {...(searchRef ? { ref: searchRef } : {})}
            aria-label="Search submissions by title or team"
            placeholder="Search title or team"
            className={styles.searchInput}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            onClear={() => onQueryChange('')}
            clearLabel="Clear search"
            autoComplete="off"
            spellCheck={false}
            leadingIcon={
              <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.3 1.3-4.4-4.4A6.5 6.5 0 1 1 8.5 2zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4z" />
              </svg>
            }
          />
        </div>
        <IconButton
          label="Filters and sort"
          variant="surface"
          size="lg"
          className={styles.expand}
          aria-expanded={isExpanded}
          onClick={() => onExpandedChange(!isExpanded)}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M3 4h14l-5.5 6.5V16l-3-1.5v-4z" />
          </svg>
        </IconButton>
        {note && (
          <div className={styles.note}>
            <Popover
              label="Private note"
              isOpen={note.isOpen}
              onOpenChange={note.onOpenChange}
              trigger={
                <IconButton label={`Note on ${note.title}`} variant="surface" size="lg">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M4 4h16v12H8l-4 4zm3 4v2h10V8zm0 4v2h7v-2z" />
                  </svg>
                </IconButton>
              }
            >
              {note.isOpen && (
                <GridNote title={note.title} value={note.value} onChange={note.onChange} />
              )}
            </Popover>
          </div>
        )}
        <Collapsible
          isOpen={isExpanded}
          keepInteractive
          className={styles.collapse}
          innerClassName={styles.collapseInner}
        >
          <div className={styles.panel}>
            <GridFilters
              value={filters}
              onChange={onFiltersChange}
              availableTracks={availableTracks}
              hasReviews={hasReviews}
            />
            <GridSort value={sort} onChange={onSortChange} hasReviews={hasReviews} />
          </div>
        </Collapsible>
      </div>
      <div className={styles.status}>
        <GridCounts {...counts} />
        {isFiltered && (
          <button type="button" className={styles.reset} onClick={onReset}>
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}
