import type { ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { browser, type PublicPath } from "wxt/browser";
import tokens from "../../entrypoints/scf.content/styles/tokens.scss?inline";

export const OWN_ATTRIBUTE = "data-bscf";

const STYLESHEET: string = "content-scripts/scf.css";
const HOST_CSS =
  ":host{all:initial !important}:host{color-scheme:dark !important}";
const DOCUMENT_RULES = /(\s*@(property|font-face)[\s\S]*?{[\s\S]*?})/gm;

export type MountAppend = "first" | "last" | "before" | "after";

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
let documentCss = "";

async function readStylesheet(): Promise<string> {
  const response = await fetch(
    browser.runtime.getURL(STYLESHEET as PublicPath),
  );
  if (!response.ok)
    throw new Error(`stylesheet ${STYLESHEET}: HTTP ${response.status}`);
  const css = await response.text();
  if (!css.trim()) throw new Error(`stylesheet ${STYLESHEET}: empty`);
  return css;
}

function loadSheet(): Promise<CSSStyleSheet> {
  if (loading) return loading;
  const pending = readStylesheet().then((css) => {
    documentCss = Array.from(
      css.matchAll(DOCUMENT_RULES),
      (match) => match[0],
    ).join("");
    const next = new CSSStyleSheet();
    next.replaceSync(
      HOST_CSS +
        tokens +
        css.replace(DOCUMENT_RULES, "").replaceAll(":root", ":host"),
    );
    sheet = next;
    return next;
  });
  pending.catch(() => {
    loading = undefined;
  });
  loading = pending;
  return pending;
}

function installDocumentStyle(): void {
  if (documentStyle || !documentCss.trim()) return;
  documentStyle = document.createElement("style");
  documentStyle.setAttribute(OWN_ATTRIBUTE, "styles");
  documentStyle.textContent = documentCss;
  (document.head ?? document.documentElement).append(documentStyle);
}

export function preloadStyles(): void {
  loadSheet().catch(() => {});
}

export function releaseStyles(): void {
  documentStyle?.remove();
  documentStyle = undefined;
}

function place(anchor: Element, host: Element, append: MountAppend): void {
  switch (append) {
    case "first":
      anchor.prepend(host);
      return;
    case "before":
      anchor.before(host);
      return;
    case "after":
      anchor.after(host);
      return;
    default:
      anchor.append(host);
  }
}

export async function mountShadowUi({
  name,
  anchor,
  append = "last",
  children,
}: MountOptions): Promise<MountedUi> {
  const styles = sheet ?? (await loadSheet());
  installDocumentStyle();
  const host = document.createElement(`bscf-${name}`);
  host.setAttribute(OWN_ATTRIBUTE, name);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.adoptedStyleSheets = [styles];
  const container = document.createElement("div");
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
