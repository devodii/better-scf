import clsx from 'clsx';
import styles from './EntryChoice.module.scss';

export interface EntryChoiceProps {
  signedIn: boolean;
  onLogin: () => void;
  onApply: () => void;
}

export function EntryChoice({ signedIn, onLogin, onApply }: EntryChoiceProps) {
  if (signedIn) {
    return (
      <section className={styles.root} aria-label="Continue to your dashboard">
        <div className={clsx(styles.option, styles.single)}>
          <p className={styles.label}>You are signed in.</p>
          <button type="button" className={clsx(styles.button, styles.primary)} onClick={onLogin}>
            Go to your dashboard
            <Arrow />
          </button>
        </div>
        <p className={styles.note}>Fill in the interest form there.</p>
      </section>
    );
  }
  return (
    <section className={styles.root} aria-label="How do you want to continue">
      <div className={styles.options}>
        <div className={styles.option}>
          <p className={styles.label}>New to SCF?</p>
          <button type="button" className={clsx(styles.button, styles.primary)} onClick={onApply}>
            Fill in the interest form
            <Arrow />
          </button>
        </div>
        <div className={styles.option}>
          <p className={styles.label}>Have an SCF account?</p>
          <button type="button" className={clsx(styles.button, styles.secondary)} onClick={onLogin}>
            Log in with Discord
            <Arrow />
          </button>
        </div>
      </div>
      <p className={styles.note}>Everyone starts with the interest form.</p>
    </section>
  );
}

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
