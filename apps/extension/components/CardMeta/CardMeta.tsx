import { AvatarStack, type AvatarStackPerson } from "../AvatarStack";
import { Chip, type ChipVariant } from "../Chip";
import { Tooltip } from "../Tooltip";
import { TrackIcon, type TrackIconKind } from "../TrackIcon";
import styles from "./CardMeta.module.scss";

export interface CardMetaChip {
  label: string;
  shortLabel?: string;
  hint: string;
  variant?: ChipVariant;
  icon?: TrackIconKind;
}

export interface CardMetaProps {
  track?: CardMetaChip | null | undefined;
  awarded?: CardMetaChip | null | undefined;
  people?: readonly AvatarStackPerson[];
}

function MetaChip({
  chip,
  className,
}: {
  chip: CardMetaChip;
  className?: string | undefined;
}) {
  return (
    <span className={className}>
      <Tooltip content={chip.hint}>
        <Chip
          variant={chip.variant ?? "purple"}
          icon={chip.icon ? <TrackIcon kind={chip.icon} /> : undefined}
        >
          {chip.shortLabel ? (
            <>
              <span className={styles.full}>{chip.label}</span>
              <span className={styles.short}>{chip.shortLabel}</span>
            </>
          ) : (
            chip.label
          )}
        </Chip>
      </Tooltip>
    </span>
  );
}

export function CardMeta({ track, awarded, people = [] }: CardMetaProps) {
  if (!track && !awarded && people.length === 0) return null;
  return (
    <div className={styles.root}>
      <div className={styles.chips}>
        {track && <MetaChip chip={track} className={styles.fixed} />}
        {awarded && <MetaChip chip={awarded} className={styles.shrinking} />}
      </div>
      <AvatarStack
        people={people}
        size="md"
        max={4}
        className={styles.people}
      />
    </div>
  );
}
