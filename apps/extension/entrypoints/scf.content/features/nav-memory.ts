import dayjs from 'dayjs';
import { z } from 'zod';
import type { Feature } from '../../../lib/ui/feature';
import { OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import ringCss from '../styles/nav-memory.scss?inline';

const KEY_PREFIX = 'bscf-nav:';
export const SEARCH_PREFIX = 'bscf-search:';
export const TTL_MS = 30 * 60 * 1000;
export const WAIT_MS = 3000;
const RING_MS = 1200;
const SWIPER_REQUEST = 'bscf-swiper-request';
const SWIPER_RESPONSE = 'bscf-swiper-response';
const MAX_CLIMB = 10;
const CARD_TEXT_CHARS = 160;
const RING_ATTRIBUTE = 'data-bscf-nav-ring';

const SWIPER = '.swiper';
const WRAPPER = '.swiper-wrapper';
const SLIDE = '.swiper-slide';
const ACTIVE_SLIDE = 'swiper-slide-active';
const INITIALIZED = 'swiper-initialized';
const HEADING = 'h1,h2,h3,h4,h5,h6';
const NEXT_ICON = 'img[alt="right_icon"]';
const SEE_ALL_TEXT = 'see all';
const HIDE_TEXT = 'hide';
const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

const savedSchema = z.object({
  ts: z.number(),
  y: z.number(),
  sections: z.record(
    z.string(),
    z.object({ index: z.number().int().nonnegative(), open: z.boolean() }),
  ),
  card: z
    .object({ section: z.string(), index: z.number().int().nonnegative(), text: z.string() })
    .nullable(),
});

type Saved = z.infer<typeof savedSchema>;
type Card = Saved['card'];

interface Section {
  id: string;
  header: Element;
  box: Element;
  swiper: HTMLElement | null;
  next: HTMLElement | null;
  toggle: HTMLElement | null;
}

interface Ring {
  slide: Element;
  style: HTMLStyleElement;
  timer: ReturnType<typeof setTimeout>;
}

const clean = (text: string | null | undefined): string => (text ?? '').replace(/\s+/g, ' ').trim();
export const currentEntry = (): string =>
  window.navigation?.currentEntry?.key ?? location.pathname + location.search;
const slideText = (slide: Element): string => clean(slide.textContent).slice(0, CARD_TEXT_CHARS);

let pending: string | null = null;
let ring: Ring | null = null;

export function returningEntry(): string | null {
  const entry = currentEntry();
  return pending === entry ? entry : null;
}

function trackTraversal(): void {
  for (const entry of performance.getEntriesByType('navigation')) {
    if (entry instanceof PerformanceNavigationTiming && entry.type === 'back_forward') {
      pending = currentEntry();
    }
  }
  const navigation = window.navigation;
  if (navigation) {
    navigation.addEventListener('currententrychange', (event) => {
      if (event.navigationType === 'traverse') pending = currentEntry();
      else if (event.navigationType === 'push') pending = null;
    });
  } else {
    window.addEventListener('popstate', () => {
      pending = currentEntry();
    });
  }
}

trackTraversal();

function readSaved(entry: string): Saved | null {
  const key = KEY_PREFIX + entry;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    if (parsed.success && dayjs().valueOf() - parsed.data.ts <= TTL_MS) return parsed.data;
    sessionStorage.removeItem(key);
  } catch {
    return null;
  }
  return null;
}

function writeSaved(entry: string, saved: Saved): void {
  try {
    sessionStorage.setItem(KEY_PREFIX + entry, JSON.stringify(saved));
  } catch {
    return;
  }
}

function hasSearch(entry: string): boolean {
  try {
    return sessionStorage.getItem(SEARCH_PREFIX + entry) !== null;
  } catch {
    return false;
  }
}

const replySchema = z.object({ id: z.string(), active: z.number(), total: z.number() });

let requestCounter = 0;

