import type { ReviewState, Stance } from "shared";
import {
  ReviewerBar,
  type ReviewerCopyStatus,
  type ReviewerNoteStatus,
} from "../../../components/ReviewerBar";
import { ReviewerTeamAvatar } from "../../../components/ReviewerTeamAvatar";
import { formatBudget, trackLabel } from "../../../lib/export/format";
import type { Feature, FeatureContext } from "../../../lib/ui/feature";
import { type MountedUi, OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import reviewerCss from "../styles/reviewer-bar.scss?inline";

const NOTE_DEBOUNCE_MS = 300;
const COPY_RESET_MS = 2000;
const WIDE_QUERY = "(min-width: 40rem)";
const BAR_SLOT = "reviewer-bar-slot";
const TEAM_SLOT = "reviewer-bar-team-slot";
const TEAM_PLACEHOLDER = 'img[src*="user-image-placeholder"]';
const TEAM_CARD = ".swiper-slide";
const HYDRATED_MARKER = "next-route-announcer";
const HANDLE = /^[A-Za-z0-9_-]{1,39}$/;
const STANCE_WORD: Record<Stance, string> = {
  none: "no stance",
  support: "support",
  unsure: "unsure",
  against: "against",
};

interface TeamEntry {
  frame: Element;
  slot: HTMLElement;
  ui: MountedUi | null;
}

interface SummaryParts {
  title: string;
  track: string | null;
  budget: string | null;
}

interface TeamPerson {
  name: string;
  src: string | null;
  href: string;
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

function isHydrated(): boolean {
  return document.querySelector(HYDRATED_MARKER) !== null;
}

function decode(text: string): string {
  const parsed = new DOMParser().parseFromString(text, "text/html")
    .documentElement.textContent;
  return (parsed ?? text).replace(/\s+/g, " ").trim();
}

function externalUrl(anchor: Element): URL | null {
  try {
    const url = new URL(anchor.getAttribute("href") ?? "", location.origin);
    const target =
      url.pathname === "/redirect" ? url.searchParams.get("url") : null;
    return target === null ? url : new URL(target);
  } catch {
    return null;
  }
}

function firstSegment(url: URL): string | null {
  const segment = url.pathname.split("/").find((part) => part !== "");
  return segment !== undefined && HANDLE.test(segment) ? segment : null;
}

function personOf(card: Element): TeamPerson | null {
  let github: string | null = null;
  let x: string | null = null;
  let linkedin: string | null = null;
  for (const anchor of card.querySelectorAll("a[href]")) {
    const url = externalUrl(anchor);
    if (!url) continue;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "github.com") github ??= firstSegment(url);
    else if (host === "x.com" || host === "twitter.com")
      x ??= firstSegment(url);
    else if (host === "linkedin.com" || host.endsWith(".linkedin.com"))
      linkedin ??= url.href;
  }
  const name = decode(card.querySelector("p")?.textContent ?? "");
  if (github) {
    return {
      name,
      src: `https://github.com/${github}.png?size=256`,
      href: `https://github.com/${github}`,
    };
  }
  if (x)
    return {
      name,
      src: `https://unavatar.io/x/${x}`,
      href: `https://x.com/${x}`,
    };
  if (linkedin) return { name, src: null, href: linkedin };
  return null;
}

async function mountReviewerBar(
  context: FeatureContext,
  id: string,
  summary: SummaryParts,
): Promise<() => void> {
  const { store, signal, warn } = context;
  if (signal.aborted) return () => {};
  let review = blankReview(id);
  let note = review.note;
  let isEdited = false;
  let noteStatus: ReviewerNoteStatus = "idle";
  let copyStatus: ReviewerCopyStatus = "idle";
  let expanded = window.matchMedia(WIDE_QUERY).matches;
  let noteTimer: ReturnType<typeof setTimeout> | undefined;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let ui: MountedUi | null = null;
  let closed = false;

  const slot = document.createElement("div");
  slot.setAttribute(OWN_ATTRIBUTE, BAR_SLOT);
  document.body.append(slot);

  let writes: Promise<unknown> = Promise.resolve();

  const persist = (patch: Partial<ReviewState>): Promise<boolean> => {
    const step = writes.then(async () => {
      let stored: ReviewState | null;
      try {
        stored = await store.send("getReview", id);
      } catch (error) {
        warn("read review before save", error);
        return false;
      }
      try {
        await store.rpc.putReview({ ...(stored ?? blankReview(id)), ...patch });
        return true;
      } catch (error) {
        warn("save review", error);
        return false;
      }
    });
    writes = step;
    return step;
  };

  const bar = () => (
    <ReviewerBar
      stance={review.stance}
      onStanceChange={(stance) => {
        isEdited = true;
        review = { ...review, stance };
        void persist({ stance });
        render();
      }}
      shortlisted={review.shortlisted}
      onShortlistChange={(shortlisted) => {
        isEdited = true;
        review = { ...review, shortlisted };
        void persist({ shortlisted });
        render();
      }}
      note={note}
      noteStatus={noteStatus}
      onNoteChange={(value) => {
        isEdited = true;
        note = value;
        noteStatus = "saving";
        clearTimeout(noteTimer);
        noteTimer = setTimeout(flushNote, NOTE_DEBOUNCE_MS);
        render();
      }}
      copyStatus={copyStatus}
      onCopy={() => void copy()}
      isExpanded={expanded}
      onExpandedChange={(value) => {
        expanded = value;
        render();
      }}
    />
  );

  function render(): void {
    ui?.render(bar());
  }

  function flushNote(): void {
    noteTimer = undefined;
    const value = note;
    void persist({ note: value }).then((ok) => {
      if (closed) return;
      if (!ok) {
        noteStatus = "idle";
        render();
        return;
      }
      if (note !== value || noteTimer !== undefined) return;
      noteStatus = "saved";
      render();
    });
  }

  async function copy(): Promise<void> {
    const line = [
      summary.title,
      summary.track,
      summary.budget,
      STANCE_WORD[review.stance],
    ]
      .filter((part): part is string => part !== null && part !== "")
      .join(" · ");
    clearTimeout(copyTimer);
    try {
      await navigator.clipboard.writeText(line);
      copyStatus = "copied";
    } catch {
      copyStatus = "failed";
    }
    if (closed) return;
    render();
    copyTimer = setTimeout(() => {
      copyStatus = "idle";
      render();
    }, COPY_RESET_MS);
  }

  const handle = await context.mount({ anchor: slot, children: bar() });
  if (!handle) {
    slot.remove();
    return () => {};
  }
  if (closed) handle.remove();
  else ui = handle;

  store.rpc.getReview(id).then(
    (stored) => {
      if (closed || isEdited || !stored) return;
      review = stored;
      note = stored.note;
      render();
    },
    (error: unknown) => warn("read review", error),
  );

  return () => {
    closed = true;
    clearTimeout(copyTimer);
    if (noteTimer !== undefined) {
      clearTimeout(noteTimer);
      void persist({ note });
    }
    ui?.remove();
    slot.remove();
  };
}

function mountTeamAvatars(context: FeatureContext) {
  const { region, onMutation, warn } = context;
  const entries = new Map<Element, TeamEntry>();
  let closed = false;

  const detach = (entry: TeamEntry): void => {
    entry.ui?.remove();
    entry.slot.remove();
    entries.delete(entry.frame);
  };

  const sync = (): void => {
    for (const entry of [...entries.values()])
      if (!entry.frame.isConnected) detach(entry);
    if (!isHydrated()) return;
    for (const image of region.querySelectorAll(TEAM_PLACEHOLDER)) {
      const frame = image.parentElement;
      const card = image.closest(TEAM_CARD);
      if (!frame || !card || entries.has(frame) || card.querySelector("button"))
        continue;
      const person = personOf(card);
      if (!person) continue;
      const slot = document.createElement("div");
      slot.setAttribute(OWN_ATTRIBUTE, TEAM_SLOT);
      frame.append(slot);
      const entry: TeamEntry = { frame, slot, ui: null };
      entries.set(frame, entry);
      context
        .mount({
          name: "team-avatar",
          anchor: slot,
          children: (
            <ReviewerTeamAvatar
              name={person.name}
              src={person.src}
              href={person.href}
            />
          ),
        })
        .then((handle) => {
          if (!handle) {
            detach(entry);
            return;
          }
          if (closed || !entries.has(frame)) handle.remove();
          else entry.ui = handle;
        })
        .catch((error: unknown) => warn("mount team avatar", error));
    }
  };

  onMutation(sync);
  sync();

  return () => {
    closed = true;
    for (const entry of [...entries.values()]) detach(entry);
  };
}

export const feature: Feature = {
  pages: ["submission"],
  toggles: ["reviewerBar", "teamAvatars"],
  async mount(context) {
    const { page, settings, warn } = context;
    if (page.kind !== "submission") return;
    const parsed = page.page;
    if (!parsed) {
      warn("submission not parsed");
      return;
    }
    const { submission } = parsed;

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "reviewer-bar");
    style.textContent = reviewerCss;
    (document.head ?? document.documentElement).append(style);

    const cleanups: (() => void)[] = [];
    if (settings.teamAvatars) cleanups.push(mountTeamAvatars(context));
    if (settings.reviewerBar) {
      cleanups.push(
        await mountReviewerBar(context, submission.id, {
          title: submission.title,
          track:
            submission.track === "unknown"
              ? null
              : trackLabel(submission.track),
          budget:
            submission.budgetUsd === null
              ? null
              : formatBudget(submission.budgetUsd),
        }),
      );
    }

    return () => {
      for (const cleanup of cleanups) cleanup();
      style.remove();
    };
  },
};
