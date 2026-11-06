import { createRef } from "react";
import type { ReviewState, Stance } from "shared";
import { BuildersLoader } from "../../../components/BuildersLoader";
import type { GridCountsProps } from "../../../components/GridCounts";
import {
  EMPTY_GRID_FILTERS,
  type GridFilterState,
  type GridTrack,
} from "../../../components/GridFilters";
import type { GridSortKey } from "../../../components/GridSort";
import { GridToolbar } from "../../../components/GridToolbar";
import { onLoader, readLoader } from "../../../lib/site/loader-store";
import {
  type CardMatcher,
  createCardMatcher,
  findReceivedSection,
  findRoundCards,
  readRoundCard,
  readRoundView,
} from "../../../lib/site/round";
import { onFacts, readFacts } from "../../../lib/site/round-facts";
import {
  CARD_VIEW_BUTTON,
  CARD_VIEW_TEXT,
  SECTION_HEADING,
  SEE_ALL_TEXT,
  TOGGLE_BUTTON,
} from "../../../lib/site/selectors/round";
import type { Feature, FeatureContext } from "../../../lib/ui/feature";
import { type MountedUi, OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import gridCss from "../styles/grid-tools.scss?inline";

const HIDDEN = "data-bscf-grid-hidden";
const FOCUSED = "data-bscf-grid-focus";
const BAR = "data-bscf-grid-bar";
const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);
const INTERACTIVE = 'a[href],button,summary,[role="button"],[role="link"]';
const TRACKS: readonly GridTrack[] = ["integration", "open", "rfp"];
const STANCE_KEYS = new Map<string, Stance>([
  ["1", "support"],
  ["2", "unsure"],
  ["3", "against"],
]);
const COLLATOR = new Intl.Collator(undefined, {
  sensitivity: "base",
  numeric: true,
});
const NO_REVIEW = blankReview("");

interface Entry {
  card: Element;
  cell: HTMLElement;
  id: string | null;
  title: string;
  text: string;
  budget: number | null;
}

interface Collected {
  grid: Element;
  entries: Entry[];
}

interface Seed {
  query: string;
  filters: GridFilterState;
  sort: GridSortKey;
}

interface GridTools {
  readonly grid: Element;
  isIntact(): boolean;
  update(entries: Entry[]): void;
  close(): void;
}

function blankReview(submissionId: string): ReviewState {
  return {
    submissionId,
    stance: "none",
    shortlisted: false,
    note: "",
    lastOpenedAt: null,
    openedCount: 0,
  };
}

function loaderStatus() {
  const loader = readLoader();
  if (!loader) return null;
  return (
    <BuildersLoader
      compact
      status={loader.status}
      done={loader.done}
      total={loader.total}
      message={loader.message}
      onStart={loader.start}
      onCancel={loader.cancel}
    />
  );
}

const norm = (text: string | null | undefined): string =>
  (text ?? "").replace(/\s+/g, " ").trim().toLowerCase();

function commonParent(cards: readonly Element[]): Element | null {
  const first = cards[0];
  let node = first?.parentElement ?? null;
  while (node) {
    const parent: Element = node;
    if (cards.every((card) => parent.contains(card))) return parent;
    node = parent.parentElement;
  }
  return null;
}

function cellOf(card: Element, grid: Element): HTMLElement | null {
  let node: Element = card;
  while (node.parentElement && node.parentElement !== grid)
    node = node.parentElement;
  return node instanceof HTMLElement && node.parentElement === grid
    ? node
    : null;
}

function collect(
  section: Element,
  match: CardMatcher | null,
): Collected | null {
  const cards = findRoundCards(section);
  const grid = commonParent(cards);
  if (!grid) return null;
  const entries: Entry[] = [];
  for (const card of cards) {
    const cell = cellOf(card, grid);
    if (!cell) continue;
    const facts = readRoundCard(card);
    const record = match?.(card) ?? null;
    const title = facts?.title ?? record?.title ?? "";
    entries.push({
      card,
      cell,
      id: record?.id ?? null,
      title,
      text: norm(`${title} ${facts?.team ?? record?.projectName ?? ""}`),
      budget: record?.budget ?? facts?.budget ?? null,
    });
  }
  return entries.length > 0 ? { grid, entries } : null;
}

function byNumber(
  a: number | null,
  b: number | null,
  direction: 1 | -1,
): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

function viewButton(card: Element): HTMLElement | null {
  for (const button of card.querySelectorAll<HTMLElement>(CARD_VIEW_BUTTON)) {
    if (norm(button.textContent) === CARD_VIEW_TEXT) return button;
  }
  return null;
}

