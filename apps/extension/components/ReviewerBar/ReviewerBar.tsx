import clsx from 'clsx';
import { useId } from 'react';
import type { Stance } from 'shared';
import { IconButton } from '../IconButton';
import { TextField } from '../TextField';
import { Tooltip } from '../Tooltip';
import styles from './ReviewerBar.module.scss';

export type ReviewerNoteStatus = 'idle' | 'saving' | 'saved';
export type ReviewerCopyStatus = 'idle' | 'copied' | 'failed';

export interface ReviewerBarProps {
  stance: Stance;
  onStanceChange: (next: Stance) => void;
  shortlisted: boolean;
  onShortlistChange: (next: boolean) => void;
  note: string;
  onNoteChange: (next: string) => void;
  noteStatus?: ReviewerNoteStatus;
  onCopy: () => void;
  copyStatus?: ReviewerCopyStatus;
  isExpanded: boolean;
  onExpandedChange: (next: boolean) => void;
}

const CHOICES: readonly { stance: Exclude<Stance, 'none'>; label: string }[] = [
  { stance: 'support', label: 'Support' },
  { stance: 'unsure', label: 'Unsure' },
  { stance: 'against', label: 'Against' },
];

const STANCE_LABEL: Record<Stance, string> = {
  none: 'No stance',
  support: 'Support',
  unsure: 'Unsure',
  against: 'Against',
};

function statusText(noteStatus: ReviewerNoteStatus, copyStatus: ReviewerCopyStatus): string {
  if (copyStatus === 'copied') return 'Summary copied';
  if (copyStatus === 'failed') return 'Copy failed';
  if (noteStatus === 'saving') return 'Saving';
  if (noteStatus === 'saved') return 'Saved';
  return '';
}

export function ReviewerBar({
  stance,
  onStanceChange,
  shortlisted,
  onShortlistChange,
  note,
  onNoteChange,
  noteStatus = 'idle',
  onCopy,
  copyStatus = 'idle',
  isExpanded,
  onExpandedChange,
}: ReviewerBarProps) {
  const panelId = useId();

  return (
    <section className={styles.root} aria-label="Private review">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={() => onExpandedChange(!isExpanded)}
      >
        <span className={clsx(styles.pip, styles[stance])} aria-hidden="true" />
        <span className={styles.toggleLabel}>My review</span>
        <span className={styles.toggleState}>
          {STANCE_LABEL[stance]}
          {shortlisted ? ', shortlisted' : ''}
        </span>
        <svg
          className={clsx(styles.chevron, isExpanded && styles.isOpen)}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      <div id={panelId} className={styles.panel} hidden={!isExpanded}>
        <div className={styles.row}>
          <fieldset className={styles.stances} aria-label="Stance">
            {CHOICES.map((choice) => (
              <button
                key={choice.stance}
                type="button"
                className={clsx(styles.choice, styles[choice.stance])}
                aria-pressed={stance === choice.stance}
                onClick={() => onStanceChange(stance === choice.stance ? 'none' : choice.stance)}
              >
                <span className={styles.choicePip} aria-hidden="true" />
                {choice.label}
              </button>
            ))}
          </fieldset>
          <Tooltip content={shortlisted ? 'Remove from shortlist' : 'Add to shortlist'}>
            <IconButton
              label="Shortlist"
              size="md"
              variant="surface"
              className={styles.star}
              isPressed={shortlisted}
              onClick={() => onShortlistChange(!shortlisted)}
            >
              <svg
                viewBox="0 0 16 16"
                fill={shortlisted ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 1.75l1.9 3.85 4.25.62-3.08 3 .73 4.23L8 11.45l-3.8 2 .73-4.23-3.08-3 4.25-.62z" />
              </svg>
            </IconButton>
          </Tooltip>
        </div>
        <TextField
          label="Private note"
          placeholder="Only you can see this"
          maxLength={2000}
          autoComplete="off"
          value={note}
          isLoading={noteStatus === 'saving'}
          loadingLabel="Saving note"
          clearLabel="Clear note"
          onClear={() => onNoteChange('')}
          onChange={(event) => onNoteChange(event.target.value)}
        />
        <div className={styles.footer}>
          <button type="button" className={styles.copy} onClick={onCopy}>
            Copy summary line
          </button>
          <span className={styles.status} role="status" aria-live="polite">
            {statusText(noteStatus, copyStatus)}
          </span>
        </div>
      </div>
    </section>
  );
}
