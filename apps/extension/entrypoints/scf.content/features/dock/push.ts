import { PANEL_SIDE, type PanelSide } from '../../../../components/Assistant/side';

const ROOT_ATTRIBUTE = 'data-bscf-assistant';
const SIDE_ATTRIBUTE = 'data-bscf-side';
const MOTION_ATTRIBUTE = 'data-bscf-motion';
const WRAPPER_ATTRIBUTE = 'data-bscf-push';
const PIN_ATTRIBUTE = 'data-bscf-pin';
const FIXED_SELECTOR = 'nav, header, aside';
const SETTLE_MS = 360;
const REMOUNT_GRACE_MS = 800;
const BAR_MIN_WIDTH = 0.9;

export interface PagePush {
  set(isOpen: boolean, animate: boolean): void;
  release(): void;
}

let wrapper: Element | null = null;
let pinned: Element[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function findWrapper(): Element {
  return document.querySelector('main') ?? document.body;
}

function pinFixed(root: Element, side: PanelSide): Element[] {
  const found: Element[] = [];
  for (const element of root.querySelectorAll(FIXED_SELECTOR)) {
    if (getComputedStyle(element).position !== 'fixed') continue;
    const rect = element.getBoundingClientRect();
    if (rect.width === 0) continue;
    const isBar = rect.width >= innerWidth * BAR_MIN_WIDTH;
    const isOnSide = side === 'left' ? rect.left < innerWidth / 2 : rect.right > innerWidth / 2;
    if (!isBar && !isOnSide) continue;
    element.setAttribute(PIN_ATTRIBUTE, isBar ? 'bar' : 'edge');
    found.push(element);
  }
  return found;
}

function finish(): void {
  clearTimeout(timer);
  const root = document.documentElement;
  root.removeAttribute(ROOT_ATTRIBUTE);
  root.removeAttribute(SIDE_ATTRIBUTE);
  root.removeAttribute(MOTION_ATTRIBUTE);
  wrapper?.removeAttribute(WRAPPER_ATTRIBUTE);
  for (const element of pinned) element.removeAttribute(PIN_ATTRIBUTE);
  wrapper = null;
  pinned = [];
}

export function createPagePush(side: PanelSide = PANEL_SIDE): PagePush {
  const root = document.documentElement;
  return {
    set(isOpen, animate) {
      clearTimeout(timer);
      if (!isOpen && !wrapper) return;
      if (animate) root.setAttribute(MOTION_ATTRIBUTE, 'animate');
      else root.removeAttribute(MOTION_ATTRIBUTE);
      if (isOpen) {
        const next = findWrapper();
        if (wrapper !== next) wrapper?.removeAttribute(WRAPPER_ATTRIBUTE);
        if (pinned.length === 0) pinned = pinFixed(next, side);
        wrapper = next;
        wrapper.setAttribute(WRAPPER_ATTRIBUTE, '');
        root.setAttribute(SIDE_ATTRIBUTE, side);
        root.setAttribute(ROOT_ATTRIBUTE, 'open');
        return;
      }
      root.removeAttribute(ROOT_ATTRIBUTE);
      if (animate) timer = setTimeout(finish, SETTLE_MS);
      else finish();
    },
    release() {
      clearTimeout(timer);
      timer = setTimeout(finish, REMOUNT_GRACE_MS);
    },
  };
}
