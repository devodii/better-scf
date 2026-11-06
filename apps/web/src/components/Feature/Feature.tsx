import clsx from "clsx";
import type { ReactNode } from "react";
import styles from "./Feature.module.scss";

export interface FeatureProps {
  title: string;
  text: string;
  isReversed?: boolean;
  children: ReactNode;
}

export function Feature({
  title,
  text,
  isReversed = false,
  children,
}: FeatureProps) {
  return (
    <section className={clsx(styles.root, isReversed && styles.reversed)}>
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.text}>{text}</p>
      </div>
      <div className={styles.media}>{children}</div>
    </section>
  );
}
