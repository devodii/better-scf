import clsx from 'clsx';
import { useState } from 'react';
import styles from './ReviewerTeamAvatar.module.scss';

export interface ReviewerTeamAvatarProps {
  name: string;
  src?: string | null | undefined;
  href?: string | null | undefined;
}

export function ReviewerTeamAvatar({ name, src, href }: ReviewerTeamAvatarProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  if (!src) {
    if (!href) return null;
    return (
      <a
        className={clsx(styles.root, styles.isLoaded, styles.link, styles.linkOnly)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={styles.srOnly}>{`${name} profile`}</span>
      </a>
    );
  }
  if (status === 'failed') return null;

  const image = (
    <img
      className={styles.image}
      src={src}
      alt={href ? '' : name}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('failed')}
    />
  );
  const classes = clsx(styles.root, status === 'loaded' && styles.isLoaded);

  if (href) {
    return (
      <a
        className={clsx(classes, styles.link)}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} profile`}
      >
        {image}
      </a>
    );
  }
  return <span className={classes}>{image}</span>;
}