function askSwiper(
  swiper: Element,
  index: number | null,
): { active: number; total: number } | null {
  const id = `r${++requestCounter}`;
  const got: { reply: z.infer<typeof replySchema> | null } = { reply: null };
  const onReply = (event: Event): void => {
    if (!(event instanceof CustomEvent) || typeof event.detail !== 'string') return;
    try {
      const parsed = replySchema.safeParse(JSON.parse(event.detail));
      if (parsed.success && parsed.data.id === id) got.reply = parsed.data;
    } catch {
      return;
    }
  };
  document.addEventListener(SWIPER_RESPONSE, onReply);
  swiper.dispatchEvent(
    new CustomEvent(SWIPER_REQUEST, { bubbles: true, detail: JSON.stringify({ id, index }) }),
  );
  document.removeEventListener(SWIPER_RESPONSE, onReply);
  return got.reply && got.reply.total > 0 ? got.reply : null;
}

export function clearRing(): void {
  if (!ring) return;
  clearTimeout(ring.timer);
  ring.slide.removeAttribute(RING_ATTRIBUTE);
  ring.style.remove();
  ring = null;
}

export function showRing(slide: Element): void {
  clearRing();
  const style = document.createElement('style');
  style.setAttribute(OWN_ATTRIBUTE, 'nav-memory');
  style.textContent = ringCss;
  const root = slide.getRootNode();
  (root instanceof ShadowRoot ? root : (document.head ?? document.documentElement)).append(style);
  slide.setAttribute(RING_ATTRIBUTE, '');
  ring = { slide, style, timer: setTimeout(clearRing, RING_MS) };
}

export function centerInView(element: Element): void {
  const rect = element.getBoundingClientRect();
  const top = window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
  window.scrollTo({ top: Math.max(0, Math.round(top)), behavior: 'instant' });
}

export function untilInput(): AbortController {
  const own = new AbortController();
  const stop = (): void => own.abort();
  for (const type of USER_INPUT) {
    window.addEventListener(type, stop, { once: true, passive: true, signal: own.signal });
  }
  return own;
}

function findHeader(root: Element, control: Element): Element | null {
  let node = control.parentElement;
  for (let depth = 0; node && depth < MAX_CLIMB; depth++) {
    if (node.querySelectorAll(NEXT_ICON).length > 1) return null;
    if (node.querySelector(HEADING)) return node;
    if (node === root) return null;
    node = node.parentElement;
  }
  return null;
}

