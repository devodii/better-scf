import clsx from 'clsx';
import styles from './AssistantPrompts.module.scss';

export interface AssistantPromptItem {
  id: string;
  text: string;
}

export interface AssistantPromptsProps {
  prompts: readonly AssistantPromptItem[];
  onSelect: (prompt: AssistantPromptItem) => void;
  isDisabled?: boolean;
  className?: string | undefined;
}

export function AssistantPrompts({
  prompts,
  onSelect,
  isDisabled = false,
  className,
}: AssistantPromptsProps) {
  if (prompts.length === 0) return null;
  return (
    <fieldset className={clsx(styles.root, className)} aria-label="Suggested questions">
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          type="button"
          className={styles.chip}
          disabled={isDisabled}
          onClick={() => onSelect(prompt)}
        >
          {prompt.text}
        </button>
      ))}
    </fieldset>
  );
}
