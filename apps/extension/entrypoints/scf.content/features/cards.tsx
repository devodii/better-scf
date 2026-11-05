import type { ReactNode } from 'react';
import type { ReviewState, Submission } from 'shared';
import type { AvatarStackPerson } from '../../../components/AvatarStack';
import { CardCorner, type CardCornerProps } from '../../../components/CardCorner';
import { CardMeta, type CardMetaProps } from '../../../components/CardMeta';
import { formatBudget, trackLabel } from '../../../lib/export/format';
import type { Settings } from '../../../lib/settings';
import { findReceivedSection, mapRoundCards } from '../../../lib/site/round';
import { CARD_BYLINE_PREFIX, CARD_TEXT } from '../../../lib/site/selectors/round';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import cardsCss from '../styles/cards.scss?inline';

const COVER_IMAGE = 'img:not([data-bscf])';
const COVER_ATTRIBUTE = 'data-bscf-cover';
const META_SLOT = 'cards-meta-slot';
const CORNER_SLOT = 'cards-corner-slot';
const BACKDROP = 'cards-backdrop';
const HANDLE = /^[A-Za-z0-9_-]{1,39}$/;
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
  if (source === 'heuristic') {
    return 'Derived from the on-chain metric section of a submission you opened';
  }
  return null;
}

function peopleOf(submission: Submission): AvatarStackPerson[] {
  const people: AvatarStackPerson[] = [];
  for (const member of submission.team) {
    const github = member.github && HANDLE.test(member.github) ? member.github : null;
    const x = member.x && HANDLE.test(member.x) ? member.x : null;
    if (github) {
      people.push({
        name: member.name,
        role: member.role,
        src: `https://github.com/${github}.png?size=64`,
        href: `https://github.com/${github}`,
      });
    } else if (x) {
      people.push({
        name: member.name,
        role: member.role,
        src: `https://unavatar.io/x/${x}`,
        href: `https://x.com/${x}`,
      });
    }
  }
  return people;
}

function metaProps(submission: Submission | undefined, settings: Settings): CardMetaProps | null {
  if (!submission) return null;
  const props: CardMetaProps = {};
  const hint = trackHint(submission.trackSource);
  if (settings.trackChips && submission.track !== 'unknown' && hint) {
    props.track = {
      label: trackLabel(submission.track),
      variant: TRACK_VARIANT[submission.track],
      hint,
    };
  }
  const awarded = submission.totalAwardedUsd;
  if (settings.awardedChip && awarded !== null && awarded > 0) {
    const count = submission.awardedSubmissions;
    props.awarded = {
      label: `Awarded before · ${formatBudget(awarded)}`,
      variant: 'yellow',
      hint:
        count === null
          ? 'Total awarded to this project before'
          : `${count} awarded ${count === 1 ? 'submission' : 'submissions'}`,
    };
  }
  if (settings.avatarStack) {
    const people = peopleOf(submission);
    if (people.length > 0) props.people = people;
  }
  return props.track || props.awarded || props.people ? props : null;
}

function findFooter(card: Element): Element | null {
  for (const text of card.querySelectorAll(CARD_TEXT)) {
    if (text.textContent?.trimStart().startsWith(CARD_BYLINE_PREFIX)) return text.parentElement;
  }
  return null;
}

function afterLoad(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let frame = 0;
    const finish = (): void => {
      frame = requestAnimationFrame(() => resolve());
    };
    signal.addEventListener(
      'abort',
      () => {
        cancelAnimationFrame(frame);
        resolve();
      },
      { once: true },
    );
    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish, { once: true, signal });
  });
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
  async mount({ page, region, settings, store, signal, mount, onMutation, warn }) {
    if (page.kind !== 'round' || !page.records) return;
    const records = page.records;
    const wantsMeta = settings.trackChips || settings.awardedChip || settings.avatarStack;
    const wantsReviews = settings.readState || settings.shortlistAndStance;
    const wantsCorner = wantsReviews || settings.coverNormalization;
    const round = /#\s*(\d+)/.exec(page.roundName ?? '')?.[1];

    const submissions = new Map<string, Submission>();
    const reviews = new Map<string, ReviewState>();
    await Promise.all([
      wantsMeta && round
        ? store.send('listSubmissionsByRound', round).then(
            (list) => {
              for (const { value } of list) submissions.set(value.id, value);
            },
            (error: unknown) => warn('read submissions', error),
          )
        : undefined,
      wantsReviews
        ? store.send('listReviews', undefined).then(
            (list) => {
              for (const review of list) reviews.set(review.submissionId, review);
            },
            (error: unknown) => warn('read reviews', error),
          )
        : undefined,
    ]);
    await afterLoad(signal);
    if (signal.aborted) return;

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
      if (settings.readState) {
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
      if (part === 'corner') entry.corner = ui;
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

      const meta = metaProps(submissions.get(id), settings);
      if (meta) {
        const footer = findFooter(card);
        if (footer) void place(entry, footer, 'meta', <CardMeta {...meta} />);
        else warn('card footer not found');
      }
      if (wantsCorner && frame)
        void place(entry, frame, 'corner', <CardCorner {...cornerProps(entry)} />);
    };

    const detach = (entry: Entry): void => {
      entry.gone = true;
      for (const ui of entry.uis) ui.remove();
      for (const slot of entry.slots) slot.remove();
      entry.backdrop?.remove();
      if (entry.image) entry.image.style.objectFit = entry.objectFit;
      entry.cover?.removeAttribute(COVER_ATTRIBUTE);
      byId.get(entry.id)?.delete(entry);
      entries.delete(entry.card);
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
    };

    sync();
    onMutation(sync);

    return () => {
      for (const entry of [...entries.values()]) detach(entry);
      style.remove();
    };
  },
};
