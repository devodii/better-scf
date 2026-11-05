import clsx from 'clsx';
import { type ReactNode, useMemo } from 'react';
import styles from './AssistantMarkdown.module.scss';

export interface AssistantMarkdownProps {
  text: string;
  isStreaming?: boolean;
}

interface ListBlock {
  type: 'list';
  ordered: boolean;
  items: string[];
}

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'code'; text: string }
  | ListBlock;

interface ParseState {
  blocks: Block[];
  paragraph: string[];
  list: ListBlock | null;
  code: string[] | null;
}

const FENCE = /^```/;
const HEADING = /^#{1,6}\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const INLINE = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\[[^\]\n]+\]\([^)\s]+\)|\*[^*\s][^*\n]*\*)/;
const LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

function closeText(state: ParseState): void {
  if (state.paragraph.length > 0) {
    state.blocks.push({ type: 'paragraph', text: state.paragraph.join(' ') });
    state.paragraph = [];
  }
  if (state.list) {
    state.blocks.push(state.list);
    state.list = null;
  }
}

function pushItem(state: ParseState, ordered: boolean, item: string): void {
  if (state.paragraph.length > 0) closeText(state);
  if (state.list && state.list.ordered !== ordered) closeText(state);
  if (!state.list) state.list = { type: 'list', ordered, items: [] };
  state.list.items.push(item);
}

function parseBlocks(text: string): Block[] {
  const state: ParseState = { blocks: [], paragraph: [], list: null, code: null };
  for (const line of text.split('\n')) {
    if (state.code) {
      if (FENCE.test(line.trim())) {
        state.blocks.push({ type: 'code', text: state.code.join('\n') });
        state.code = null;
      } else {
        state.code.push(line);
      }
      continue;
    }
    if (FENCE.test(line.trim())) {
      closeText(state);
      state.code = [];
      continue;
    }
    if (line.trim() === '') {
      closeText(state);
      continue;
    }
    const heading = HEADING.exec(line)?.[1];
    if (heading !== undefined) {
      closeText(state);
      state.blocks.push({ type: 'heading', text: heading });
      continue;
    }
    const bullet = BULLET.exec(line)?.[1];
    if (bullet !== undefined) {
      pushItem(state, false, bullet);
      continue;
    }
    const numbered = ORDERED.exec(line)?.[1];
    if (numbered !== undefined) {
      pushItem(state, true, numbered);
      continue;
    }
    if (state.list) closeText(state);
    state.paragraph.push(line.trim());
  }
  if (state.code) state.blocks.push({ type: 'code', text: state.code.join('\n') });
  closeText(state);
  return state.blocks;
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

function renderInline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, index) => {
    const key = `${index}:${part.length}`;
    if (index % 2 === 0) return part;
    if (part.startsWith('**')) return <strong key={key}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`')) return <code key={key}>{part.slice(1, -1)}</code>;
    if (part.startsWith('[')) {
      const match = LINK.exec(part);
      const label = match?.[1] ?? part;
      const link = match?.[2] === undefined ? null : safeLink(match[2]);
      if (!link) return label;
      return (
        <a
          key={key}
          href={link.href}
          {...(link.external ? { target: '_blank' } : {})}
          rel="noopener noreferrer"
        >
          {label}
        </a>
      );
    }
    return <em key={key}>{part.slice(1, -1)}</em>;
  });
}

export function AssistantMarkdown({ text, isStreaming = false }: AssistantMarkdownProps) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return (
    <div className={clsx(styles.root, isStreaming && styles.isStreaming)}>
      {blocks.map((block, index) => {
        const key = `${index}:${block.type}`;
        switch (block.type) {
          case 'heading':
            return (
              <p key={key} className={styles.heading}>
                {renderInline(block.text)}
              </p>
            );
          case 'code':
            return (
              <pre key={key} className={styles.pre}>
                <code>{block.text}</code>
              </pre>
            );
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul';
            return (
              <Tag key={key} className={styles.list}>
                {block.items.map((item, itemIndex) => {
                  const itemKey = `${itemIndex}:${item.length}`;
                  return <li key={itemKey}>{renderInline(item)}</li>;
                })}
              </Tag>
            );
          }
          default:
            return <p key={key}>{renderInline(block.text)}</p>;
        }
      })}
    </div>
  );
}
