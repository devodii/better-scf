import { TocNav, type TocNavItem } from '../../../components/TocNav';
import {
  findSubmissionSections,
  type SubmissionSectionElement,
} from '../../../lib/site/submission';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import tocCss from '../styles/detail-toc.scss?inline';

const SLOT = 'data-bscf-toc';
const ROOM = 'data-bscf-toc-room';
const TOP_VAR = '--bscf-toc-top';
const WIDE = '(min-width: 80rem)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const RAIL_TOP = 112;
const ACTIVE_LINE = 140;
const SCROLL_OFFSET = 120;

function commonAncestor(first: Element, last: Element): Element | null {
  let node = first.parentElement;
  while (node && !node.contains(last)) node = node.parentElement;
  return node;
}

const toItems = (sections: readonly SubmissionSectionElement[]): TocNavItem[] =>
  sections.map(({ id, title }) => ({ id, title }));

export const feature: Feature = {
  pages: ['submission'],
  toggles: ['tableOfContents'],
  mount({ region, signal, mount, onMutation, warn }) {
    const wide = window.matchMedia(WIDE);
    const reduced = window.matchMedia(REDUCED_MOTION);

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'detail-toc');
    style.textContent = tocCss;
    (document.head ?? document.documentElement).append(style);

    let sections: SubmissionSectionElement[] = [];
    let items: TocNavItem[] = [];
    let container: Element | null = null;
    let slot: HTMLElement | null = null;
    let ui: MountedUi | null = null;
    let activeId: string | null = null;
    let isOpen = wide.matches;
    let frame = 0;

    const view = () => (
      <TocNav
        items={items}
        activeId={activeId}
        isOpen={isOpen}
        onOpenChange={(next) => {
          isOpen = next;
          ui?.render(view());
        }}
        onSelect={select}
      />
    );

    function select(id: string): void {
      const target = sections.find((section) => section.id === id);
      if (!target?.heading.isConnected) {
        warn('section not found');
        return;
      }
      const top = target.heading.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
      window.scrollTo({ top, behavior: reduced.matches ? 'instant' : 'smooth' });
    }

    const readActive = (): string | null => {
      let current = sections[0]?.id ?? null;
      for (const section of sections) {
        if (section.heading.getBoundingClientRect().top > ACTIVE_LINE) break;
        current = section.id;
      }
      return current;
    };

    const measure = (): void => {
      frame = 0;
      if (!container || !slot) return;
      const current = readActive();
      if (current !== activeId) {
        activeId = current;
        ui?.render(view());
      }
      if (!wide.matches) {
        slot.style.removeProperty(TOP_VAR);
        return;
      }
      const rect = container.getBoundingClientRect();
      const top = Math.min(Math.max(RAIL_TOP, rect.top), rect.bottom - slot.offsetHeight);
      slot.style.setProperty(TOP_VAR, `${top}px`);
    };

    const schedule = (): void => {
      if (frame === 0) frame = requestAnimationFrame(measure);
    };

    const teardown = (): void => {
      cancelAnimationFrame(frame);
      frame = 0;
      ui?.remove();
      ui = null;
      slot?.remove();
      slot = null;
      container?.removeAttribute(ROOM);
      container = null;
      activeId = null;
    };

    const place = (parent: Element): void => {
      items = toItems(sections);
      activeId = readActive();
      const own = document.createElement('div');
      own.setAttribute(OWN_ATTRIBUTE, 'toc-slot');
      own.setAttribute(SLOT, '');
      parent.prepend(own);
      parent.setAttribute(ROOM, '');
      slot = own;
      container = parent;
      mount({ anchor: own, append: 'last', children: view() })
        .then((handle) => {
          if (!handle) return;
          if (slot === own) {
            ui = handle;
            schedule();
          } else {
            handle.remove();
          }
        })
        .catch((error: unknown) => warn('mount', error));
    };

    const sync = (): void => {
      const found = findSubmissionSections(region);
      const first = found[0];
      const last = found.at(-1);
      const parent =
        first && last && found.length > 1 ? commonAncestor(first.heading, last.heading) : null;
      if (!parent) {
        teardown();
        warn('sections not found');
        return;
      }
      sections = found;
      if (slot?.isConnected && parent === container) {
        const unchanged =
          found.length === items.length &&
          found.every((s, i) => s.id === items[i]?.id && s.title === items[i]?.title);
        if (!unchanged) {
          items = toItems(found);
          activeId = readActive();
          ui?.render(view());
        }
        return;
      }
      teardown();
      place(parent);
    };

    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', schedule, { passive: true, signal });
    wide.addEventListener('change', schedule, { signal });
    onMutation(sync);
    sync();

    return () => {
      teardown();
      style.remove();
    };
  },
};
