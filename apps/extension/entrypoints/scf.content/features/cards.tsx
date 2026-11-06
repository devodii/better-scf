import type { ReactNode } from 'react';
import type { ReviewState, Submission } from 'shared';
import { BuildersLoader, type BuildersLoaderStatus } from '../../../components/BuildersLoader';
import { CardCorner, type CardCornerProps } from '../../../components/CardCorner';
import { CardMeta, type CardMetaProps } from '../../../components/CardMeta';
import { formatBudget, trackLabel } from '../../../lib/export/format';
import type { Settings } from '../../../lib/settings';
import {
  type EnrichBlock,
  type Enrichment,
  enrichBlockMessage,
  enrichSubmission,
  onEnrichBlock,
  readEnrichBlock,
  toEnrichment,
} from '../../../lib/site/enrich';
import { findReceivedSection, mapRoundCards } from '../../../lib/site/round';
import { CARD_BYLINE_PREFIX, CARD_TEXT, SECTION_HEADING } from '../../../lib/site/selectors/round';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import cardsCss from '../styles/cards.scss?inline';

const COVER_IMAGE = 'img:not([data-bscf])';
const COVER_ATTRIBUTE = 'data-bscf-cover';
const META_SLOT = 'cards-meta-slot';
const CORNER_SLOT = 'cards-corner-slot';
const BACKDROP = 'cards-backdrop';
const LOADER_SLOT = 'cards-loader-bar';
const HOVER_DELAY_MS = 350;
const TRACK_VARIANT = { open: 'olive', integration: 'purple', rfp: 'yellow' } as const;

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

type ReviewPatch = Partial<Pick<ReviewState, 'stance' | 'shortlisted'>>;

let coverFit = false;

function blankReview(submissionId: string): ReviewState {
  return {
    submissionId,
    stance: 'none',
    shortlisted: false,
    note: '',
    lastOpenedAt: null,
    openedCount: 0,
  };
}

function trackHint(source: Submission['trackSource']): string | null {
  if (source === 'api') return "From the site's track field";
  if (source === 'heuristic') return "Derived from the proposal's on-chain metric section";
  return null;
}

function metaProps(facts: Enrichment | undefined, settings: Settings): CardMetaProps | null {
  if (!facts) return null;
  const props: CardMetaProps = {};
  const hint = trackHint(facts.trackSource);
  if (settings.trackChips && facts.track && hint) {
    props.track = {
      label: trackLabel(facts.track),
      variant: TRACK_VARIANT[facts.track],
      hint,
    };
  }
  const awarded = facts.awardedUsd;
  if (settings.awardedChip && awarded !== null && awarded > 0) {
    const count = facts.awardedCount;
    const amount = formatBudget(awarded).replace(/\.0(?=[KM])/, '');
    props.awarded = {
      label: `Awarded before ${amount}`,
      shortLabel: `Awarded ${amount}`,
      variant: 'yellow',
      hint:
        count === null
          ? 'Total awarded to this project before'
          : `${count} awarded ${count === 1 ? 'submission' : 'submissions'}`,
    };
  }
  if (settings.avatarStack && facts.builders.length > 0) {
    props.people = facts.builders.map(({ name, role, linkedin }) => ({
      name,
      role,
      href: linkedin,
    }));
  }
  return props.track || props.awarded || props.people ? props : null;
}

function findFooter(card: Element): Element | null {
  for (const text of card.querySelectorAll(CARD_TEXT)) {
    if (text.textContent?.trimStart().startsWith(CARD_BYLINE_PREFIX)) return text.parentElement;
  }
  return null;
}

