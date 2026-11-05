import clsx from 'clsx';
import { type ComponentPropsWithoutRef, type Ref, useState } from 'react';
import styles from './SearchThumbnail.module.scss';

export interface SearchThumbnailProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  src: string | null;
  fallback: string;
  ref?: Ref<HTMLSpanElement>;
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
        <span className={styles.fallback}>{fallback.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
