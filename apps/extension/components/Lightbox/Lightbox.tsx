import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { IconButton } from '../IconButton';
import { Spinner } from '../Spinner';
import styles from './Lightbox.module.scss';

export interface LightboxProps {
  src: string;
  label: string;
  caption?: string | undefined;
  onClose: () => void;
}

const FOCUSABLE = 'button:not(:disabled):not([tabindex="-1"]), a[href]';

function deepActive(): HTMLElement | null {
  let node: Element | null = document.activeElement;
  while (node?.shadowRoot?.activeElement) node = node.shadowRoot.activeElement;
  return node instanceof HTMLElement ? node : null;
}

export function Lightbox({ src, label, caption, onClose }: LightboxProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [isActualSize, setIsActualSize] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const closeHandler = useRef(onClose);

  useEffect(() => {
    closeHandler.current = onClose;
  });

  useEffect(() => {
    const opener = deepActive();
    const html = document.documentElement;
    const body = document.body;
    const overflow = [html.style.overflow, body.style.overflow] as const;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    closeButton.current?.focus({ preventScroll: true });

    const onKeydown = (event: KeyboardEvent): void => {
      const root = dialog.current;
      if (!root) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeHandler.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const targets = root.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first || !last) {
        event.preventDefault();
        return;
      }
      const scope = root.getRootNode();
      const active =
        scope instanceof ShadowRoot || scope instanceof Document ? scope.activeElement : null;
      if (!active || !root.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onFocusIn = (event: FocusEvent): void => {
      const root = dialog.current;
      if (root && !event.composedPath().includes(root)) closeButton.current?.focus();
    };

    window.addEventListener('keydown', onKeydown, true);
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      window.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('focusin', onFocusIn, true);
      html.style.overflow = overflow[0];
      body.style.overflow = overflow[1];
      if (opener && opener !== body && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div ref={dialog} className={styles.root} role="dialog" aria-modal="true" aria-label={label}>
      <button
        type="button"
        className={styles.scrim}
        tabIndex={-1}
        aria-label="Close image viewer"
        onClick={onClose}
      />
      <div className={styles.bar}>
        <p className={styles.caption}>{caption}</p>
        <div className={styles.actions}>
          <IconButton
            label={isActualSize ? 'Fit image to screen' : 'Show image at actual size'}
            variant="surface"
            size="lg"
            className={styles.action}
            isPressed={isActualSize}
            disabled={status !== 'loaded'}
            onClick={() => setIsActualSize(!isActualSize)}
          >
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14M5 7h4M7 5v4" />
            </svg>
          </IconButton>
          <IconButton
            ref={closeButton}
            label="Close image viewer"
            variant="surface"
            size="lg"
            className={styles.action}
            onClick={onClose}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </IconButton>
        </div>
      </div>
      <div className={styles.stage}>
        {status === 'loading' && <Spinner className={styles.spinner} label="Loading image" />}
        {status === 'failed' ? (
          <p className={styles.message} role="alert">
            The image could not be loaded.
          </p>
        ) : (
          <img
            className={clsx(
              styles.image,
              status === 'loaded' && styles.isLoaded,
              isActualSize && styles.isActualSize,
            )}
            src={src}
            alt={label}
            decoding="async"
            referrerPolicy="no-referrer"
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('failed')}
          />
        )}
      </div>
    </div>
  );
}
