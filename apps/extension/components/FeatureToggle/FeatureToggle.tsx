import clsx from "clsx";
import { useId, useState } from "react";
import { Collapsible } from "../Collapsible";
import { Toggle } from "../Toggle";
import styles from "./FeatureToggle.module.scss";

export interface FeatureToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  defaultOpen?: boolean;
}

export function FeatureToggle({
  label,
  description,
  checked,
  onChange,
  defaultOpen = false,
}: FeatureToggleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panel = useId();

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.trigger}
          aria-expanded={isOpen}
          aria-controls={panel}
          onClick={() => setIsOpen((current) => !current)}
        >
          <span className={styles.label}>{label}</span>
          <svg
            className={clsx(styles.chevron, isOpen && styles.chevronOpen)}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        <Toggle
          label={label}
          hideLabel
          checked={checked}
          onChange={onChange}
          className={styles.switch}
        />
      </div>
      <Collapsible id={panel} isOpen={isOpen}>
        <p className={styles.description}>{description}</p>
      </Collapsible>
    </div>
  );
}
