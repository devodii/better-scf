import clsx from 'clsx';
import { Spinner } from '../Spinner';
import styles from './BuildersLoader.module.scss';

export type BuildersLoaderStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'stopped';

export interface BuildersLoaderProps {
  status: BuildersLoaderStatus;
  done: number;
  total: number;
  message?: string | null | undefined;
  onStart: () => void;
  onCancel: () => void;
  className?: string | undefined;
}

export function BuildersLoader({
  status,
  done,
  total,
  message,
  onStart,
  onCancel,
  className,
}: BuildersLoaderProps) {
  const progress = `${done} of ${total}`;
  return (
    <div className={clsx(styles.root, className)}>
      <div className={styles.row}>
        {status === 'running' ? (
          <>
            <Spinner size="sm" label="Loading builders and tracks" />
            <span className={styles.progress} role="status">
              {progress}
            </span>
            <progress className={styles.bar} value={done} max={Math.max(total, 1)}>
              {progress}
            </progress>
            <button type="button" className={styles.button} onClick={onCancel}>
              Cancel
            </button>
          </>
        ) : (
          <>
            {status === 'done' || status === 'stopped' || status === 'cancelled' ? (
              <span
                className={clsx(styles.progress, status === 'stopped' && styles.warning)}
                role="status"
              >
                {status === 'done' && `Builders and tracks loaded, ${progress}`}
                {status === 'cancelled' && `Cancelled at ${progress}`}
                {status === 'stopped' && (message ?? `Stopped at ${progress}`)}
              </span>
            ) : null}
            <button
              type="button"
              className={clsx(styles.button, styles.primary)}
              onClick={onStart}
              disabled={status === 'stopped' || total === 0}
            >
              {status === 'idle' ? 'Load builders and tracks' : 'Load again'}
            </button>
          </>
        )}
      </div>
      <p className={styles.note}>
        Opens each proposal page once, slowly, and keeps the result for six hours.
      </p>
    </div>
  );
}
