import clsx from "clsx";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import styles from "./Chip.module.scss";

export type ChipVariant = "purple" | "olive" | "yellow" | "muted";

export interface ChipProps extends ComponentPropsWithoutRef<"span"> {
  variant?: ChipVariant;
  href?: string | null | undefined;
  icon?: ReactNode;
  ref?: Ref<HTMLSpanElement>;
}

export function Chip({
  variant = "purple",
  href,
  icon,
  className,
  children,
  ref,
  ...rest
}: ChipProps) {
  const classes = clsx(styles.root, styles[variant], className);
  const label = (
    <>
      {icon ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
    </>
  );

  if (href) {
    return (
      <a
        className={clsx(classes, styles.link)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {label}
      </a>
    );
  }
  return (
    <span ref={ref} className={classes} {...rest}>
      {label}
    </span>
  );
}
