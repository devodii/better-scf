import { formatMoneyCompact } from "../../lib/format/money";
import { RoundStatTag } from "../RoundStatTag";
import styles from "./RoundStatTags.module.scss";

export interface RoundStatTagsProps {
  awarded?: number | null | undefined;
  awardedUsd?: number | null | undefined;
  paidUsd?: number | null | undefined;
  isHintOpen?: boolean;
}

function positive(value: number | null | undefined): number | null {
  return value !== null &&
    value !== undefined &&
    Number.isFinite(value) &&
    value > 0
    ? value
    : null;
}

export function RoundStatTags({
  awarded,
  awardedUsd,
  paidUsd,
  isHintOpen = false,
}: RoundStatTagsProps) {
  const count = positive(awarded);
  const amount = positive(awardedUsd);
  const paid = positive(paidUsd);
  if (count === null && amount === null) return null;

  const hint = [
    count === null
      ? null
      : `${count} ${count === 1 ? "submission" : "submissions"} awarded`,
    amount === null ? null : `${formatMoneyCompact(amount)} awarded`,
    paid === null ? null : `${formatMoneyCompact(paid)} paid so far`,
  ]
    .filter((part) => part !== null)
    .join(" · ");

  return (
    <ul aria-label="Round awards" className={styles.root}>
      {count === null ? null : (
        <li className={styles.item}>
          <RoundStatTag
            label={`${count} awarded`}
            hint={hint}
            variant="olive"
            isHintOpen={isHintOpen}
          />
        </li>
      )}
      {amount === null ? null : (
        <li className={styles.item}>
          <RoundStatTag
            label={`${formatMoneyCompact(amount)} awarded`}
            hint={hint}
            variant="purple"
            isHintOpen={isHintOpen && count === null}
          />
        </li>
      )}
    </ul>
  );
}
