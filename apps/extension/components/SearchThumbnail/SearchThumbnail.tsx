import clsx from 'clsx';
import { type ComponentPropsWithoutRef, type Ref, useState } from 'react';
import styles from './SearchThumbnail.module.scss';

export interface SearchThumbnailProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  src: string | null;
  fallback: string;
  ref?: Ref<HTMLSpanElement>;
}

function initials(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .toUpperCase();
}

export function SearchThumbnail({ src, fallback, className, ref, ...rest }: SearchThumbnailProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src !== null && failedSrc !== src;

  return (
    <span ref={ref} aria-hidden="true" className={clsx(styles.root, className)} {...rest}>
      {showImage ? (
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
        <span className={styles.fallback}>{initials(fallback)}</span>
      )}
    </span>
  );
}
