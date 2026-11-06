import clsx from 'clsx';
import { AssistantActivity, type AssistantActivityStatus } from '../AssistantActivity';
import { AssistantConfirm, type AssistantConfirmStatus } from '../AssistantConfirm';
import { AssistantMarkdown } from '../AssistantMarkdown';
import styles from './AssistantMessage.module.scss';

export type AssistantDecision = 'allow' | 'deny';

export type AssistantPart =
  | { kind: 'text'; id: string; text: string }
  | {
      kind: 'activity';
      id: string;
      text: string;
      status: AssistantActivityStatus;
      detail?: string | undefined;
    }
  | { kind: 'confirm'; id: string; text: string; status: AssistantConfirmStatus };

export interface AssistantMessageItem {
  id: string;
  role: 'user' | 'assistant';
  parts: readonly AssistantPart[];
  isStreaming?: boolean | undefined;
}

export interface AssistantMessageProps {
  message: AssistantMessageItem;
  onDecision?: ((id: string, decision: AssistantDecision) => void) | undefined;
}

export function AssistantMessage({ message, onDecision }: AssistantMessageProps) {
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
    isStreaming &&
    (last === undefined ||
      (last.kind === 'activity' && last.status !== 'running') ||
      (last.kind === 'confirm' && last.status !== 'pending'));
  return (
    <article className={clsx(styles.root, styles.assistant)} aria-label="Assistant">
      {parts.map((part) => {
        switch (part.kind) {
          case 'text':
            return (
              <AssistantMarkdown
                key={part.id}
                text={part.text}
                isStreaming={isStreaming && part === last}
              />
            );
          case 'activity':
            return (
              <AssistantActivity
                key={part.id}
                text={part.text}
                status={part.status}
                detail={part.detail}
              />
            );
          case 'confirm':
            return (
              <AssistantConfirm
                key={part.id}
                text={part.text}
                status={part.status}
                onAllow={() => onDecision?.(part.id, 'allow')}
                onDeny={() => onDecision?.(part.id, 'deny')}
              />
            );
          default:
            return part satisfies never;
        }
      })}
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
