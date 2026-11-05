import { SearchField } from '../../../components/SearchField';
import type { SearchResultMatch } from '../../../components/SearchResultCard';
import { SearchResults, type SearchResultsStatus } from '../../../components/SearchResults';
import {
  loadProjectsIndex,
  reloadProjectsIndex,
  searchProjects,
} from '../../../lib/site/projects-index';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import searchCss from '../styles/dashboard-search.scss?inline';

const ROW = 'data-bscf-search-row';
const BAR = 'data-bscf-search-bar';
const RESULTS = 'data-bscf-search-results';
const SECTION = 'data-bscf-search-section';
const HEADING_CANDIDATES = 'h1,h2,h3,h4,h5,h6,p,span,div';
const NOT_HEADING = 'a,button,nav,[role="button"],[role="link"]';
const HEADING_TEXT = { roundList: 'award rounds', myProjects: 'my projects' } as const;
const DEBOUNCE_MS = 120;
const ANIMATION_MS = 200;
const LIMIT = 60;

type ResultsState = 'closed' | 'open' | 'closing';
type SectionState = 'out' | 'gone' | 'in';

interface View {
  status: SearchResultsStatus;
  matches: SearchResultMatch[];
  hasMore: boolean;
}

interface Page {
  heading: Element;
  anchor: Element;
  row: Element | null;
  bar: HTMLElement;
  results: HTMLElement;
  barUi: MountedUi | null;
  resultsUi: MountedUi | null;
  resultsState: ResultsState;
  marked: Set<Element>;
}

const LOADING: View = { status: 'loading', matches: [], hasMore: false };
const ERROR: View = { status: 'error', matches: [], hasMore: false };

