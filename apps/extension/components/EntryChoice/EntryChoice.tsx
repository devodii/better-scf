import clsx from 'clsx';
import styles from './EntryChoice.module.scss';

export interface EntryChoiceProps {
  onLogin: () => void;
  onApply: () => void;
}

interface Option {
  key: 'login' | 'apply';
  eyebrow: string;
  action: string;
  hint: string;
  primary: boolean;
  path: string;
}

const OPTIONS: readonly Option[] = [
  {
    key: 'login',
    eyebrow: 'Already on SCF',
    action: 'Log in with Discord',
    hint: 'Opens your dashboard, where you fill in the interest form.',
    primary: true,
    path: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6',
  },
  {
    key: 'apply',
    eyebrow: 'New to SCF',
    action: 'Fill in the interest form',
    hint: 'No account needed to start.',
    primary: false,
    path: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4',
  },
];

export function EntryChoice({ onLogin, onApply }: EntryChoiceProps) {
  return (
    <section className={styles.root} aria-label="How do you want to continue">
      {OPTIONS.map((option) => (
        <div key={option.key} className={styles.card}>
          <span className={styles.icon}>
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={option.path} />
            </svg>
          </span>
          <p className={styles.eyebrow}>{option.eyebrow}</p>
          <p className={styles.hint}>{option.hint}</p>
          <button
            type="button"
            className={clsx(styles.button, option.primary ? styles.primary : styles.secondary)}
            onClick={option.key === 'login' ? onLogin : onApply}
          >
            {option.action}
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>
        </div>
      ))}
    </section>
  );
}
