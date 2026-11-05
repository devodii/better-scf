import clsx from 'clsx';
import styles from './DockPrompts.module.scss';

export interface DockPromptItem {
  id: string;
  text: string;
}

export interface DockPromptsProps {
  prompts: readonly DockPromptItem[];
  onSelect: (prompt: DockPromptItem) => void;
  isDisabled?: boolean;
  className?: string | undefined;
}

export function DockPrompts({
  prompts,
  onSelect,
  isDisabled = false,
  className,
}: DockPromptsProps) {
  if (prompts.length === 0) return null;
  return (
    <fieldset className={clsx(styles.root, className)} aria-label="Suggested questions">
      {prompts.map((prompt) => (
        <button
          key={prompt.id}
          type="button"
          className={styles.pill}
          disabled={isDisabled}
          onClick={() => onSelect(prompt)}
        >
          {prompt.text}
        </button>
      ))}
    </fieldset>
  );
}
