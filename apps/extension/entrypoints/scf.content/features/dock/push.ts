const ROOT_ATTRIBUTE = 'data-bscf-assistant';
const WRAPPER_ATTRIBUTE = 'data-bscf-push';
const SETTLE_MS = 360;
const REMOUNT_GRACE_MS = 800;
const TOP_BAR_MIN_WIDTH = 0.9;
const TOP_BAR_MAX_HEIGHT = 0.3;

export interface PagePush {
  set(isOpen: boolean, animate: boolean): void;
  release(): void;
}

let wrapper: Element | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function findWrapper(): Element {
  return document.querySelector('main') ?? document.body;
}

function finish(): void {
  clearTimeout(timer);
  document.documentElement.removeAttribute(ROOT_ATTRIBUTE);
  wrapper?.removeAttribute(WRAPPER_ATTRIBUTE);
  wrapper = null;
}

export function measureTopBar(): number {
  let bottom = 0;
  for (const element of findWrapper().querySelectorAll('nav, header')) {
    if (getComputedStyle(element).position !== 'fixed') continue;
    const rect = element.getBoundingClientRect();
    if (
      rect.top <= 1 &&
      rect.width >= innerWidth * TOP_BAR_MIN_WIDTH &&
      rect.height <= innerHeight * TOP_BAR_MAX_HEIGHT
    ) {
      bottom = Math.max(bottom, rect.bottom);
    }
  }
  return Math.round(bottom);
}

export function createPagePush(): PagePush {
  return {
    set(isOpen, animate) {
      clearTimeout(timer);
      if (isOpen) {
        const next = findWrapper();
        if (wrapper !== next) wrapper?.removeAttribute(WRAPPER_ATTRIBUTE);
        wrapper = next;
        wrapper.setAttribute(WRAPPER_ATTRIBUTE, animate ? 'animate' : 'static');
        document.documentElement.setAttribute(ROOT_ATTRIBUTE, 'open');
        return;
      }
      document.documentElement.removeAttribute(ROOT_ATTRIBUTE);
      if (!wrapper) return;
      if (!animate) {
        finish();
        return;
      }
      wrapper.setAttribute(WRAPPER_ATTRIBUTE, 'animate');
      timer = setTimeout(finish, SETTLE_MS);
    },
    release() {
      clearTimeout(timer);
      timer = setTimeout(finish, REMOUNT_GRACE_MS);
    },
  };
}
