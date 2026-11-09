import type { ReactNode } from "react";
import { LINKS, type ReviewState, type Submission } from "shared";
import type { AvatarStackPerson } from "../../../components/AvatarStack";
import {
  BuildersLoader,
  type BuildersLoaderStatus,
} from "../../../components/BuildersLoader";
import {
  CardCorner,
  type CardCornerProps,
} from "../../../components/CardCorner";
import { CardMeta, type CardMetaProps } from "../../../components/CardMeta";
import { createBackgroundFetch } from "../../../lib/ai/background-fetch";
import { formatBudget, trackLabel } from "../../../lib/export/format";
import type { Settings } from "../../../lib/settings";
import {
  ENRICH_CONCURRENCY,
  type EnrichBlock,
  type EnrichedBuilder,
  type Enrichment,
  enrichBlockMessage,
  enrichSubmission,
  onEnrichBlock,
  readEnrichBlock,
} from "../../../lib/site/enrich";
import { clearLoader, publishLoader } from "../../../lib/site/loader-store";
import {
  findAwardedSection,
  findReceivedSection,
  mapRoundCards,
  readRoundPhases,
} from "../../../lib/site/round";
import {
  readRoundCount,
  writeRoundCount,
} from "../../../lib/site/round-counts";
import {
  loadSavedFacts,
  onFacts,
  publishFacts,
  readFacts,
} from "../../../lib/site/round-facts";
import { SECTION_HEADING } from "../../../lib/site/selectors/round";
import {
  hasStellarlightProfile,
  loadStellarlightHandles,
  onStellarlight,
} from "../../../lib/site/stellarlight";
import type { Feature } from "../../../lib/ui/feature";
import { type MountedUi, OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import cardsCss from "../styles/cards.scss?inline";

const COVER_IMAGE = "img:not([data-bscf])";
const COVER_ATTRIBUTE = "data-bscf-cover";
const CARD_ATTRIBUTE = "data-bscf-card";
const RETRY_PASSES = 2;
const RETRY_DELAY_MS = 1500;

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
const META_SLOT = "cards-meta-slot";
const CORNER_SLOT = "cards-corner-slot";
const BACKDROP = "cards-backdrop";
const LOADER_SLOT = "cards-loader-bar";
const HOVER_DELAY_MS = 350;
const TRACK_VARIANT = {
  open: "olive",
  integration: "purple",
  rfp: "yellow",
} as const;

interface Entry {
  id: string;
  card: Element;
  uis: MountedUi[];
  slots: HTMLElement[];
  corner: MountedUi | null;
  cover: Element | null;
  image: HTMLImageElement | null;
  objectFit: string;
  backdrop: HTMLImageElement | null;
  meta: MountedUi | null;
  hasMeta: boolean;
  hoverTimer: number | undefined;
  listeners: AbortController | null;
  gone: boolean;
}

type ReviewPatch = Partial<Pick<ReviewState, "stance" | "shortlisted">>;

let coverFit = false;

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

function trackHint(
  source: Submission["trackSource"],
  track: Submission["track"] | null,
): string | null {
  if (source === "api") return "From the site's track field";
  if (source === "heuristic" && track === "rfp")
    return "The proposal says it responds to an RFP";
  if (source === "heuristic")
    return "Derived from the proposal's on-chain metric section";
  return null;
}

function githubAvatar(handle: string): string {
  return `https://github.com/${encodeURIComponent(handle)}.png?size=96`;
}

function githubOwner(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    return parsed.pathname.split("/").find((part) => part.length > 0) ?? null;
  } catch {
    return null;
  }
}

function profileHref({ linkedin, github, x }: EnrichedBuilder): string | null {
  if (github)
    return hasStellarlightProfile(github)
      ? `${LINKS.stellarlightBuilders}/${encodeURIComponent(github)}`
      : `https://github.com/${encodeURIComponent(github)}`;
  if (x) return `https://x.com/${encodeURIComponent(x)}`;
  return linkedin;
}

