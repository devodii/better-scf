import styles from './GridCounts.module.scss';

export interface GridCountsProps {
  total: number;
  shown: number;
  integration: number;
  open: number;
  rfp: number;
  knownTracks: number;
  opened: number | null;
}

export function GridCounts({
  total,
  shown,
  integration,
  open,
  rfp,
  knownTracks,
  opened,
}: GridCountsProps) {
  const noun = total === 1 ? 'submission' : 'submissions';
  const parts = [shown === total ? `${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`];
  if (integration > 0) parts.push(`${integration} integration`);
  if (open > 0) parts.push(`${open} open`);
  if (rfp > 0) parts.push(`${rfp} rfp`);
  if (integration + open + rfp > 0) parts.push(`tracks known for ${knownTracks}`);
  if (opened !== null) parts.push(`you have opened ${opened}`);
  return (
    <p role="status" className={styles.root}>
      <span>{parts.join(' · ')}</span>
      {shown === 0 && total > 0 && (
        <span className={styles.empty}> No submissions match the current filters.</span>
      )}
    </p>
  );
}
