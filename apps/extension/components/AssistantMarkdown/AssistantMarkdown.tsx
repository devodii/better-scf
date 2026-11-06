import type { ComponentProps, ReactNode } from 'react';
import { Streamdown } from 'streamdown';
import styles from './AssistantMarkdown.module.scss';

export interface AssistantMarkdownProps {
  text: string;
  isStreaming?: boolean;
}

function safeLink(raw: string): { href: string; external: boolean } | null {
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return { href: url.href, external: url.origin !== window.location.origin };
  } catch {
    return null;
  }
}

function Link({ href, children }: ComponentProps<'a'>): ReactNode {
  const link = href ? safeLink(href) : null;
  if (!link) return children;
  return (
    <a href={link.href} {...(link.external ? { target: '_blank' } : {})} rel="noopener noreferrer">
      {children}
    </a>
  );
}

function Heading({ children }: ComponentProps<'p'>): ReactNode {
  return <p className={styles.heading}>{children}</p>;
}

function Code({ children }: ComponentProps<'code'>): ReactNode {
  return <code>{children}</code>;
}

function Block({ children }: ComponentProps<'pre'>): ReactNode {
  return <pre className={styles.pre}>{children}</pre>;
}

function Table({ children }: ComponentProps<'table'>): ReactNode {
  return (
    <div className={styles.tableWrap}>
      <table>{children}</table>
    </div>
  );
}

const COMPONENTS = {
  a: Link,
  h1: Heading,
  h2: Heading,
  h3: Heading,
  h4: Heading,
  h5: Heading,
  h6: Heading,
  code: Code,
  pre: Block,
  table: Table,
};

export function AssistantMarkdown({ text, isStreaming = false }: AssistantMarkdownProps) {
  return (
    <Streamdown
      className={styles.root ?? ''}
      mode={isStreaming ? 'streaming' : 'static'}
      isAnimating={isStreaming}
      controls={false}
      components={COMPONENTS}
    >
      {text}
    </Streamdown>
  );
}