export const feature: Feature = {
  pages: ['round'],
  toggles: [
    'trackChips',
    'awardedChip',
    'avatarStack',
    'readState',
    'shortlistAndStance',
    'coverNormalization',
  ],
  mount({ page, region, settings, store, signal, mount, onMutation, warn }) {
    if (page.kind !== 'round' || !page.records) return;
    const records = page.records;
    const wantsMeta = settings.trackChips || settings.awardedChip || settings.avatarStack;
    const wantsReviews = settings.readState || settings.shortlistAndStance;
    const wantsCorner = wantsReviews || settings.coverNormalization;
    const round = /#\s*(\d+)/.exec(page.roundName ?? '')?.[1];

    const enrichable = wantsMeta && settings.loadProposalPages;

    const facts = new Map<string, Enrichment>();
    const tried = new Set<string>();
    const reviews = new Map<string, ReviewState>();
    let reviewsLoaded = !wantsReviews;

    const entries = new Map<Element, Entry>();
    const byId = new Map<string, Set<Entry>>();

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'cards');
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
      image.style.objectFit = 'contain';
      if (entry.backdrop) return;
      const place = (): void => {
        if (!coverFit || entry.gone || entry.backdrop || !image.currentSrc) return;
        const backdrop = document.createElement('img');
        backdrop.setAttribute(OWN_ATTRIBUTE, BACKDROP);
        backdrop.alt = '';
        backdrop.decoding = 'async';
        backdrop.src = image.currentSrc;
        cover.prepend(backdrop);
        entry.backdrop = backdrop;
      };
      if (image.currentSrc) place();
      else image.addEventListener('load', place, { once: true, signal });
    };

    const cornerProps = (entry: Entry): CardCornerProps => {
      const review = reviews.get(entry.id) ?? blankReview(entry.id);
      const props: CardCornerProps = {};
      if (settings.readState && reviewsLoaded) {
        const opened = review.openedCount > 0;
        if (settings.showOpenedInsteadOfUnread) props.dot = opened ? 'opened' : null;
        else props.dot = opened ? null : 'unread';
      }
      if (settings.shortlistAndStance) {
        props.shortlisted = review.shortlisted;
        props.stance = review.stance;
        props.onShortlistChange = (shortlisted) => save(entry.id, { shortlisted });
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
          const stored = await store.send('getReview', id);
          const next = { ...(stored ?? blankReview(id)), ...patch };
          await store.rpc.putReview(next);
          reviews.set(id, next);
          renderId(id);
        })
        .catch((error: unknown) => warn('save review', error));
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
      part: 'meta' | 'corner',
      children: ReactNode,
    ): Promise<void> => {
      const slot = document.createElement('div');
      slot.setAttribute(OWN_ATTRIBUTE, part === 'meta' ? META_SLOT : CORNER_SLOT);
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
      if (part === 'corner') {
        entry.corner = ui;
        if (reviewsLoaded && wantsReviews) renderCorner(entry);
      } else {
        entry.meta = ui;
        ui.render(<CardMeta {...(metaProps(facts.get(entry.id), settings) ?? {})} />);
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
      const footer = findFooter(entry.card);
      if (!footer) {
        warn('card footer not found');
        return;
      }
      entry.hasMeta = true;
      void place(entry, footer, 'meta', <CardMeta {...meta} />);
    };

    const setFacts = (data: Enrichment): void => {
      facts.set(data.id, data);
      for (const entry of byId.get(data.id) ?? []) placeMeta(entry);
    };

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
        enrichSubmission(entry.id, signal).then((data) => {
          if (data && !signal.aborted) setFacts(data);
        });
      }, HOVER_DELAY_MS);
    };

    const attach = (card: Element, id: string): void => {
      const entry: Entry = {
        id,
        card,
        uis: [],
        slots: [],
        corner: null,
        cover: null,
        image: null,
        objectFit: '',
        backdrop: null,
        meta: null,
        hasMeta: false,
        hoverTimer: undefined,
        listeners: null,
        gone: false,
      };
      entries.set(card, entry);
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
          cover.setAttribute(COVER_ATTRIBUTE, '');
          applyFit(entry);
        }
      } else if (wantsCorner) {
        warn('cover not found');
      }

      placeMeta(entry);
      if (wantsCorner && frame)
        void place(entry, frame, 'corner', <CardCorner {...cornerProps(entry)} />);
      if (enrichable) {
        const listeners = new AbortController();
        const options = { signal: AbortSignal.any([signal, listeners.signal]) };
        card.addEventListener('pointerenter', () => startHover(entry), options);
        card.addEventListener('focusin', () => startHover(entry), options);
        card.addEventListener('pointerleave', () => stopHover(entry), options);
        card.addEventListener('focusout', () => stopHover(entry), options);
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
      byId.get(entry.id)?.delete(entry);
      entries.delete(entry.card);
    };

    let loader: {
      status: BuildersLoaderStatus;
      done: number;
      total: number;
      message: string | null;
    } = { status: 'idle', done: 0, total: 0, message: null };
    let loaderBar: HTMLElement | null = null;
    let loaderUi: MountedUi | null = null;
    let batch: AbortController | null = null;

    const loaderView = () => (
      <BuildersLoader
        status={loader.status}
        done={loader.done}
        total={loader.total || entries.size}
        message={loader.message}
        onStart={() => void runBatch()}
        onCancel={() => batch?.abort()}
      />
    );

    const renderLoader = (): void => loaderUi?.render(loaderView());

    const stopLoader = (reason: EnrichBlock): void => {
      loader = { ...loader, status: 'stopped', message: enrichBlockMessage(reason) };
      batch?.abort();
      renderLoader();
    };

    async function runBatch(): Promise<void> {
      if (batch) return;
      const ids = [...new Set([...entries.values()].map((entry) => entry.id))];
      const control = new AbortController();
      const stop = AbortSignal.any([signal, control.signal]);
      batch = control;
      loader = { status: 'running', done: 0, total: ids.length, message: null };
      renderLoader();
      for (const id of ids) {
        const data = await enrichSubmission(id, stop);
        if (stop.aborted) break;
        if (data) setFacts(data);
        loader = { ...loader, done: loader.done + 1 };
        renderLoader();
      }
      batch = null;
      if (signal.aborted || loader.status === 'stopped') return;
      loader = {
        ...loader,
        status: control.signal.aborted ? 'cancelled' : 'done',
      };
      renderLoader();
    }

    const syncLoader = (section: Element): void => {
      if (!enrichable || loaderBar?.isConnected) return;
      const row = section.querySelector(SECTION_HEADING)?.parentElement?.parentElement;
      if (!row) {
        warn('round header row not found');
        return;
      }
      loaderUi?.remove();
      loaderBar?.remove();
      const bar = document.createElement('div');
      bar.setAttribute(OWN_ATTRIBUTE, LOADER_SLOT);
      row.after(bar);
      loaderBar = bar;
      loaderUi = null;
      mount({ name: 'cards-loader', anchor: bar, children: loaderView() }).then(
        (ui) => {
          if (!ui) return;
          if (signal.aborted || loaderBar !== bar) {
            ui.remove();
            return;
          }
          loaderUi = ui;
          ui.render(loaderView());
        },
        (error: unknown) => warn('mount loader', error),
      );
    };

    const sync = (): void => {
      const section = findReceivedSection(region);
      if (!section) return;
      const live = new Set<Element>();
      for (const { card, record } of mapRoundCards(section, records)) {
        live.add(card);
        if (!entries.has(card)) attach(card, record.id);
      }
      for (const entry of [...entries.values()]) if (!live.has(entry.card)) detach(entry);
      syncLoader(section);
    };

    sync();
    onMutation(sync);

    if (enrichable) {
      const offBlock = onEnrichBlock(stopLoader);
      signal.addEventListener('abort', offBlock, { once: true });
      readEnrichBlock().then(
        (reason) => {
          if (reason && !signal.aborted) stopLoader(reason);
        },
        (error: unknown) => warn('read enrichment state', error),
      );
    }

    if (wantsMeta && round) {
      store.send('listSubmissionsByRound', round).then(
        (list) => {
          if (signal.aborted) return;
          for (const { value } of list) {
            const data = toEnrichment(value);
            if (data.track || data.builderCount > 0 || data.awardedUsd) facts.set(data.id, data);
          }
          for (const entry of entries.values()) placeMeta(entry);
        },
        (error: unknown) => warn('read submissions', error),
      );
    }
    if (wantsReviews) {
      const settle = (): void => {
        if (signal.aborted) return;
        reviewsLoaded = true;
        for (const entry of entries.values()) renderCorner(entry);
      };
      store.send('listReviews', undefined).then(
        (list) => {
          for (const review of list) reviews.set(review.submissionId, review);
          settle();
        },
        (error: unknown) => {
          warn('read reviews', error);
          settle();
        },
      );
    }

    return () => {
      batch?.abort();
      loaderUi?.remove();
      loaderBar?.remove();
      for (const entry of [...entries.values()]) detach(entry);
      style.remove();
    };
  },
};
