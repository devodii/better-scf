import { defineContentScript } from 'wxt/utils/define-content-script';

const REQUEST = 'bscf-swiper-request';
const RESPONSE = 'bscf-swiper-response';
const HYDRATION_REQUEST = 'bscf-hydration-request';
const HYDRATED = 'bscf-hydrated';
const QUIET_MS = 150;
const IDLE_CEILING_MS = 2000;

interface Instance {
  active: number;
  total: number;
  go(index: number): void;
}

function instanceOf(element: Element): Instance | null {
  const swiper: unknown = Reflect.get(element, 'swiper');
  if (typeof swiper !== 'object' || swiper === null) return null;
  if (!('activeIndex' in swiper) || !('slides' in swiper) || !('slideTo' in swiper)) return null;
  const { activeIndex, slides, slideTo } = swiper;
  if (
    typeof activeIndex !== 'number' ||
    typeof slides !== 'object' ||
    slides === null ||
    !('length' in slides) ||
    typeof slides.length !== 'number' ||
    typeof slideTo !== 'function'
  ) {
    return null;
  }
  const total = slides.length;
  return {
    active: activeIndex,
    total,
    go(index) {
      slideTo.call(swiper, index, 0);
    },
  };
}

function parse(detail: unknown): { id: string; index: number | null } | null {
  if (typeof detail !== 'string') return null;
  try {
    const value: unknown = JSON.parse(detail);
    if (typeof value !== 'object' || value === null || !('id' in value)) return null;
    const index = 'index' in value && typeof value.index === 'number' ? value.index : null;
    return typeof value.id === 'string' ? { id: value.id, index } : null;
  } catch {
    return null;
  }
}

function hasReactRoot(): boolean {
  const containers = [
    document,
    document.documentElement,
    document.body,
    document.getElementById('__next'),
  ];
  return containers.some(
    (container) =>
      container !== null &&
      Object.keys(container).some(
        (key) => key.startsWith('__reactContainer$') || key === '_reactRootContainer',
      ),
  );
}

function structureReady(): boolean {
  return document.querySelector('next-route-announcer') !== null && hasReactRoot();
}

let structure: Promise<void> | null = null;

function awaitStructure(): Promise<void> {
  if (structureReady()) return Promise.resolve();
  structure ??= new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!structureReady()) return;
      observer.disconnect();
      structure = null;
      resolve();
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  return structure;
}

function awaitQuiet(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => requestIdleCallback(() => resolve(), { timeout: IDLE_CEILING_MS }), QUIET_MS);
  });
}

let epoch = 0;

async function signalHydrated(): Promise<void> {
  const current = ++epoch;
  await awaitStructure();
  await awaitQuiet();
  if (current === epoch) document.dispatchEvent(new Event(HYDRATED));
}

export default defineContentScript({
  matches: ['https://communityfund.stellar.org/*'],
  world: 'MAIN',
  runAt: 'document_start',
  main() {
    document.addEventListener(HYDRATION_REQUEST, () => void signalHydrated());
    void signalHydrated();
    document.addEventListener(REQUEST, (event) => {
      if (!(event instanceof CustomEvent) || !(event.target instanceof Element)) return;
      const request = parse(event.detail);
      if (!request) return;
      const instance = instanceOf(event.target);
      if (instance && request.index !== null) instance.go(request.index);
      const after = instance ? instanceOf(event.target) : null;
      document.dispatchEvent(
        new CustomEvent(RESPONSE, {
          detail: JSON.stringify({
            id: request.id,
            active: after?.active ?? 0,
            total: after?.total ?? 0,
          }),
        }),
      );
    });
  },
});
