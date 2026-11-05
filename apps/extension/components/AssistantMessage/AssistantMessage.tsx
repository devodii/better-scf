import clsx from 'clsx';
import { AssistantActivity, type AssistantActivityStatus } from '../AssistantActivity';
import { AssistantMarkdown } from '../AssistantMarkdown';
import styles from './AssistantMessage.module.scss';

export type AssistantPart =
  | { kind: 'text'; id: string; text: string }
  | {
      kind: 'activity';
      id: string;
      text: string;
      status: AssistantActivityStatus;
      detail?: string | undefined;
    };

export interface AssistantMessageItem {
  id: string;
  role: 'user' | 'assistant';
  parts: readonly AssistantPart[];
  isStreaming?: boolean | undefined;
}

export interface AssistantMessageProps {
  message: AssistantMessageItem;
}

export function AssistantMessage({ message }: AssistantMessageProps) {
  const { role, parts, isStreaming = false } = message;
  if (role === 'user') {
    return (
      <article className={clsx(styles.root, styles.user)} aria-label="You">
        {parts.map((part) => (
          <p key={part.id} className={styles.userText}>
            {part.text}
          </p>
        ))}
      </article>
    );
  }
  const last = parts.at(-1);
  const isWaiting =
    isStreaming && (last === undefined || (last.kind === 'activity' && last.status !== 'running'));
  return (
    <article className={clsx(styles.root, styles.assistant)} aria-label="Assistant">
      {parts.map((part) =>
        part.kind === 'text' ? (
          <AssistantMarkdown
            key={part.id}
            text={part.text}
            isStreaming={isStreaming && part === last}
          />
        ) : (
          <AssistantActivity
            key={part.id}
            text={part.text}
            status={part.status}
            detail={part.detail}
          />
        ),
      )}
      {isWaiting && (
        <span className={styles.typing} role="status" aria-label="The assistant is answering">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
      )}
    </article>
  );
}
