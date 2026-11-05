import clsx from 'clsx';
import type { KeyboardEvent, Ref } from 'react';
import { TextField } from '../TextField';
import styles from './SearchField.module.scss';

export interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  onMoveDown?: (() => void) | undefined;
  isLoading?: boolean;
  className?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

export function SearchField({
  value,
  onValueChange,
  onMoveDown,
  isLoading = false,
  className,
  ref,
}: SearchFieldProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (value === '') return;
    if (event.key === 'Escape') {
      event.stopPropagation();
      onValueChange('');
    } else if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      onMoveDown?.();
    }
  };

  return (
    <TextField
      {...(ref ? { ref } : {})}
      aria-label="Search projects"
      placeholder="Search projects"
      wrapperClassName={clsx(styles.root, className)}
      className={styles.input}
      value={value}
      isLoading={isLoading}
      loadingLabel="Searching projects"
      clearLabel="Clear search"
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => onValueChange(event.target.value)}
      onKeyDown={handleKeyDown}
      onClear={() => onValueChange('')}
      leadingIcon={
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M8.5 2a6.5 6.5 0 0 1 5.2 10.4l4.4 4.4-1.3 1.3-4.4-4.4A6.5 6.5 0 1 1 8.5 2zm0 1.8a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4z" />
        </svg>
      }
    />
  );
}
