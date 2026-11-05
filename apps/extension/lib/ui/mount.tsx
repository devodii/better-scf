import type { ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { browser } from 'wxt/browser';

export const OWN_ATTRIBUTE = 'data-bscf';

const STYLESHEET = 'content-scripts/scf.css';
const HOST_CSS = ':host{all:initial !important}:host{color-scheme:dark !important}';
const DOCUMENT_RULES = /(\s*@(property|font-face)[\s\S]*?{[\s\S]*?})/gm;

export type MountAppend = 'first' | 'last' | 'before' | 'after';

export interface MountOptions {
  name: string;
  anchor: Element;
  append?: MountAppend;
  children: ReactNode;
}

export interface MountedUi {
  readonly host: HTMLElement;
  readonly shadow: ShadowRoot;
  render(children: ReactNode): void;
  remove(): void;
}

let sheet: CSSStyleSheet | undefined;
let loading: Promise<CSSStyleSheet> | undefined;
let documentStyle: HTMLStyleElement | undefined;

async function readStylesheet(): Promise<string> {
  try {
    const response = await fetch(new URL(STYLESHEET, browser.runtime.getURL('/')));
    return response.ok ? await response.text() : '';
  } catch {
    return '';
  }
}

function loadSheet(): Promise<CSSStyleSheet> {
  loading ??= readStylesheet().then((css) => {
    const documentCss = Array.from(css.matchAll(DOCUMENT_RULES), (match) => match[0]).join('');
    if (documentCss.trim()) {
      documentStyle = document.createElement('style');
      documentStyle.setAttribute(OWN_ATTRIBUTE, 'styles');
      documentStyle.textContent = documentCss;
      (document.head ?? document.documentElement).append(documentStyle);
    }
    const next = new CSSStyleSheet();
    next.replaceSync(HOST_CSS + css.replace(DOCUMENT_RULES, '').replaceAll(':root', ':host'));
    sheet = next;
    return next;
  });
  return loading;
}

export function releaseStyles(): void {
  documentStyle?.remove();
  documentStyle = undefined;
}

function place(anchor: Element, host: Element, append: MountAppend): void {
  switch (append) {
    case 'first':
      anchor.prepend(host);
      return;
    case 'before':
      anchor.before(host);
      return;
    case 'after':
      anchor.after(host);
      return;
    default:
      anchor.append(host);
  }
}

export async function mountShadowUi({
  name,
  anchor,
  append = 'last',
  children,
}: MountOptions): Promise<MountedUi> {
  const styles = sheet ?? (await loadSheet());
  const host = document.createElement(`bscf-${name}`);
  host.setAttribute(OWN_ATTRIBUTE, name);
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.adoptedStyleSheets = [styles];
  const container = document.createElement('div');
  shadow.append(container);
  place(anchor, host, append);
  let root: Root | null = createRoot(container);
  root.render(children);
  return {
    host,
    shadow,
    render(next) {
      root?.render(next);
    },
    remove() {
      if (!root) return;
      root.unmount();
      root = null;
      host.remove();
    },
  };
}
