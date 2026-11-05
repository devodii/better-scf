import clsx from 'clsx';
import { DockActivity } from '../DockActivity';
import { DockMarkdown } from '../DockMarkdown';
import styles from './DockMessage.module.scss';

export interface DockMessageProps {
  role: 'user' | 'assistant';
  text: string;
  activity?: string | undefined;
  isStreaming?: boolean;
}

export function DockMessage({ role, text, activity, isStreaming = false }: DockMessageProps) {
  if (role === 'user') {
    return (
      <article className={clsx(styles.root, styles.user)} aria-label="You">
        <p className={styles.userText}>{text}</p>
      </article>
    );
  }
  return (
    <article className={clsx(styles.root, styles.assistant)} aria-label="Assistant">
      {text !== '' && <DockMarkdown text={text} />}
      {activity ? (
        <DockActivity text={activity} />
      ) : (
        isStreaming && text === '' && <DockActivity text="Thinking..." />
      )}
    </article>
  );
}