function openTools(
  context: FeatureContext,
  { grid, entries }: Collected,
  seed: Seed | null,
): GridTools {
  const { store, settings, warn } = context;
  const control = new AbortController();
  const { signal } = control;
  const searchRef = createRef<HTMLInputElement>();
  const seeded = new Map<string, ReviewState>();
  const pending = new Map<string, ReviewState>();
  const tracks = new Map<string, GridTrack>();
  const bar = document.createElement("div");
  bar.setAttribute(OWN_ATTRIBUTE, "grid-tools-bar");
  bar.setAttribute(BAR, "");

  let all = entries;
  let hasReviews = entries.some((entry) => entry.id !== null);
  let ordered: Entry[] = entries;
  let counts: GridCountsProps = { total: 0, shown: 0 };
  let availableTracks: GridTrack[] = [];
  let query = seed?.query ?? "";
  let filters: GridFilterState = seed?.filters ?? EMPTY_GRID_FILTERS;
  let sort: GridSortKey = seed?.sort ?? "site";
  let focused: Entry | null = null;
  let noteOpen = false;
  let draft: string | null = null;
  let ui: MountedUi | null = null;
  let closed = false;
  let loaded = false;

  const reviewOf = (entry: Entry): ReviewState => {
    const { id } = entry;
    if (id === null) return NO_REVIEW;
    return pending.get(id) ?? seeded.get(id) ?? blankReview(id);
  };

  const terms = (): string[] => norm(query).split(" ").filter(Boolean);

  const passes = (entry: Entry, needles: readonly string[]): boolean => {
    if (!needles.every((needle) => entry.text.includes(needle))) return false;
    const review = reviewOf(entry);
    if (filters.stances.length > 0 && !filters.stances.includes(review.stance))
      return false;
    if (filters.shortlisted && !review.shortlisted) return false;
    if (filters.unread && review.openedCount > 0) return false;
    if (filters.tracks.length > 0) {
      const track = entry.id === null ? undefined : tracks.get(entry.id);
      if (!track || !filters.tracks.includes(track)) return false;
    }
    return true;
  };

  const compare = (a: Entry, b: Entry): number => {
    switch (sort) {
      case "budgetDesc":
        return byNumber(a.budget, b.budget, -1);
      case "budgetAsc":
        return byNumber(a.budget, b.budget, 1);
      case "title":
        return COLLATOR.compare(a.title, b.title);
      case "opened":
        return byNumber(reviewOf(a).lastOpenedAt, reviewOf(b).lastOpenedAt, -1);
      default:
        return 0;
    }
  };

  const isFiltered = (): boolean =>
    terms().length > 0 ||
    filters.stances.length > 0 ||
    filters.tracks.length > 0 ||
    filters.shortlisted ||
    filters.unread;

  const render = (): void => {
    ui?.render(toolbar());
  };

  const save = (entry: Entry, patch: Partial<ReviewState>): void => {
    const { id } = entry;
    if (id === null || !loaded) return;
    const next: ReviewState = { ...reviewOf(entry), ...patch };
    seeded.set(id, next);
    pending.set(id, next);
    store.rpc
      .putReview(next)
      .catch((error: unknown) => warn("save review", error))
      .finally(() => {
        if (pending.get(id) === next) pending.delete(id);
      });
    apply();
  };

  const commitNote = (): void => {
    const value = draft;
    draft = null;
    if (focused && value !== null && value !== reviewOf(focused).note)
      save(focused, { note: value });
  };

  const setFocus = (entry: Entry | null): void => {
    if (focused === entry) return;
    commitNote();
    noteOpen = false;
    focused?.cell.removeAttribute(FOCUSED);
    focused = entry;
    entry?.cell.setAttribute(FOCUSED, "");
  };

  const apply = (): void => {
    const needles = terms();
    const visible = all.filter((entry) => passes(entry, needles));
    const shown = new Set(visible);
    if (focused && !shown.has(focused)) setFocus(null);
    ordered = sort === "site" ? visible : visible.toSorted(compare);
    for (const entry of all)
      entry.cell.toggleAttribute(HIDDEN, !shown.has(entry));
    if (sort === "site") {
      for (const entry of all) entry.cell.style.removeProperty("order");
    } else {
      let rank = 0;
      for (const entry of ordered)
        entry.cell.style.setProperty("order", String(rank++));
    }

    availableTracks = TRACKS.filter((track) =>
      [...tracks.values()].includes(track),
    );
    const next: GridCountsProps = { total: all.length, shown: visible.length };
    counts = next;
    render();
  };

  const toolbar = () => (
    <GridToolbar
      query={query}
      onQueryChange={(value) => {
        query = value;
        apply();
      }}
      filters={filters}
      onFiltersChange={(value) => {
        filters = value;
        apply();
      }}
      sort={sort}
      onSortChange={(value) => {
        sort = value;
        apply();
      }}
      availableTracks={availableTracks}
      hasReviews={hasReviews}
      counts={counts}
      isFiltered={isFiltered()}
      onReset={() => {
        query = "";
        filters = EMPTY_GRID_FILTERS;
        apply();
      }}
      note={
        focused && focused.id !== null
          ? {
              title: focused.title || "this submission",
              value: draft ?? reviewOf(focused).note,
              isOpen: noteOpen,
              onOpenChange: (open) => {
                if (!open) commitNote();
                noteOpen = open;
                render();
              },
              onChange: (value) => {
                draft = value;
                render();
              },
            }
          : null
      }
      trailing={loaderStatus()}
      searchRef={searchRef}
    />
  );

  const syncTracks = (): void => {
    const present = new Set(all.map((entry) => entry.id));
    tracks.clear();
    for (const [id, data] of readFacts()) {
      if (data.track && present.has(id)) tracks.set(id, data.track);
    }
  };

  const refreshData = async (): Promise<void> => {
    if (!hasReviews) return;
    try {
      const reviews = await store.send("listReviews", undefined);
      if (closed) return;
      seeded.clear();
      for (const review of reviews) seeded.set(review.submissionId, review);
      for (const [id, review] of pending) seeded.set(id, review);
      loaded = true;
      apply();
    } catch (error) {
      warn("load review data", error);
    }
  };

  const move = (delta: 1 | -1): void => {
    const index = focused ? ordered.indexOf(focused) : -1;
    const last = ordered.length - 1;
    const target =
      ordered[
        index < 0
          ? delta > 0
            ? 0
            : last
          : Math.min(Math.max(index + delta, 0), last)
      ];
    if (!target) return;
    setFocus(target);
    target.cell.scrollIntoView({ block: "nearest", behavior: "instant" });
    render();
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const origin = event.composedPath()[0];
    if (
      origin instanceof HTMLElement &&
      (EDITABLE_TAGS.has(origin.tagName) || origin.isContentEditable)
    ) {
      return;
    }
    if (origin instanceof Element && origin.closest(INTERACTIVE)) return;
    const key = event.key.toLowerCase();
    if (key === "j" || key === "k") {
      event.preventDefault();
      move(key === "j" ? 1 : -1);
      return;
    }
    if (event.repeat) return;
    if (key === "/") {
      event.preventDefault();
      searchRef.current?.focus();
      return;
    }
    if (!focused) return;
    if (key === "enter") {
      if (origin instanceof Element && origin.closest(INTERACTIVE)) return;
      const button = viewButton(focused.card);
      if (!button) {
        warn("view button not found");
        return;
      }
      event.preventDefault();
      button.click();
      return;
    }
    if (focused.id === null || !loaded) return;
    const stance = STANCE_KEYS.get(key);
    if (key === "s") {
      event.preventDefault();
      save(focused, { shortlisted: !reviewOf(focused).shortlisted });
    } else if (stance) {
      event.preventDefault();
      save(focused, {
        stance: reviewOf(focused).stance === stance ? "none" : stance,
      });
    } else if (key === "n") {
      event.preventDefault();
      noteOpen = true;
      render();
    }
  };

  syncTracks();
  apply();
  const offFacts = onFacts(() => {
    syncTracks();
    apply();
  });
  signal.addEventListener("abort", offFacts, { once: true });
  signal.addEventListener("abort", onLoader(render), { once: true });
  grid.before(bar);
  context
    .mount({ anchor: bar, append: "last", children: toolbar() })
    .then((handle) => {
      if (!handle) return;
      if (closed) {
        handle.remove();
        return;
      }
      ui = handle;
      render();
      if (seed && query !== "") {
        const field = searchRef.current;
        field?.focus();
        field?.setSelectionRange(query.length, query.length);
      }
    })
    .catch((error: unknown) => warn("mount", error));
  if (settings.keyboardShortcuts)
    document.addEventListener("keydown", onKeydown, { signal });
  const releaseCard = (event: Event): void => {
    const path = event.composedPath();
    if (noteOpen && path.includes(bar)) return;
    const origin = path[0];
    if (focused && origin instanceof Node && !grid.contains(origin))
      setFocus(null);
  };
  document.addEventListener("pointerdown", releaseCard, {
    capture: true,
    signal,
  });
  document.addEventListener("focusin", releaseCard, { capture: true, signal });
  window.addEventListener("focus", () => void refreshData(), { signal });
  void refreshData();

  return {
    grid,
    isIntact() {
      return (
        grid.isConnected &&
        bar.isConnected &&
        grid.childElementCount === all.length &&
        all.every(
          (entry) =>
            entry.card.isConnected && entry.cell.parentElement === grid,
        )
      );
    },
    update(next) {
      if (
        next.length === all.length &&
        next.every((entry, i) => entry.card === all[i]?.card)
      ) {
        return;
      }
      const card = focused?.card;
      all = next;
      focused = card
        ? (next.find((entry) => entry.card === card) ?? null)
        : null;
      hasReviews = next.some((entry) => entry.id !== null);
      apply();
      if (hasReviews && !loaded) void refreshData();
    },
    close() {
      if (closed) return;
      commitNote();
      closed = true;
      control.abort();
      for (const { cell } of all) {
        cell.removeAttribute(HIDDEN);
        cell.removeAttribute(FOCUSED);
        cell.style.removeProperty("order");
      }
      ui?.remove();
      bar.remove();
    },
  };
}

