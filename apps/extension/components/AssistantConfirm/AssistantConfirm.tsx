import clsx from 'clsx';
import styles from './AssistantConfirm.module.scss';

export type AssistantConfirmStatus = 'pending' | 'allowed' | 'denied' | 'expired';

export interface AssistantConfirmProps {
  text: string;
  status: AssistantConfirmStatus;
  onAllow?: (() => void) | undefined;
  onDeny?: (() => void) | undefined;
}

const LABEL: Record<AssistantConfirmStatus, string> = {
  pending: 'Allow this?',
  allowed: 'Allowed',
  denied: 'Not allowed',
  expired: 'Expired',
};

export function AssistantConfirm({ text, status, onAllow, onDeny }: AssistantConfirmProps) {
  const isPending = status === 'pending';
  return (
    <fieldset
      className={clsx(styles.root, styles[status])}
      aria-label="Action that needs your approval"
    >
      <p className={styles.body} role={isPending ? 'alert' : undefined}>
        <span className={styles.label}>{LABEL[status]}</span>
        <span className={styles.text}>{text}</span>
      </p>
      {isPending && (
        <div className={styles.actions}>
          <button type="button" className={clsx(styles.button, styles.allow)} onClick={onAllow}>
            Allow
          </button>
          <button type="button" className={styles.button} onClick={onDeny}>
            Not now
          </button>
        </div>
      )}
    </fieldset>
  );
}
