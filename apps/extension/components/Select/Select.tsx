import clsx from 'clsx';
import { type KeyboardEvent, type ToggleEvent, useEffect, useId, useRef, useState } from 'react';
import styles from './Select.module.scss';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  group?: string;
}

interface SelectBaseProps<T extends string> {
  label: string;
  options: readonly SelectOption<T>[];
  className?: string | undefined;
}

export interface SingleSelectProps<T extends string> extends SelectBaseProps<T> {
  multiple?: false;
  value: T;
  onChange: (next: T) => void;
}

export interface MultiSelectProps<T extends string> extends SelectBaseProps<T> {
  multiple: true;
  values: readonly T[];
  onValuesChange: (next: T[]) => void;
}

export type SelectProps<T extends string> = SingleSelectProps<T> | MultiSelectProps<T>;

interface Column<T extends string> {
  group: string | undefined;
  items: { option: SelectOption<T>; index: number }[];
}

export function Select<T extends string>(props: SelectProps<T>) {
  const { label, options, className } = props;
  const id = useId();
  const anchor = `--bscf-select${id}`;
  const panel = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const picked: readonly T[] = props.multiple ? props.values : [props.value];
  const firstPicked = Math.max(
    0,
    options.findIndex((option) => picked.includes(option.value)),
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(firstPicked);
  const columns = useMemo(() => {
    const out: Column<T>[] = [];
    options.forEach((option, index) => {
      const last = out[out.length - 1];
      if (last && last.group === option.group) last.items.push({ option, index });
      else out.push({ group: option.group, items: [{ option, index }] });
    });
    return out;
  }, [options]);
  const isColumns = columns.length > 1;

  useEffect(() => {
    const element = panel.current;
    if (!element || element.matches(':popover-open') === open) return;
    if (open) {
      setActive(firstPicked);
      element.showPopover();
      list.current?.focus();
    } else {
      element.hidePopover();
    }
  }, [open, firstPicked]);

  const handleToggle = (event: ToggleEvent<HTMLDivElement>): void => {
    const next = event.newState === 'open';
    setOpen(next);
    if (!next) trigger.current?.focus();
  };

  const choose = (index: number): void => {
    const option = options[index];
    if (!option) return;
    if (props.multiple) {
      props.onValuesChange(
        props.values.includes(option.value)
          ? props.values.filter((value) => value !== option.value)
          : [...props.values, option.value],
      );
      return;
    }
    props.onChange(option.value);
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
    const sideways = isColumns && (event.key === 'ArrowRight' || event.key === 'ArrowLeft');
    if (sideways) {
      const from = columns.findIndex((column) =>
        column.items.some((item) => item.index === active),
      );
      const row = columns[from]?.items.findIndex((item) => item.index === active) ?? 0;
      const to =
        columns[
          Math.min(Math.max(from + (event.key === 'ArrowRight' ? 1 : -1), 0), columns.length - 1)
        ];
      const target = to?.items[Math.min(row, to.items.length - 1)];
      event.preventDefault();
      if (target) setActive(target.index);
      return;
    }
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

  const summary = props.multiple
    ? props.values.length === 0
      ? label
      : `${label} · ${props.values.length}`
    : options.find((option) => option.value === props.value)?.label;

  return (
    <div className={clsx(styles.root, className)}>
      {!props.multiple && (
        <span className={styles.label} id={`${id}-label`}>
          {label}
        </span>
      )}
      <button
        ref={trigger}
        type="button"
        className={clsx(
          styles.trigger,
          props.multiple && props.values.length > 0 && styles.isActive,
        )}
        style={{ anchorName: anchor }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={props.multiple ? label : undefined}
        aria-labelledby={props.multiple ? undefined : `${id}-label ${id}-value`}
        onClick={() => setOpen(!open)}
        onKeyDown={handleTriggerKey}
      >
        <span id={`${id}-value`} className={styles.value}>
          {summary}
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
        className={clsx(styles.panel, isColumns && styles.isWide)}
        style={{ positionAnchor: anchor }}
        onToggle={handleToggle}
      >
        <div
          ref={list}
          role="listbox"
          tabIndex={-1}
          className={clsx(styles.list, isColumns && styles.isColumns)}
          aria-label={label}
          aria-multiselectable={props.multiple ? true : undefined}
          aria-activedescendant={`${id}-option-${active}`}
          onKeyDown={handleListKey}
        >
          {columns.map((column) => (
            <fieldset
              key={column.group ?? 'all'}
              className={styles.column}
              aria-label={column.group ?? label}
            >
              {column.group !== undefined && (
                <div className={styles.group} aria-hidden="true">
                  {column.group}
                </div>
              )}
              {column.items.map(({ option, index }) => (
                <button
                  key={option.value}
                  type="button"
                  tabIndex={-1}
                  id={`${id}-option-${index}`}
                  role="option"
                  aria-selected={picked.includes(option.value)}
                  className={clsx(styles.option, index === active && styles.isActive)}
                  onPointerMove={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  <span className={styles.optionLabel}>{option.label}</span>
                  {picked.includes(option.value) && (
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
            </fieldset>
          ))}
        </div>
      </div>
    </div>
  );
}
