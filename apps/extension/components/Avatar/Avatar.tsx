import clsx from "clsx";
import { useState } from "react";
import styles from "./Avatar.module.scss";

export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarProps {
  name: string;
  src?: string | null | undefined;
  href?: string | null | undefined;
  size?: AvatarSize;
  className?: string | undefined;
  "aria-describedby"?: string | undefined;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0];
  if (!first) return "?";
  const last = words.length > 1 ? words[words.length - 1] : "";
  return `${Array.from(first)[0] ?? ""}${Array.from(last ?? "")[0] ?? ""}`.toUpperCase();
}

export function Avatar({
  name,
  src,
  href,
  size = "md",
  className,
  "aria-describedby": describedBy,
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const content =
    src && src !== failedSrc ? (
      <img
        className={styles.image}
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
      />
    ) : (
      <span className={styles.initials} aria-hidden="true">
        {initials(name)}
      </span>
    );
  const classes = clsx(styles.root, styles[size], className);

  if (href) {
    return (
      <a
        className={clsx(classes, styles.link)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={name}
        aria-describedby={describedBy}
      >
        {content}
      </a>
    );
  }
  return (
    <span
      className={classes}
      role="img"
      aria-label={name}
      aria-describedby={describedBy}
    >
      {content}
    </span>
  );
}
