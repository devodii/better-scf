import clsx from 'clsx';
import { type ComponentPropsWithoutRef, type ReactNode, type Ref, useId, useRef } from 'react';
import { IconButton } from '../IconButton';
import { Spinner } from '../Spinner';
import styles from './TextField.module.scss';

export interface TextFieldProps extends Omit<ComponentPropsWithoutRef<'input'>, 'children'> {
  label?: string | undefined;
  leadingIcon?: ReactNode;
  isLoading?: boolean;
  isInvalid?: boolean;
  error?: string | undefined;
  onClear?: (() => void) | undefined;
  clearLabel?: string;
  loadingLabel?: string;
  wrapperClassName?: string | undefined;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  leadingIcon,
  isLoading = false,
  isInvalid = false,
  error,
  onClear,
  clearLabel = 'Clear',
  loadingLabel = 'Loading',
  wrapperClassName,
  className,
  disabled,
  readOnly,
  value,
  id: idProp,
  ref,
  ...rest
}: TextFieldProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;
  const field = useRef<HTMLDivElement>(null);
  const invalid = isInvalid || Boolean(error);
  const canClear = Boolean(onClear) && !disabled && !readOnly && String(value ?? '').length > 0;
  const trailing = Number(isLoading) + Number(canClear);

  const handleClear = (): void => {
    field.current?.querySelector('input')?.focus();
    onClear?.();
  };

  return (
    <div className={clsx(styles.root, wrapperClassName)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div ref={field} className={styles.field}>
        {leadingIcon && (
          <span className={styles.leading} aria-hidden="true">
            {leadingIcon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          value={value}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          aria-busy={isLoading || undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx(
            styles.input,
            leadingIcon && styles.hasLeading,
            trailing === 1 && styles.trailingOne,
            trailing === 2 && styles.trailingTwo,
            invalid && styles.invalid,
            className,
          )}
          {...rest}
        />
        {trailing > 0 && (
          <span className={styles.trailing}>
            {isLoading && <Spinner size="sm" label={loadingLabel} />}
            {canClear && (
              <IconButton label={clearLabel} size="sm" onClick={handleClear}>
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
                </svg>
              </IconButton>
            )}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