function builderPeople(facts: Enrichment): AvatarStackPerson[] {
  const onStellarlight = (github: string | null): boolean =>
    github !== null && hasStellarlightProfile(github);
  const ordered = [
    ...facts.builders.filter(({ github }) => onStellarlight(github)),
    ...facts.builders.filter(({ github }) => !onStellarlight(github)),
  ];
  const people: AvatarStackPerson[] = ordered.map((builder) => ({
    name: builder.name,
    role:
      builder.github && hasStellarlightProfile(builder.github)
        ? `${builder.role ?? "Builder"} · Stellarlight profile`
        : builder.role,
    src: builder.github ? githubAvatar(builder.github) : null,
    href: profileHref(builder),
  }));
  const owner = githubOwner(facts.projectGithub);
  if (
    owner &&
    !facts.builders.some(
      ({ github }) => github?.toLowerCase() === owner.toLowerCase(),
    )
  ) {
    people.push({
      name: owner,
      role: "On GitHub",
      src: githubAvatar(owner),
      href: facts.projectGithub,
    });
  }
  return people;
}

function metaProps(
  facts: Enrichment | undefined,
  settings: Settings,
): CardMetaProps | null {
  if (!facts) return null;
  const props: CardMetaProps = {};
  const hint = trackHint(facts.trackSource, facts.track);
  if (settings.trackChips && facts.track && hint) {
    props.track = {
      label: trackLabel(facts.track),
      variant: TRACK_VARIANT[facts.track],
      icon: facts.track,
      hint,
    };
  }
  const awarded = facts.awardedUsd;
  if (settings.awardedChip && awarded !== null && awarded > 0) {
    const count = facts.awardedCount;
    const amount = formatBudget(awarded).replace(/\.0(?=[KM])/, "");
    props.awarded = {
      label: `Awarded before ${amount}`,
      shortLabel: `Awarded ${amount}`,
      variant: "yellow",
      hint:
        count === null
          ? "Total awarded to this project before"
          : `${count} awarded ${count === 1 ? "submission" : "submissions"}`,
    };
  }
  if (
    settings.avatarStack &&
    (facts.builders.length > 0 || facts.projectGithub)
  ) {
    props.people = builderPeople(facts);
  }
  return props.track || props.awarded || props.people ? props : null;
}