function readSections(root: Element): Section[] {
  const controls = new Map<Element, { next: HTMLElement | null; toggle: HTMLElement | null }>();
  for (const button of root.querySelectorAll<HTMLElement>('button')) {
    const text = clean(button.textContent).toLowerCase();
    const isToggle = text === SEE_ALL_TEXT || text === HIDE_TEXT;
    if (!isToggle && (text || !button.querySelector(NEXT_ICON))) continue;
    const header = findHeader(root, button);
    if (!header) continue;
    const entry = controls.get(header) ?? { next: null, toggle: null };
    if (isToggle) entry.toggle = button;
    else entry.next = button;
    controls.set(header, entry);
  }
  const sections: Section[] = [];
  const counts = new Map<string, number>();
  for (const [header, { next, toggle }] of controls) {
    const base =
      clean(header.querySelector(HEADING)?.textContent).toLowerCase() || `#${sections.length}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    const box = header.parentElement ?? header;
    sections.push({
      id: seen === 0 ? base : `${base}|${seen}`,
      header,
      box,
      swiper: box.querySelector<HTMLElement>(SWIPER),
      next,
      toggle,
    });
  }
  return sections;
}

function activeIndex(swiper: Element): number {
  let index = 0;
  for (const slide of swiper.querySelectorAll(SLIDE)) {
    if (slide.classList.contains(ACTIVE_SLIDE)) return index;
    index++;
  }
  return 0;
}

const isOpen = (section: Section): boolean =>
  section.toggle !== null && clean(section.toggle.textContent).toLowerCase() === HIDE_TEXT;

function cardsOf(section: Section): Element[] {
  if (section.swiper && !isOpen(section)) return [...section.swiper.querySelectorAll(SLIDE)];
  const cards: Element[] = [];
  for (const child of section.box.children) {
    if (child !== section.header) cards.push(...child.children);
  }
  return cards;
}

function locateCard(root: Element, target: Element): Card {
  for (const section of readSections(root)) {
    if (!section.box.contains(target)) continue;
    const cards = cardsOf(section);
    const index = cards.findIndex((node) => node.contains(target));
    const found = cards[index];
    return found ? { section: section.id, index, text: slideText(found) } : null;
  }
  const slide = target.closest(SLIDE);
  if (!slide) return null;
  return {
    section: '',
    index: [...root.querySelectorAll(SLIDE)].indexOf(slide),
    text: slideText(slide),
  };
}

function findCard(root: Element, card: NonNullable<Card>): Element | null {
  const section = readSections(root).find((s) => s.id === card.section);
  const cards = section ? cardsOf(section) : [...root.querySelectorAll(SLIDE)];
  const direct = cards[card.index];
  if (direct && slideText(direct) === card.text) return direct;
  return cards.find((node) => slideText(node) === card.text) ?? null;
}

function capture(root: Element, card: Card): Saved {
  const sections: Saved['sections'] = {};
  for (const section of readSections(root)) {
    const index = section.swiper
      ? (askSwiper(section.swiper, null)?.active ?? activeIndex(section.swiper))
      : 0;
    const open = isOpen(section);
    if (index > 0 || open) sections[section.id] = { index, open };
  }
  return { ts: dayjs().valueOf(), y: Math.round(window.scrollY), sections, card };
}

export function until(
  root: Node,
  check: () => boolean,
  signal: AbortSignal,
  deadline: number,
  afterMutation: boolean,
): Promise<void> {
  return new Promise((resolve) => {
    const remaining = deadline - performance.now();
    if (signal.aborted || remaining <= 0 || (!afterMutation && check())) {
      resolve();
      return;
    }
    let frame = 0;
    const finish = (): void => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (check()) finish();
      });
    });
    const timer = setTimeout(finish, remaining);
    signal.addEventListener('abort', finish, { once: true });
    observer.observe(root, { childList: true, subtree: true });
  });
}

function advance(section: Section, target: number): boolean {
  const { swiper, next } = section;
  if (!swiper || !next) return false;
  const clicks = target - activeIndex(swiper);
  for (let i = 0; i < clicks; i++) next.click();
  const wrapper = swiper.querySelector(WRAPPER);
  if (wrapper) {
    for (const animation of wrapper.getAnimations()) animation.finish();
  }
  return true;
}

function slideTo(section: Section, target: number): boolean {
  if (!section.swiper) return false;
  return askSwiper(section.swiper, target) !== null || advance(section, target);
}

function showCard(root: Element, card: NonNullable<Card>, element: Element): void {
  const section = readSections(root).find((s) => s.id === card.section);
  const swiper = section?.swiper;
  if (section && swiper && !isOpen(section)) {
    const box = swiper.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    if (rect.left < box.left - 1 || rect.right > box.right + 1) {
      slideTo(section, cardsOf(section).indexOf(element));
    }
  }
  centerInView(element);
}

export const feature: Feature = {
  pages: ['roundList', 'round', 'submission', 'myProjects', 'other'],
  toggles: ['navigationMemory'],
  mount({ region, signal, warn, page, store }) {
    let key = currentEntry();
    let card: Card = null;
    let restoring: AbortController | null = null;

    if (page.kind === 'submission') {
      store.rpc.markOpened(page.submissionId).catch((error: unknown) => warn('mark opened', error));
    }

    const restore = async (saved: Saved, cancel: AbortSignal, fresh: boolean): Promise<void> => {
      const deadline = performance.now() + WAIT_MS;
      const wanted = Object.entries(saved.sections);
      const ready = (): boolean => {
        const sections = readSections(region);
        return wanted.every(([id, target]) => {
          const section = sections.find((s) => s.id === id);
          if (!section || (target.open && !section.toggle)) return false;
          if (target.index === 0) return true;
          const { swiper } = section;
          return (
            !!swiper &&
            swiper.classList.contains(INITIALIZED) &&
            swiper.querySelectorAll(SLIDE).length > target.index
          );
        });
      };
      await until(region, ready, cancel, deadline, fresh);
      if (cancel.aborted) return;
      const sections = readSections(region);
      for (const [id, target] of wanted) {
        const section = sections.find((s) => s.id === id);
        if (!section) {
          warn(`carousel not found: ${id}`);
          continue;
        }
        if (target.index > 0 && !slideTo(section, target.index))
          warn(`carousel not movable: ${id}`);
      }
      const opened = wanted.filter(([, target]) => target.open);
      if (opened.length > 0) {
        const current = readSections(region);
        for (const [id] of opened) {
          const section = current.find((s) => s.id === id);
          if (section?.toggle && !isOpen(section)) section.toggle.click();
        }
      }
      const wantedCard = saved.card;
      if (!wantedCard) {
        const fits = (): boolean =>
          document.documentElement.scrollHeight >= saved.y + window.innerHeight;
        if (saved.y <= 0) return;
        await until(region, fits, cancel, deadline, false);
        if (!cancel.aborted && fits()) window.scrollTo({ top: saved.y, behavior: 'instant' });
        return;
      }
      await until(
        region,
        () => findCard(region, wantedCard) !== null,
        cancel,
        performance.now() + WAIT_MS,
        false,
      );
      if (cancel.aborted) return;
      const element = findCard(region, wantedCard);
      if (!element) {
        warn('returned card not found');
        return;
      }
      showCard(region, wantedCard, element);
      showRing(element);
    };

    const begin = async (fresh: boolean): Promise<void> => {
      restoring?.abort();
      const entry = key;
      const saved = pending === entry && !hasSearch(entry) ? readSaved(entry) : null;
      if (!saved) {
        queueMicrotask(() => {
          if (pending === entry) pending = null;
        });
        return;
      }
      card = saved.card;
      const own = untilInput();
      restoring = own;
      try {
        await restore(saved, AbortSignal.any([signal, own.signal]), fresh);
      } catch (error) {
        warn('restore failed', error);
      } finally {
        own.abort();
        if (restoring === own) restoring = null;
      }
      if (!signal.aborted && pending === entry) pending = null;
    };

    const persist = (): void => {
      if (restoring) return;
      writeSaved(key, capture(region, card));
    };

    const onClick = (event: MouseEvent): void => {
      const target = event.target;
      const control = target instanceof Element ? target.closest('a[href],button') : null;
      if (!event.isTrusted || !(target instanceof Element)) return;
      if (!control) {
        if (target.closest(SLIDE)) card = locateCard(region, target);
        return;
      }
      card =
        control instanceof HTMLButtonElement && !clean(control.textContent)
          ? null
          : locateCard(region, target);
    };

    const onEntry = (): void => {
      const next = currentEntry();
      if (next === key || signal.aborted) return;
      key = next;
      card = null;
      void begin(true);
    };

    document.addEventListener('click', onClick, { capture: true, signal });
    window.addEventListener('pagehide', persist, { signal });
    const navigation = window.navigation;
    if (navigation) {
      navigation.addEventListener('navigate', persist, { signal });
      navigation.addEventListener('currententrychange', onEntry, { signal });
    } else {
      window.addEventListener('popstate', onEntry, { signal });
    }
    void begin(false);

    return () => {
      restoring?.abort();
      clearRing();
    };
  },
};
