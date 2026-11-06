import dayjs from 'dayjs';
import { z } from 'zod';
import type { Feature } from '../../../lib/ui/feature';
import { OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import ringCss from '../styles/nav-memory.scss?inline';

const KEY_PREFIX = 'bscf-nav:';
const TTL_MS = 30 * 60 * 1000;
const WAIT_MS = 3000;
const RING_MS = 1200;
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
const entryKey = (): string =>
  KEY_PREFIX + (window.navigation?.currentEntry?.key ?? location.pathname + location.search);
const slideText = (slide: Element): string => clean(slide.textContent).slice(0, CARD_TEXT_CHARS);

let pending: string | null = null;

function trackTraversal(): void {
  for (const entry of performance.getEntriesByType('navigation')) {
    if (entry instanceof PerformanceNavigationTiming && entry.type === 'back_forward') {
      pending = entryKey();
    }
  }
  const navigation = window.navigation;
  if (navigation) {
    navigation.addEventListener('currententrychange', (event) => {
      pending = event.navigationType === 'traverse' ? entryKey() : null;
    });
  } else {
    window.addEventListener('popstate', () => {
      pending = entryKey();
    });
  }
}

trackTraversal();

function readSaved(key: string): Saved | null {
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

function writeSaved(key: string, saved: Saved): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(saved));
  } catch {
    return;
  }
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
    const index = section.swiper ? activeIndex(section.swiper) : 0;
    const open = isOpen(section);
    if (index > 0 || open) sections[section.id] = { index, open };
  }
  return { ts: dayjs().valueOf(), y: Math.round(window.scrollY), sections, card };
}

function until(
  root: Element,
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

function advance(section: Section, target: number): void {
  const { swiper, next } = section;
  if (!swiper || !next) return;
  const clicks = target - activeIndex(swiper);
  for (let i = 0; i < clicks; i++) next.click();
  const wrapper = swiper.querySelector(WRAPPER);
  if (!wrapper) return;
  for (const animation of wrapper.getAnimations()) animation.finish();
}

export const feature: Feature = {
  pages: ['roundList', 'round', 'submission', 'myProjects', 'other'],
  toggles: ['navigationMemory'],
  mount({ region, signal, warn, page, store }) {
    let key = entryKey();
    let card: Card = null;
    let restoring: AbortController | null = null;
    let ring: Ring | null = null;

    if (page.kind === 'submission') {
      store.rpc.markOpened(page.submissionId).catch((error: unknown) => warn('mark opened', error));
    }

    const clearRing = (): void => {
      if (!ring) return;
      clearTimeout(ring.timer);
      ring.slide.removeAttribute(RING_ATTRIBUTE);
      ring.style.remove();
      ring = null;
    };

    const showRing = (slide: Element): void => {
      clearRing();
      const style = document.createElement('style');
      style.setAttribute(OWN_ATTRIBUTE, 'nav-memory');
      style.textContent = ringCss;
      (document.head ?? document.documentElement).append(style);
      slide.setAttribute(RING_ATTRIBUTE, '');
      ring = { slide, style, timer: setTimeout(clearRing, RING_MS) };
    };

    const restore = async (saved: Saved, cancel: AbortSignal, fresh: boolean): Promise<void> => {
      const deadline = performance.now() + WAIT_MS;
      const wanted = Object.entries(saved.sections);
      const ready = (): boolean => {
        const sections = readSections(region);
        return wanted.every(([id, target]) => {
          const section = sections.find((s) => s.id === id);
          if (!section || (target.open && !section.toggle)) return false;
          if (target.index === 0) return true;
          const { swiper, next } = section;
          return (
            !!swiper &&
            !!next &&
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
        if (target.index > 0 && !section.next) warn(`next button not found: ${id}`);
        advance(section, target.index);
      }
      const opened = wanted.filter(([, target]) => target.open);
      if (opened.length > 0) {
        const current = readSections(region);
        for (const [id] of opened) {
          const section = current.find((s) => s.id === id);
          if (section?.toggle && !isOpen(section)) section.toggle.click();
        }
      }
      if (saved.y > 0) {
        await until(
          region,
          () => document.documentElement.scrollHeight >= saved.y + window.innerHeight,
          cancel,
          deadline,
          false,
        );
        if (cancel.aborted) return;
        window.scrollTo({ top: saved.y, behavior: 'instant' });
      }
      const wantedCard = saved.card;
      if (!wantedCard) return;
      await until(region, () => findCard(region, wantedCard) !== null, cancel, deadline, false);
      if (cancel.aborted) return;
      const element = findCard(region, wantedCard);
      if (element) showRing(element);
      else warn('returned card not found');
    };

    const begin = async (fresh: boolean): Promise<void> => {
      restoring?.abort();
      const entry = key;
      const saved = pending === entry ? readSaved(entry) : null;
      if (!saved) {
        pending = null;
        return;
      }
      const own = new AbortController();
      restoring = own;
      const stop = (): void => own.abort();
      for (const type of USER_INPUT) {
        window.addEventListener(type, stop, { once: true, passive: true, signal: own.signal });
      }
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
      if (!(target instanceof Element) || !control) return;
      card =
        control instanceof HTMLButtonElement && !clean(control.textContent)
          ? null
          : locateCard(region, target);
    };

    const onEntry = (): void => {
      const next = entryKey();
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