export const feature: Feature = {
  pages: ["round"],
  toggles: [
    "trackChips",
    "awardedChip",
    "avatarStack",
    "readState",
    "shortlistAndStance",
    "coverNormalization",
  ],
  mount({ page, region, settings, store, signal, mount, onMutation, warn }) {
    if (page.kind !== "round" || !page.records) return;
    const records = page.records;
    const roundId = page.roundId;
    const wantsMeta =
      settings.trackChips || settings.awardedChip || settings.avatarStack;
    const wantsReviews = settings.readState || settings.shortlistAndStance;
    const wantsCorner = wantsReviews || settings.coverNormalization;

    const enrichable = wantsMeta && settings.loadProposalPages;

    const facts = new Map<string, Enrichment>();
    const tried = new Set<string>();
    const reviews = new Map<string, ReviewState>();
    let reviewsLoaded = !wantsReviews;

    const entries = new Map<Element, Entry>();
    const byId = new Map<string, Set<Entry>>();

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "cards");
    style.textContent = cardsCss;
    (document.head ?? document.documentElement).append(style);

    const applyFit = (entry: Entry): void => {
      const { cover, image } = entry;
      if (!cover || !image) return;
      if (!coverFit) {
        image.style.objectFit = entry.objectFit;
        entry.backdrop?.remove();
        entry.backdrop = null;
        return;
      }
      image.style.objectFit = "contain";
      if (entry.backdrop) return;
      const place = (): void => {
        if (!coverFit || entry.gone || entry.backdrop || !image.currentSrc)
          return;
        const backdrop = document.createElement("img");
        backdrop.setAttribute(OWN_ATTRIBUTE, BACKDROP);
        backdrop.alt = "";
        backdrop.decoding = "async";
        backdrop.src = image.currentSrc;
        cover.prepend(backdrop);
        entry.backdrop = backdrop;
      };
      if (image.currentSrc) place();
      else image.addEventListener("load", place, { once: true, signal });
    };

    const cornerProps = (entry: Entry): CardCornerProps => {
      const review = reviews.get(entry.id) ?? blankReview(entry.id);
      const props: CardCornerProps = {};
      if (settings.readState && reviewsLoaded) {
        const opened = review.openedCount > 0;
        if (settings.showOpenedInsteadOfUnread)
          props.dot = opened ? "opened" : null;
        else props.dot = opened ? null : "unread";
      }
      if (settings.shortlistAndStance) {
        props.shortlisted = review.shortlisted;
        props.stance = review.stance;
        props.onShortlistChange = (shortlisted) =>
          save(entry.id, { shortlisted });
        props.onStanceChange = (stance) => save(entry.id, { stance });
      }
      if (settings.coverNormalization && entry.image) {
        props.isFit = coverFit;
        props.onFitChange = setFit;
      }
      return props;
    };

    const renderCorner = (entry: Entry): void => {
      entry.corner?.render(<CardCorner {...cornerProps(entry)} />);
    };

    const renderId = (id: string): void => {
      for (const entry of byId.get(id) ?? []) renderCorner(entry);
    };

    let writes: Promise<void> = Promise.resolve();

    function save(id: string, patch: ReviewPatch): void {
      reviews.set(id, { ...(reviews.get(id) ?? blankReview(id)), ...patch });
      renderId(id);
      writes = writes
        .then(async () => {
          const stored = await store.send("getReview", id);
          const next = { ...(stored ?? blankReview(id)), ...patch };
          await store.rpc.putReview(next);
          reviews.set(id, next);
          renderId(id);
        })
        .catch((error: unknown) => warn("save review", error));
    }

    function setFit(next: boolean): void {
      coverFit = next;
      for (const entry of entries.values()) {
        applyFit(entry);
        renderCorner(entry);
      }
    }

    const place = async (
      entry: Entry,
      anchor: Element,
      part: "meta" | "corner",
      children: ReactNode,
    ): Promise<void> => {
      const slot = document.createElement("div");
      slot.setAttribute(
        OWN_ATTRIBUTE,
        part === "meta" ? META_SLOT : CORNER_SLOT,
      );
      anchor.append(slot);
      entry.slots.push(slot);
      const ui = await mount({ name: part, anchor: slot, children });
      if (!ui) {
        slot.remove();
        return;
      }
      if (entry.gone) {
        ui.remove();
        return;
      }
      entry.uis.push(ui);
      if (part === "corner") {
        entry.corner = ui;
        if (reviewsLoaded && wantsReviews) renderCorner(entry);
      } else {
        entry.meta = ui;
        ui.render(
          <CardMeta {...(metaProps(facts.get(entry.id), settings) ?? {})} />,
        );
      }
    };

    const placeMeta = (entry: Entry): void => {
      const meta = metaProps(facts.get(entry.id), settings);
      if (!meta) return;
      if (entry.meta) {
        entry.meta.render(<CardMeta {...meta} />);
        return;
      }
      if (entry.hasMeta) return;
      const frame = entry.cover?.parentElement ?? null;
      if (!frame) {
        warn("card cover not found for the badges");
        return;
      }
      entry.hasMeta = true;
      void place(entry, frame, "meta", <CardMeta {...meta} />);
    };

    let frozenRound = false;
    const roundEnded = (): boolean => {
      const name = page.roundName;
      if (!name) return false;
      const text = document.body.innerText.replace(/\s+/g, " ");
      const at = text.indexOf(name);
      return (
        at >= 0 &&
        /^[^.]{0,40}\bEnded\b/.test(
          text.slice(at + name.length, at + name.length + 40),
        )
      );
    };
    const isFrozen = (): boolean => {
      if (frozenRound) return true;
      const close = readRoundPhases(document).find((phase) =>
        /submission/i.test(phase.name),
      )?.endsAt;
      frozenRound = (close != null && close < Date.now()) || roundEnded();
      return frozenRound;
    };

    const adoptFacts = (data: Enrichment): void => {
      facts.set(data.id, data);
      for (const entry of byId.get(data.id) ?? []) placeMeta(entry);
    };

    const setFacts = (data: Enrichment): void => {
      adoptFacts(data);
      publishFacts(data);
    };

    const adoptKnown = (): void => {
      for (const [id, data] of readFacts())
        if (!facts.has(id)) adoptFacts(data);
    };
    adoptKnown();
    const offFacts = onFacts(adoptKnown);
    void loadSavedFacts();
    signal.addEventListener("abort", offFacts, { once: true });
    const offStellarlight = onStellarlight(() => {
      for (const entry of entries.values()) placeMeta(entry);
    });
    signal.addEventListener("abort", offStellarlight, { once: true });
    if (wantsMeta)
      loadStellarlightHandles({
        serverUrl: import.meta.env.WXT_SERVER_URL ?? "",
        fetch: createBackgroundFetch(),
        getClientId: () => store.send("getClientId", undefined),
      }).catch((error: unknown) => warn("stellarlight builders", error));

    const stopHover = (entry: Entry): void => {
      window.clearTimeout(entry.hoverTimer);
      entry.hoverTimer = undefined;
    };

    const startHover = (entry: Entry): void => {
      if (!enrichable || facts.has(entry.id) || tried.has(entry.id)) return;
      if (entry.hoverTimer !== undefined) return;
      entry.hoverTimer = window.setTimeout(() => {
        entry.hoverTimer = undefined;
        if (entry.gone || signal.aborted) return;
        tried.add(entry.id);
        enrichSubmission(entry.id, signal, isFrozen()).then((data) => {
          if (data && !signal.aborted) setFacts(data);
        });
      }, HOVER_DELAY_MS);
    };

    const nearby = new Set<Entry>();
    let pumping = false;

    async function pump(): Promise<void> {
      if (pumping || !enrichable) return;
      pumping = true;
      try {
        while (!signal.aborted && document.visibilityState === "visible") {
          let next: Entry | null = null;
          let nearest = Number.POSITIVE_INFINITY;
          for (const entry of nearby) {
            if (entry.gone || facts.has(entry.id) || tried.has(entry.id))
              continue;
            const box = entry.card.getBoundingClientRect();
            if (box.width === 0) continue;
            const distance = Math.abs(
              (box.top + box.bottom) / 2 - window.innerHeight / 2,
            );
            if (distance < nearest) {
              next = entry;
              nearest = distance;
            }
          }
          if (!next) break;
          tried.add(next.id);
          const data = await enrichSubmission(next.id, signal, isFrozen());
          if (signal.aborted) break;
          if (data) setFacts(data);
          else if (await readEnrichBlock()) break;
        }
      } finally {
        pumping = false;
      }
    }

    const watcher = enrichable
      ? new IntersectionObserver(
          (changes) => {
            for (const change of changes) {
              const entry = entries.get(change.target);
              if (!entry) continue;
              if (change.isIntersecting) nearby.add(entry);
              else nearby.delete(entry);
            }
            void pump();
          },
          { rootMargin: "100% 0px" },
        )
      : null;
    signal.addEventListener("abort", () => watcher?.disconnect(), {
      once: true,
    });
    if (enrichable) {
      document.addEventListener("visibilitychange", () => void pump(), {
        signal,
      });
    }

    const attach = (card: Element, id: string): void => {
      card.setAttribute(CARD_ATTRIBUTE, "");
      const entry: Entry = {
        id,
        card,
        uis: [],
        slots: [],
        corner: null,
        cover: null,
        image: null,
        objectFit: "",
        backdrop: null,
        meta: null,
        hasMeta: false,
        hoverTimer: undefined,
        listeners: null,
        gone: false,
      };
      entries.set(card, entry);
      watcher?.observe(card);
      const siblings = byId.get(id);
      if (siblings) siblings.add(entry);
      else byId.set(id, new Set([entry]));

      const image = card.querySelector<HTMLImageElement>(COVER_IMAGE);
      const cover = image?.parentElement ?? null;
      const frame = cover?.parentElement ?? null;
      if (image && cover && frame) {
        entry.image = image;
        entry.cover = cover;
        entry.objectFit = image.style.objectFit;
        if (settings.coverNormalization) {
          cover.setAttribute(COVER_ATTRIBUTE, "");
          applyFit(entry);
        }
      } else if (wantsCorner) {
        warn("cover not found");
      }

      placeMeta(entry);
      if (wantsCorner && frame)
        void place(
          entry,
          frame,
          "corner",
          <CardCorner {...cornerProps(entry)} />,
        );
      if (enrichable) {
        const listeners = new AbortController();
        const options = { signal: AbortSignal.any([signal, listeners.signal]) };
        card.addEventListener("pointerenter", () => startHover(entry), options);
        card.addEventListener("focusin", () => startHover(entry), options);
        card.addEventListener("pointerleave", () => stopHover(entry), options);
        card.addEventListener("focusout", () => stopHover(entry), options);
        entry.listeners = listeners;
      }
    };

    const detach = (entry: Entry): void => {
      stopHover(entry);
      entry.listeners?.abort();
      entry.gone = true;
      for (const ui of entry.uis) ui.remove();
      for (const slot of entry.slots) slot.remove();
      entry.backdrop?.remove();
      if (entry.image) entry.image.style.objectFit = entry.objectFit;
      entry.cover?.removeAttribute(COVER_ATTRIBUTE);
      entry.card.removeAttribute(CARD_ATTRIBUTE);
      watcher?.unobserve(entry.card);
      nearby.delete(entry);
      byId.get(entry.id)?.delete(entry);
      entries.delete(entry.card);
    };

    let loader: {
      status: BuildersLoaderStatus;
      done: number;
      total: number;
      message: string | null;
    } = { status: "idle", done: 0, total: 0, message: null };
    let loaderBar: HTMLElement | null = null;
    let loaderUi: MountedUi | null = null;
    let batch: AbortController | null = null;

    const loaderView = () => (
      <BuildersLoader
        status={loader.status}
        done={loader.done}
        total={loader.total || entries.size}
        message={loader.message}
        onStart={() => void runBatch(true)}
        onCancel={() => batch?.abort()}
      />
    );

    const renderLoader = (): void => {
      loaderUi?.render(loaderView());
      if (!enrichable) return;
      publishLoader(
        { ...loader, total: loader.total || entries.size },
        { start: () => void runBatch(true), cancel: () => batch?.abort() },
      );
    };

    const stopLoader = (reason: EnrichBlock): void => {
      loader = {
        ...loader,
        status: "stopped",
        message: enrichBlockMessage(reason),
      };
      batch?.abort();
      renderLoader();
    };

    async function runBatch(refresh = false): Promise<void> {
      if (batch) return;
      const center = window.innerHeight / 2;
      const nearest = new Map<string, number>();
      for (const entry of entries.values()) {
        const box = entry.card.getBoundingClientRect();
        const distance =
          box.width === 0
            ? Number.POSITIVE_INFINITY
            : Math.abs((box.top + box.bottom) / 2 - center);
        nearest.set(
          entry.id,
          Math.min(nearest.get(entry.id) ?? Number.POSITIVE_INFINITY, distance),
        );
      }
      const ids = [...nearest.entries()]
        .sort((a, b) => a[1] - b[1])
        .map(([id]) => id);
      const control = new AbortController();
      const stop = AbortSignal.any([signal, control.signal]);
      batch = control;
      await loadSavedFacts();
      adoptKnown();
      const previous = await readRoundCount(roundId).catch(() => null);
      const force =
        refresh ||
        (previous !== null && previous !== ids.length) ||
        (loader.total > 0 && loader.total !== ids.length);
      const pending = force ? ids : ids.filter((id) => !facts.has(id));
      loader = {
        status: "running",
        done: ids.length - pending.length,
        total: ids.length,
        message: null,
      };
      renderLoader();
      const frozen = isFrozen();
      const load = async (queue: readonly string[]): Promise<void> => {
        let cursor = 0;
        const worker = async (): Promise<void> => {
          while (!stop.aborted) {
            const id = queue[cursor++];
            if (id === undefined) return;
            const data = await enrichSubmission(id, stop, frozen, force);
            if (stop.aborted) return;
            if (!data) continue;
            setFacts(data);
            loader = { ...loader, done: loader.done + 1 };
            renderLoader();
          }
        };
        await Promise.all(
          Array.from(
            { length: Math.min(ENRICH_CONCURRENCY, queue.length) },
            () => worker(),
          ),
        );
      };
      let missing = pending;
      for (let pass = 0; pass <= RETRY_PASSES; pass += 1) {
        if (pass > 0) await wait(RETRY_DELAY_MS * pass, stop);
        if (stop.aborted || loader.status === "stopped") break;
        await load(missing);
        missing = missing.filter((id) => !facts.has(id));
        if (missing.length === 0) break;
      }
      batch = null;
      if (signal.aborted || loader.status === "stopped") return;
      if (control.signal.aborted) {
        loader = { ...loader, status: "cancelled" };
        renderLoader();
        return;
      }
      if (missing.length > 0) {
        const block = await readEnrichBlock().catch(() => null);
        loader = {
          ...loader,
          status: "stopped",
          message: block
            ? enrichBlockMessage(block)
            : `${missing.length} of ${ids.length} proposals could not be loaded. Use reload to try again.`,
        };
        renderLoader();
        return;
      }
      loader = { ...loader, status: "done" };
      renderLoader();
      void writeRoundCount(roundId, ids.length).catch(() => {});
      kick();
    }

    let kickTimer: number | undefined;
    const needsLoad = (): boolean => {
      const ids = new Set<string>();
      for (const entry of entries.values()) ids.add(entry.id);
      if (ids.size === 0) return false;
      return ids.size !== loader.total || [...ids].some((id) => !facts.has(id));
    };
    const kick = (): void => {
      if (
        !enrichable ||
        batch ||
        loader.status === "stopped" ||
        loader.status === "cancelled"
      )
        return;
      window.clearTimeout(kickTimer);
      kickTimer = window.setTimeout(() => {
        if (!signal.aborted && !batch && needsLoad()) void runBatch();
      }, 800);
    };
    signal.addEventListener("abort", () => window.clearTimeout(kickTimer), {
      once: true,
    });

    const syncLoader = (section: Element): void => {
      if (!enrichable || settings.gridTools || loaderBar?.isConnected) return;
      const row =
        section.querySelector(SECTION_HEADING)?.parentElement?.parentElement;
      if (!row) {
        warn("round header row not found");
        return;
      }
      loaderUi?.remove();
      loaderBar?.remove();
      const bar = document.createElement("div");
      bar.setAttribute(OWN_ATTRIBUTE, LOADER_SLOT);
      row.after(bar);
      loaderBar = bar;
      loaderUi = null;
      mount({ name: "cards-loader", anchor: bar, children: loaderView() }).then(
        (ui) => {
          if (!ui) return;
          if (signal.aborted || loaderBar !== bar) {
            ui.remove();
            return;
          }
          loaderUi = ui;
          ui.render(loaderView());
        },
        (error: unknown) => warn("mount loader", error),
      );
    };

    const sync = (): void => {
      const section = findReceivedSection(region);
      if (!section) return;
      const live = new Set<Element>();
      const awarded = findAwardedSection(region);
      for (const where of awarded ? [awarded, section] : [section]) {
        for (const { card, record } of mapRoundCards(where, records)) {
          live.add(card);
          if (!entries.has(card)) attach(card, record.id);
        }
      }
      for (const entry of [...entries.values()])
        if (!live.has(entry.card)) detach(entry);
      syncLoader(section);
      kick();
    };

    sync();
    onMutation(sync);
    renderLoader();
    if (enrichable) {
      const offBlock = onEnrichBlock(stopLoader);
      signal.addEventListener("abort", offBlock, { once: true });
      readEnrichBlock().then(
        (reason) => {
          if (reason && !signal.aborted) stopLoader(reason);
        },
        (error: unknown) => warn("read enrichment state", error),
      );
    }

    if (wantsReviews) {
      const settle = (): void => {
        if (signal.aborted) return;
        reviewsLoaded = true;
        for (const entry of entries.values()) renderCorner(entry);
      };
      store.send("listReviews", undefined).then(
        (list) => {
          for (const review of list) reviews.set(review.submissionId, review);
          settle();
        },
        (error: unknown) => {
          warn("read reviews", error);
          settle();
        },
      );
    }

    return () => {
      batch?.abort();
      clearLoader();
      loaderUi?.remove();
      loaderBar?.remove();
      for (const entry of [...entries.values()]) detach(entry);
      style.remove();
    };
  },
};
