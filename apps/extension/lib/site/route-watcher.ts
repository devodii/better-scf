import { OWN_ATTRIBUTE } from '../ui/mount';
import type { Route } from './routes';

const MAIN_REGION = 'main';
const SUBTREE: MutationObserverInit = { childList: true, subtree: true };
const CHILDREN: MutationObserverInit = { childList: true };

export interface RouteWatcherOptions {
  onRoute: () => void;
  onMutation: (replaced: boolean) => void;
}

export interface RouteWatcher {
  region(): Element | null;
  stop(): void;
}

export function pageKey(route: Route): string {
  switch (route.kind) {
    case 'round':
      return `round:${route.roundId}`;
    case 'submission':
      return `submission:${route.submissionId}`;
    case 'publicSubmission':
      return `public-submission:${route.submissionId}`;
    default:
      return route.kind;
  }
}

function currentPath(): string {
  return location.pathname + location.search;
}

function isOwnNode(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(OWN_ATTRIBUTE);
}

function isSiteElement(node: Node): boolean {
  return node instanceof Element && !node.hasAttribute(OWN_ATTRIBUTE);
}

function isOwnMutation(record: MutationRecord): boolean {
  for (const node of record.addedNodes) if (!isOwnNode(node)) return false;
  for (const node of record.removedNodes) if (!isOwnNode(node)) return false;
  return true;
}

function replacesContent(region: Element, records: readonly MutationRecord[]): boolean {
  let removed = false;
  let added = false;
  for (const record of records) {
    if (record.target !== region && !region.contains(record.target)) continue;
    if (!removed) for (const node of record.removedNodes) if (isSiteElement(node)) removed = true;
    if (!added) for (const node of record.addedNodes) if (isSiteElement(node)) added = true;
    if (removed && added) return true;
  }
  return false;
}

export function watchRoutes({ onRoute, onMutation }: RouteWatcherOptions): RouteWatcher {
  let path = currentPath();
  let region: Element | null = null;
  let wide = false;
  let frame = 0;
  let replaced = false;

  const bind = (): boolean => {
    const next = document.querySelector(MAIN_REGION);
    if (next === region && (next !== null || wide)) return false;
    observer.disconnect();
    region = next;
    wide = next === null;
    if (!next) {
      observer.observe(document.body ?? document.documentElement, SUBTREE);
      return false;
    }
    observer.observe(next, SUBTREE);
    for (let node = next.parentNode; node && node !== document; node = node.parentNode) {
      observer.observe(node, CHILDREN);
    }
    return true;
  };

  const rebind = (): void => {
    if (bind()) replaced = true;
  };

  const checkPath = (): void => {
    const next = currentPath();
    if (next === path) return;
    path = next;
    replaced = false;
    rebind();
    onRoute();
    if (frame === 0) frame = requestAnimationFrame(flush);
  };

  const flush = (): void => {
    frame = 0;
    checkPath();
    rebind();
    const changed = replaced;
    replaced = false;
    onMutation(changed);
  };

  const observer = new MutationObserver((records) => {
    checkPath();
    if (records.every(isOwnMutation)) return;
    if (!replaced && region && replacesContent(region, records)) replaced = true;
    if (frame === 0) frame = requestAnimationFrame(flush);
  });

  const onNavigate = (): void => {
    checkPath();
  };

  // A History API patch here would only wrap this isolated world's `history`, never the page's own pushState calls; the Navigation API event is dispatched to every world.
  const navigation: Navigation | undefined = window.navigation;
  navigation?.addEventListener('currententrychange', onNavigate);
  window.addEventListener('popstate', onNavigate);
  bind();

  return {
    region() {
      if (!region?.isConnected) rebind();
      return region;
    },
    stop() {
      observer.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
      navigation?.removeEventListener('currententrychange', onNavigate);
      window.removeEventListener('popstate', onNavigate);
    },
  };
}