const norm = (text: string | null | undefined): string =>
  (text ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

function findHeading(region: Element, text: string): Element | null {
  for (const node of region.querySelectorAll(HEADING_CANDIDATES)) {
    if (
      node.childElementCount === 0 &&
      norm(node.textContent) === text &&
      !node.closest(NOT_HEADING)
    ) {
      return node;
    }
  }
  return null;
}

function laterSiblings(node: Element): Element[] {
  const out: Element[] = [];
  for (let next = node.nextElementSibling; next; next = next.nextElementSibling) {
    if (!next.hasAttribute(OWN_ATTRIBUTE)) out.push(next);
  }
  return out;
}

function findAnchor(heading: Element, region: Element): Element | null {
  let anchor: Element = heading;
  while (laterSiblings(anchor).length === 0) {
    const parent = anchor.parentElement;
    if (!parent || parent === region) return null;
    anchor = parent;
  }
  return anchor;
}

function ownBox(name: string, marker: string): HTMLElement {
  const box = document.createElement('div');
  box.setAttribute(OWN_ATTRIBUTE, name);
  box.setAttribute(marker, marker === RESULTS ? 'closed' : '');
  return box;
}

export const feature: Feature = {
  pages: ['roundList', 'myProjects'],
  mount(context) {
    const { page: pageData, region, onMutation, warn } = context;
    if (pageData.kind !== 'roundList' && pageData.kind !== 'myProjects') return;
    const headingText = HEADING_TEXT[pageData.kind];
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'dashboard-search');
    style.textContent = searchCss;
    (document.head ?? document.documentElement).append(style);

    let page: Page | null = null;
    let raw = '';
    let term = '';
    let view: View = LOADING;
    let isDebouncing = false;
    let shown = false;
    let focusWhenOpen = false;
    let closed = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let animationTimer: ReturnType<typeof setTimeout> | undefined;

    const duration = (): number => (reducedMotion.matches ? 0 : ANIMATION_MS);

    const barView = () => (
      <SearchField
        value={raw}
        onValueChange={handleChange}
        onMoveDown={focusResults}
        isLoading={isDebouncing || (raw !== '' && view.status === 'loading')}
      />
    );

    const resultsView = () => (
      <SearchResults
        status={view.status}
        matches={view.matches}
        hasMore={view.hasMore}
        query={term}
        onRetry={retry}
        onEscape={() => {
          handleChange('');
          page?.barUi?.shadow.querySelector('input')?.focus();
        }}
        onLeaveUp={() => page?.barUi?.shadow.querySelector('input')?.focus()}
      />
    );

    const paint = (): void => {
      page?.barUi?.render(barView());
      page?.resultsUi?.render(resultsView());
    };

    const setResults = (state: ResultsState): void => {
      if (!page) return;
      page.resultsState = state;
      page.results.setAttribute(RESULTS, state);
      if (state === 'open' && focusWhenOpen) {
        focusWhenOpen = false;
        focusResults();
      }
    };

    const setSections = (state: SectionState | null): void => {
      if (!page) return;
      if (state === null) {
        for (const node of page.marked) node.removeAttribute(SECTION);
        page.marked.clear();
        return;
      }
      for (const node of laterSiblings(page.anchor)) {
        node.setAttribute(SECTION, state);
        page.marked.add(node);
      }
    };

    function focusResults(): void {
      if (!page || !shown) return;
      if (page.resultsState !== 'open') {
        focusWhenOpen = true;
        return;
      }
      const root = page.resultsUi?.shadow;
      const target =
        root?.querySelector<HTMLElement>('a[tabindex="0"]') ??
        root?.querySelector<HTMLElement>('a');
      target?.focus();
    }

    const go = (next: boolean): void => {
      if (!page || next === shown) return;
      shown = next;
      clearTimeout(animationTimer);
      const wait = duration();
      if (next) {
        if (page.resultsState !== 'closed') {
          setResults('open');
          return;
        }
        const reveal = (): void => {
          setSections('gone');
          setResults('open');
        };
        if (wait === 0) {
          reveal();
          return;
        }
        setSections('out');
        animationTimer = setTimeout(reveal, wait);
        return;
      }
      focusWhenOpen = false;
      const restore = (): void => {
        if (wait === 0) {
          setSections(null);
          return;
        }
        setSections('in');
        animationTimer = setTimeout(() => setSections(null), wait);
      };
      if (page.resultsState === 'closed') {
        restore();
        return;
      }
      if (wait === 0) {
        setResults('closed');
        restore();
        return;
      }
      setResults('closing');
      animationTimer = setTimeout(() => {
        setResults('closed');
        restore();
      }, wait);
    };

    const apply = (): void => {
      const result = searchProjects(term, LIMIT);
      view = result.ready
        ? { status: 'ready', matches: result.matches, hasMore: result.matches.length >= LIMIT }
        : ERROR;
      paint();
    };

    const afterLoad = (asked: string, load: () => Promise<boolean>): void => {
      void load().then((isReady) => {
        if (closed || term !== asked) return;
        if (isReady) {
          apply();
          return;
        }
        view = ERROR;
        paint();
      });
    };

    const search = (asked: string): void => {
      term = asked;
      if (searchProjects(asked, LIMIT).ready) {
        apply();
        return;
      }
      view = LOADING;
      paint();
      afterLoad(asked, loadProjectsIndex);
    };

    function retry(): void {
      view = LOADING;
      paint();
      afterLoad(term, reloadProjectsIndex);
    }

    function handleChange(value: string): void {
      raw = value;
      clearTimeout(debounceTimer);
      const trimmed = value.trim();
      if (trimmed === '') {
        isDebouncing = false;
        go(false);
        paint();
        return;
      }
      go(true);
      isDebouncing = true;
      debounceTimer = setTimeout(() => {
        isDebouncing = false;
        search(trimmed);
      }, DEBOUNCE_MS);
      paint();
    }

    const detach = (): void => {
      if (!page) return;
      for (const node of page.marked) node.removeAttribute(SECTION);
      page.row?.removeAttribute(ROW);
      page.barUi?.remove();
      page.resultsUi?.remove();
      page.bar.remove();
      page.results.remove();
      page = null;
    };

    const attach = (): void => {
      const heading = findHeading(region, headingText);
      const anchor = heading ? findAnchor(heading, region) : null;
      if (!heading || !anchor) {
        warn('heading not found');
        return;
      }
      const row = anchor === heading ? null : heading.parentElement;
      const bar = ownBox('search-bar', BAR);
      const results = ownBox('search-results', RESULTS);
      const mine: Page = {
        heading,
        anchor,
        row,
        bar,
        results,
        barUi: null,
        resultsUi: null,
        resultsState: 'closed',
        marked: new Set(),
      };
      row?.setAttribute(ROW, '');
      heading.after(bar);
      (row ? anchor : bar).after(results);
      page = mine;
      if (shown) {
        setSections('gone');
        setResults('open');
      }
      context
        .mount({ name: 'bar', anchor: bar, append: 'last', children: barView() })
        .then((handle) => {
          if (!handle) return;
          if (closed || page !== mine) {
            handle.remove();
            return;
          }
          mine.barUi = handle;
          handle.render(barView());
        })
        .catch((error: unknown) => warn('mount', error));
      context
        .mount({ name: 'results', anchor: results, append: 'last', children: resultsView() })
        .then((handle) => {
          if (!handle) return;
          if (closed || page !== mine) {
            handle.remove();
            return;
          }
          mine.resultsUi = handle;
          handle.render(resultsView());
        })
        .catch((error: unknown) => warn('mount', error));
    };

    const sync = (): void => {
      if (page?.bar.isConnected && page.results.isConnected && page.heading.isConnected) {
        if (shown && page.resultsState === 'open') setSections('gone');
        return;
      }
      detach();
      attach();
    };

    onMutation(sync);
    sync();

    return () => {
      closed = true;
      clearTimeout(debounceTimer);
      clearTimeout(animationTimer);
      detach();
      style.remove();
    };
  },
};