interface Preview {
  readonly section: Element;
  close(): void;
}

function seeAllButton(section: Element): HTMLElement | null {
  for (const button of section.querySelectorAll<HTMLElement>(TOGGLE_BUTTON)) {
    if (norm(button.textContent) === SEE_ALL_TEXT) return button;
  }
  return null;
}

function openPreview(
  context: FeatureContext,
  section: Element,
  records: readonly { id: string }[] | null,
  choose: (seed: Seed) => void,
): Preview | null {
  const heading = section.querySelector(SECTION_HEADING);
  const row = heading?.parentElement?.parentElement;
  if (!row) return null;
  const searchRef = createRef<HTMLInputElement>();
  const bar = document.createElement("div");
  bar.setAttribute(OWN_ATTRIBUTE, "grid-tools-preview");
  bar.setAttribute(BAR, "");
  const description = row.parentElement?.querySelector(":scope > p");
  if (description) description.after(bar);
  else row.after(bar);

  const ids = new Set((records ?? []).map((record) => record.id));
  let closed = false;
  let ui: MountedUi | null = null;

  const known = (): GridTrack[] => {
    const found = new Set<GridTrack>();
    for (const [id, data] of readFacts())
      if (data.track && ids.has(id)) found.add(data.track);
    return TRACKS.filter((track) => found.has(track));
  };

  const toolbar = () => (
    <GridToolbar
      query=""
      onQueryChange={(query) =>
        choose({ query, filters: EMPTY_GRID_FILTERS, sort: "site" })
      }
      filters={EMPTY_GRID_FILTERS}
      onFiltersChange={(filters) =>
        choose({ query: "", filters, sort: "site" })
      }
      sort="site"
      onSortChange={(sort) =>
        choose({ query: "", filters: EMPTY_GRID_FILTERS, sort })
      }
      availableTracks={known()}
      hasReviews
      counts={{ total: ids.size, shown: ids.size }}
      isFiltered={false}
      onReset={() => {}}
      note={null}
      trailing={loaderStatus()}
      searchRef={searchRef}
    />
  );

  context
    .mount({ anchor: bar, append: "last", children: toolbar() })
    .then((handle) => {
      if (!handle) return;
      if (closed) {
        handle.remove();
        return;
      }
      ui = handle;
    })
    .catch((error: unknown) => context.warn("mount preview", error));
  const off = onFacts(() => ui?.render(toolbar()));
  const offLoader = onLoader(() => ui?.render(toolbar()));

  return {
    section,
    close() {
      if (closed) return;
      closed = true;
      off();
      offLoader();
      ui?.remove();
      bar.remove();
    },
  };
}

