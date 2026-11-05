import { AvatarStack, type AvatarStackPerson } from '../AvatarStack';
import { Chip, type ChipVariant } from '../Chip';
import { Tooltip } from '../Tooltip';
import styles from './CardMeta.module.scss';

export interface CardMetaChip {
  label: string;
  hint: string;
  variant?: ChipVariant;
}

export interface CardMetaProps {
  track?: CardMetaChip | null | undefined;
  awarded?: CardMetaChip | null | undefined;
  people?: readonly AvatarStackPerson[];
}

function MetaChip({ chip }: { chip: CardMetaChip }) {
  return (
    <Tooltip content={chip.hint}>
      <Chip variant={chip.variant ?? 'purple'}>{chip.label}</Chip>
    </Tooltip>
  );
}

export function CardMeta({ track, awarded, people = [] }: CardMetaProps) {
  if (!track && !awarded && people.length === 0) return null;
  return (
    <div className={styles.root}>
      {(track || awarded) && (
        <div className={styles.chips}>
          {track && <MetaChip chip={track} />}
          {awarded && <MetaChip chip={awarded} />}
        </div>
      )}
      <AvatarStack people={people} size="md" max={4} />
    </div>
  );
}
