import clsx from 'clsx';
import { type KeyboardEvent, type Ref, useId } from 'react';
import { IconButton } from '../IconButton';
import styles from './AssistantComposer.module.scss';

export interface AssistantComposerProps {
  value: string;
  onValueChange: (next: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  placeholder: string;
  maxLength: number;
  isStreaming?: boolean;
  isDisabled?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

const WARN_RATIO = 0.9;

export function AssistantComposer({
  value,
  onValueChange,
  onSubmit,
  onStop,
  placeholder,
  maxLength,
  isStreaming = false,
  isDisabled = false,
  ref,
}: AssistantComposerProps) {
  const counterId = useId();
  const canSend = !isDisabled && !isStreaming && value.trim() !== '';

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    if (canSend) onSubmit();
  };

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <textarea
          ref={ref}
          className={styles.input}
          aria-label="Ask the assistant"
          aria-describedby={counterId}
          placeholder={placeholder}
          value={value}
          rows={1}
          maxLength={maxLength}
          disabled={isDisabled}
          enterKeyHint="send"
          autoComplete="off"
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        {isStreaming ? (
          <IconButton label="Stop" variant="surface" size="lg" onClick={onStop}>
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="4" y="4" width="8" height="8" rx="1.5" />
            </svg>
          </IconButton>
        ) : (
          <IconButton
            label="Send"
            variant="accent"
            size="lg"
            disabled={!canSend}
            onClick={onSubmit}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
            </svg>
          </IconButton>
        )}
      </div>
      <p
        id={counterId}
        className={clsx(
          styles.counter,
          value.length >= maxLength
            ? styles.isFull
            : value.length >= maxLength * WARN_RATIO && styles.isNear,
        )}
      >
        <span>Enter to send, Shift+Enter for a new line</span>
        <span>
          {value.length}/{maxLength}
        </span>
      </p>
    </div>
  );
}
