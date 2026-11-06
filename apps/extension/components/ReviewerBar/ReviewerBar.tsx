import clsx from 'clsx';
import { useId } from 'react';
import type { Stance } from 'shared';
import { CardCorner } from '../CardCorner';
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
          <CardCorner
            stance={stance}
            onStanceChange={onStanceChange}
            shortlisted={shortlisted}
            onShortlistChange={onShortlistChange}
          />
          <span className={styles.stanceLabel}>
            {STANCE_LABEL[stance]}
            {shortlisted ? ', shortlisted' : ''}
          </span>
        </div>
        <label className={styles.noteLabel}>
          <span className={styles.noteTitle}>Private note</span>
          <textarea
            className={styles.note}
            rows={3}
            maxLength={2000}
            autoComplete="off"
            placeholder="Only you can see this"
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>
        <div className={styles.footer}>
          <span className={styles.status} role="status" aria-live="polite">
            {statusText(noteStatus, copyStatus)}
          </span>
          <button type="button" className={styles.copy} onClick={onCopy}>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
              <path d="M10.5 5.5v-2a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3.5V9A1.5 1.5 0 0 0 4 10.5h1.5" />
            </svg>
            Copy summary
          </button>
        </div>
      </div>
    </section>
  );
}