export const feature: Feature = {
  pages: ["round"],
  toggles: ["gridTools"],
  mount(context) {
    const { page, region, onMutation } = context;
    if (page.kind !== "round") return;
    const records = page.records;
    const match = records ? createCardMatcher(records) : null;

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "grid-tools");
    style.textContent = gridCss;
    (document.head ?? document.documentElement).append(style);

    let tools: GridTools | null = null;
    let preview: Preview | null = null;
    let carry: Seed | null = null;

    const closePreview = (): void => {
      preview?.close();
      preview = null;
    };

    const sync = (): void => {
      if (tools?.isIntact()) return;
      const section = findReceivedSection(region);
      const view = section ? readRoundView(section) : null;
      const collected =
        section && view === "grid" ? collect(section, match) : null;
      if (!collected) {
        tools?.close();
        tools = null;
        if (section && view === "carousel") {
          if (preview && !preview.section.isConnected) closePreview();
          preview ??= openPreview(context, section, records, (seed) => {
            carry = seed;
            seeAllButton(section)?.click();
          });
        } else {
          closePreview();
        }
        return;
      }
      closePreview();
      if (tools && tools.grid !== collected.grid) {
        tools.close();
        tools = null;
      }
      if (tools) tools.update(collected.entries);
      else {
        tools = openTools(context, collected, carry);
        carry = null;
      }
    };

    onMutation(sync);
    sync();

    return () => {
      tools?.close();
      tools = null;
      closePreview();
      style.remove();
    };
  },
};
