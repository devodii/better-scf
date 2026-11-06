import clsx from 'clsx';
import { type KeyboardEvent, type ToggleEvent, useEffect, useId, useRef, useState } from 'react';
import styles from './Select.module.scss';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (next: T) => void;
  className?: string | undefined;
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SelectProps<T>) {
  const id = useId();
  const anchor = `--bscf-select${id}`;
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);
  const current = options[selectedIndex];

  useEffect(() => {
    const element = panel.current;
    if (!element || element.matches(':popover-open') === open) return;
    if (open) {
      setActive(selectedIndex);
      element.showPopover();
      list.current?.focus();
    } else {
      element.hidePopover();
    }
  }, [open, selectedIndex]);

  const handleToggle = (event: ToggleEvent<HTMLDivElement>): void => {
    const next = event.newState === 'open';
    setOpen(next);
    if (!next) trigger.current?.focus();
  };

  const choose = (index: number): void => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
  };

  const handleTriggerKey = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  const handleListKey = (event: KeyboardEvent<HTMLDivElement>): void => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(active + 1, last),
      ArrowUp: Math.max(active - 1, 0),
      Home: 0,
      End: last,
    };
    const move = moves[event.key];
    if (move !== undefined) {
      event.preventDefault();
      setActive(move);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(active);
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div className={clsx(styles.root, className)}>
      <span className={styles.label} id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        style={{ anchorName: anchor }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKey}
      >
        <span id={`${id}-value`} className={styles.value}>
          {current?.label}
        </span>
        <svg
          className={clsx(styles.chevron, open && styles.isOpen)}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <div
        ref={panel}
        popover="auto"
        className={styles.panel}
        style={{ positionAnchor: anchor }}
        onToggle={handleToggle}
      >
        <div
          ref={list}
          role="listbox"
          tabIndex={-1}
          className={styles.list}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-option-${active}`}
          onKeyDown={handleListKey}
        >
          {options.map((option, index) => (
            <button
              type="button"
              tabIndex={-1}
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={option.value === value}
              className={clsx(styles.option, index === active && styles.isActive)}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span className={styles.optionLabel}>{option.label}</span>
              {option.value === value && (
                <svg
                  className={styles.check}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
