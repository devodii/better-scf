import { Chip, type ChipVariant } from "../Chip";
import { Tooltip } from "../Tooltip";
import styles from "./RoundStatTag.module.scss";

export interface RoundStatTagProps {
  label: string;
  hint: string;
  variant?: ChipVariant;
  isHintOpen?: boolean;
}

export function RoundStatTag({
  label,
  hint,
  variant = "purple",
  isHintOpen = false,
}: RoundStatTagProps) {
  return (
    <Tooltip content={hint} isOpen={isHintOpen}>
      <button type="button" className={styles.trigger}>
        <Chip variant={variant} className={styles.chip}>
          {label}
        </Chip>
      </button>
    </Tooltip>
  );
}
