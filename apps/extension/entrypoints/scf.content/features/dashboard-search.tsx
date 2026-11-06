import { z } from "zod";
import { SearchField } from "../../../components/SearchField";
import type { SearchResultMatch } from "../../../components/SearchResultCard";
import {
  SearchResults,
  type SearchResultsStatus,
} from "../../../components/SearchResults";
import {
  loadProjectsIndex,
  reloadProjectsIndex,
  searchProjects,
} from "../../../lib/site/projects-index";
import type { Feature } from "../../../lib/ui/feature";
import { type MountedUi, OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import searchCss from "../styles/dashboard-search.scss?inline";
import {
  centerInView,
  currentEntry,
  isReturning,
  landOn,
  markRestored,
  SEARCH_PREFIX,
  showRing,
  TTL_MS,
  until,
  untilInput,
  WAIT_MS,
} from "./nav-memory";

const ROW = "data-bscf-search-row";
const HEADING = "data-bscf-search-heading";
const BAR = "data-bscf-search-bar";
const RESULTS = "data-bscf-search-results";
const SECTION = "data-bscf-search-section";
const HEADING_CANDIDATES = "h1,h2,h3,h4,h5,h6,p,span,div";
const NOT_HEADING = 'a,button,nav,[role="button"],[role="link"]';
const HEADING_TEXT = {
  roundList: "award rounds",
  myProjects: "my projects",
} as const;
const DEBOUNCE_MS = 120;
const ANIMATION_MS = 200;
const LIMIT = 60;
const PROJECT_HREF = "/project/";

const savedSchema = z.object({
  ts: z.number(),
  q: z.string(),
  id: z.string().nullable(),
  y: z.number(),
});

type SavedSearch = z.infer<typeof savedSchema>;
type ResultsState = "closed" | "open" | "closing";
type SectionState = "out" | "gone" | "in";

interface View {
  status: SearchResultsStatus;
  matches: SearchResultMatch[];
  hasMore: boolean;
}

interface Page {
  heading: Element;
  anchor: Element;
  row: Element;
  bar: HTMLElement;
  results: HTMLElement;
  barUi: MountedUi | null;
  resultsUi: MountedUi | null;
  resultsState: ResultsState;
  marked: Set<Element>;
}

const LOADING: View = { status: "loading", matches: [], hasMore: false };
const ERROR: View = { status: "error", matches: [], hasMore: false };
const QUIET: View = { status: "ready", matches: [], hasMore: false };

const norm = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();

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
  for (
    let next = node.nextElementSibling;
    next;
    next = next.nextElementSibling
  ) {
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

function readSearch(entry: string): SavedSearch | null {
  const key = SEARCH_PREFIX + entry;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = savedSchema.safeParse(JSON.parse(raw));
    if (
      parsed.success &&
      Date.now() - parsed.data.ts <= TTL_MS &&
      parsed.data.q.trim() !== ""
    ) {
      return parsed.data;
    }
    sessionStorage.removeItem(key);
  } catch {
    return null;
  }
  return null;
}

function writeSearch(entry: string, saved: SavedSearch | null): void {
  const key = SEARCH_PREFIX + entry;
  try {
    if (saved) sessionStorage.setItem(key, JSON.stringify(saved));
    else sessionStorage.removeItem(key);
  } catch {
    return;
  }
}

function ownBox(name: string, marker: string): HTMLElement {
  const box = document.createElement("div");
  box.setAttribute(OWN_ATTRIBUTE, name);
  box.setAttribute(marker, marker === RESULTS ? "closed" : "");
  return box;
}

export const feature: Feature = {
  pages: ["roundList", "myProjects"],
  mount(context) {
    const { page: pageData, region, onMutation, warn, signal } = context;
    if (pageData.kind !== "roundList" && pageData.kind !== "myProjects") return;
    const headingText = HEADING_TEXT[pageData.kind];
    const entry = currentEntry();
    const note = (text: string): void => warn(`${text} [${entry}]`);
    const saved = isReturning(entry, warn) ? readSearch(entry) : null;
    if (!saved) note("no saved search to restore");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "dashboard-search");
    style.textContent = searchCss;
    (document.head ?? document.documentElement).append(style);

    let page: Page | null = null;
    let raw = "";
    let term = "";
    let view: View = saved ? QUIET : LOADING;
    let isDebouncing = false;
    let shown = false;
    let focusWhenOpen = false;
    let closed = false;
    let clicked: string | null = saved?.id ?? null;
    let reveal: SavedSearch | null = saved;
    let restoring = saved !== null;
    let resumed = false;
    let touched = false;
    const input = saved ? untilInput() : null;
    input?.signal.addEventListener(
      "abort",
      () => {
        restoring = false;
      },
      { once: true },
    );
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;
    let animationTimer: ReturnType<typeof setTimeout> | undefined;

    const duration = (): number => (reducedMotion.matches ? 0 : ANIMATION_MS);

    const barView = () => (
      <SearchField
        value={raw}
        onValueChange={handleChange}
        onMoveDown={focusResults}
        isLoading={isDebouncing || (raw !== "" && view.status === "loading")}
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
          handleChange("");
          page?.barUi?.shadow.querySelector("input")?.focus();
        }}
        onLeaveUp={() => page?.barUi?.shadow.querySelector("input")?.focus()}
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
      if (state === "open" && focusWhenOpen) {
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
      if (page.resultsState !== "open") {
        focusWhenOpen = true;
        return;
      }
      const root = page.resultsUi?.shadow;
      const target =
        root?.querySelector<HTMLElement>('a[tabindex="0"]') ??
        root?.querySelector<HTMLElement>("a");
      target?.focus();
    }

    const go = (next: boolean): void => {
      if (!page || next === shown) return;
      shown = next;
      clearTimeout(animationTimer);
      const wait = duration();
      if (next) {
        if (page.resultsState !== "closed") {
          setResults("open");
          return;
        }
        const reveal = (): void => {
          setSections("gone");
          setResults("open");
        };
        if (wait === 0) {
          reveal();
          return;
        }
        setSections("out");
        animationTimer = setTimeout(reveal, wait);
        return;
      }
      focusWhenOpen = false;
      const restore = (): void => {
        if (wait === 0) {
          setSections(null);
          return;
        }
        setSections("in");
        animationTimer = setTimeout(() => setSections(null), wait);
      };
      if (page.resultsState === "closed") {
        restore();
        return;
      }
      if (wait === 0) {
        setResults("closed");
        restore();
        return;
      }
      setResults("closing");
      animationTimer = setTimeout(() => {
        setResults("closed");
        restore();
      }, wait);
    };

    const apply = (): void => {
      const result = searchProjects(term, LIMIT);
      view = result.ready
        ? {
            status: "ready",
            matches: result.matches,
            hasMore: result.matches.length >= LIMIT,
          }
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
      touched = true;
      reveal = null;
      input?.abort();
      raw = value;
      clearTimeout(debounceTimer);
      const trimmed = value.trim();
      if (trimmed === "") {
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

    const onResultsClick = (event: Event): void => {
      const link = event
        .composedPath()
        .find(
          (node): node is HTMLAnchorElement =>
            node instanceof HTMLAnchorElement,
        );
      const href = link?.getAttribute("href");
      if (href?.startsWith(PROJECT_HREF))
        clicked = href.slice(PROJECT_HREF.length);
    };

    const persist = (): void => {
      if (restoring) return;
      writeSearch(
        currentEntry(),
        raw.trim() === ""
          ? null
          : {
              ts: Date.now(),
              q: raw,
              id: clicked,
              y: Math.round(window.scrollY),
            },
      );
    };

    const finishAnimations = (): void => {
      if (!page) return;
      const running = [
        ...page.results.getAnimations({ subtree: true }),
        ...(page.resultsUi?.shadow.getAnimations() ?? []),
      ];
      for (const animation of running) {
        if (Number.isFinite(animation.effect?.getComputedTiming().endTime))
          animation.finish();
      }
    };

    const settle = async (
      wanted: SavedSearch,
      shadow: ShadowRoot,
      cancel: AbortSignal,
    ): Promise<void> => {
      const href = wanted.id === null ? null : PROJECT_HREF + wanted.id;
      const find = (): Element | null => {
        if (href === null) return null;
        for (const link of (page?.resultsUi?.shadow ?? shadow).querySelectorAll(
          "a",
        )) {
          if (link.getAttribute("href") === href) return link;
        }
        return null;
      };
      const tall = (): boolean =>
        document.documentElement.scrollHeight >= wanted.y + window.innerHeight;
      const ready = href === null ? tall : () => find() !== null;
      if (href === null && wanted.y <= 0) return;
      await until(shadow, ready, cancel, performance.now() + WAIT_MS, false);
      if (cancel.aborted) return;
      if (href !== null) {
        const link = await landOn(
          () => {
            setSections("gone");
            finishAnimations();
            const found = find();
            if (found) centerInView(found);
            return found;
          },
          cancel,
          page ? [region, page.results] : [region],
        );
        if (cancel.aborted) return;
        if (link) {
          note(`scrolled to ${wanted.id}`);
          showRing(link);
          note("ring shown");
        } else {
          warn("returned result not found");
        }
        return;
      }
      finishAnimations();
      if (tall()) {
        window.scrollTo({ top: wanted.y, behavior: "instant" });
        note(`scrolled to y ${wanted.y}`);
      } else {
        warn("returned result not found");
      }
    };

    const tryRestore = (): void => {
      const wanted = reveal;
      const ui = page?.resultsUi;
      if (!wanted || !ui || !resumed || !input) return;
      reveal = null;
      settle(wanted, ui.shadow, AbortSignal.any([signal, input.signal]))
        .catch((error: unknown) => warn("restore", error))
        .finally(() => {
          input.abort();
          if (!closed) markRestored(entry);
        });
    };

    const resume = (wanted: SavedSearch): void => {
      void loadProjectsIndex().then(() => {
        if (closed || touched) return;
        shown = true;
        search(wanted.q.trim());
        note(`restored query "${wanted.q}"`);
        if (page) {
          setSections("gone");
          setResults("open");
        }
        resumed = true;
        tryRestore();
      });
    };

    const detach = (): void => {
      if (!page) return;
      for (const node of page.marked) node.removeAttribute(SECTION);
      page.row.removeAttribute(ROW);
      page.heading.removeAttribute(HEADING);
      page.barUi?.remove();
      page.resultsUi?.remove();
      page.bar.remove();
      page.results.remove();
      page = null;
    };

    const attach = (): void => {
      const heading = findHeading(region, headingText);
      const anchor = heading ? findAnchor(heading, region) : null;
      const row = heading?.parentElement;
      if (!heading || !anchor || !row) {
        warn("heading not found");
        return;
      }
      const bar = ownBox("search-bar", BAR);
      const gap = Number.parseFloat(getComputedStyle(row).rowGap);
      if (gap > 0) bar.style.setProperty("--bscf-site-gap", `${gap}px`);
      const results = ownBox("search-results", RESULTS);
      results.addEventListener("click", onResultsClick);
      const mine: Page = {
        heading,
        anchor,
        row,
        bar,
        results,
        barUi: null,
        resultsUi: null,
        resultsState: "closed",
        marked: new Set(),
      };
      row.setAttribute(ROW, "");
      heading.setAttribute(HEADING, "");
      heading.after(bar);
      (anchor === heading ? bar : anchor).after(results);
      page = mine;
      if (shown) {
        setSections("gone");
        setResults("open");
      }
      context
        .mount({
          name: "bar",
          anchor: bar,
          append: "last",
          children: barView(),
        })
        .then((handle) => {
          if (!handle) return;
          if (closed || page !== mine) {
            handle.remove();
            return;
          }
          mine.barUi = handle;
          handle.render(barView());
        })
        .catch((error: unknown) => warn("mount", error));
      context
        .mount({
          name: "results",
          anchor: results,
          append: "last",
          children: resultsView(),
        })
        .then((handle) => {
          if (!handle) return;
          if (closed || page !== mine) {
            handle.remove();
            return;
          }
          mine.resultsUi = handle;
          handle.render(resultsView());
          tryRestore();
        })
        .catch((error: unknown) => warn("mount", error));
    };

    const sync = (): void => {
      if (
        page?.bar.isConnected &&
        page.results.isConnected &&
        page.heading.isConnected
      ) {
        if (shown && page.resultsState === "open") setSections("gone");
        return;
      }
      detach();
      attach();
    };

    if (saved) {
      raw = saved.q;
      resume(saved);
    }

    window.addEventListener("pagehide", persist, { signal });
    window.navigation?.addEventListener("navigate", persist, { signal });
    onMutation(sync);
    sync();

    return () => {
      closed = true;
      input?.abort();
      clearTimeout(debounceTimer);
      clearTimeout(animationTimer);
      detach();
      style.remove();
    };
  },
};
