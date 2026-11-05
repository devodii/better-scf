import dayjs from 'dayjs';
import { RoundHeader } from '../../../components/RoundHeader';
import type { RoundHeaderTrackCounts } from '../../../components/RoundHeaderTracks';
import { type RoundPhase, readRoundPhases } from '../../../lib/site/round';
import {
  PHASE_HEADER_CELL,
  PHASE_HEADER_TEXTS,
  PHASE_TABLE,
} from '../../../lib/site/selectors/round';
import type { Feature } from '../../../lib/ui/feature';
import { type MountedUi, OWN_ATTRIBUTE } from '../../../lib/ui/mount';
import headerCss from '../styles/round-header.scss?inline';

const BAR = 'data-bscf-round-header-bar';
const ROUND_NUMBER = /#\s*(\d+)/;

function findPhaseTable(region: Element): Element | null {
  for (const table of region.querySelectorAll(PHASE_TABLE)) {
    const headers = Array.from(table.querySelectorAll(PHASE_HEADER_CELL), (th) =>
      (th.textContent ?? '').trim().toLowerCase(),
    );
    if (PHASE_HEADER_TEXTS.every((text) => headers.includes(text))) return table;
  }
  return null;
}

function when(verb: string, at: number, now: dayjs.Dayjs): string {
  const days = dayjs(at).startOf('day').diff(now.startOf('day'), 'day');
  if (days <= 0) return `${verb} today`;
  return `${verb} in ${days} ${days === 1 ? 'day' : 'days'}`;
}

function countdownText(phases: readonly RoundPhase[], now: dayjs.Dayjs): string | null {
  const time = now.valueOf();
  let next: { name: string; start: number } | null = null;
  for (const { name, startsAt, endsAt } of phases) {
    if (startsAt === null || endsAt === null) continue;
    if (startsAt <= time && time <= endsAt) return `${name} ${when('ends', endsAt, now)}`;
    if (startsAt > time && (!next || startsAt < next.start)) next = { name, start: startsAt };
  }
  return next ? `${next.name} ${when('starts', next.start, now)}` : null;
}

function median(sorted: readonly number[]): number | null {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length === 0) return null;
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const low = sorted[mid - 1];
  const high = sorted[mid];
  return low === undefined || high === undefined ? null : (low + high) / 2;
}

export const feature: Feature = {
  pages: ['round'],
  toggles: ['roundHeader'],
  mount(context) {
    const { page, region, store, signal, onMutation, warn } = context;
    if (page.kind !== 'round' || !page.records) {
      warn('round records not found');
      return;
    }
    const records = page.records;
    const roundNumber =
      ROUND_NUMBER.exec(page.roundName ?? records[0]?.roundName ?? '')?.[1] ?? null;
    const ids = new Set(records.map((record) => record.id));
    const budgets = records
      .flatMap((record) => (record.budget === null ? [] : [record.budget]))
      .toSorted((a, b) => a - b);

    let tracks: RoundHeaderTrackCounts | null = null;
    let countdown: string | null = null;
    let table: Element | null = null;
    let bar: HTMLElement | null = null;
    let ui: MountedUi | null = null;
    let closed = false;

    const view = () => (
      <RoundHeader
        countdown={countdown}
        submissions={records.length}
        parsed={budgets.length}
        totalRequested={budgets.length > 0 ? budgets.reduce((sum, value) => sum + value, 0) : null}
        medianRequested={median(budgets)}
        tracks={tracks}
      />
    );

    const style = document.createElement('style');
    style.setAttribute(OWN_ATTRIBUTE, 'round-header');
    style.textContent = headerCss;
    (document.head ?? document.documentElement).append(style);

    const teardown = (): void => {
      ui?.remove();
      bar?.remove();
      ui = null;
      bar = null;
      table = null;
    };

    const sync = (): void => {
      if (bar?.isConnected && table?.isConnected) return;
      teardown();
      const found = findPhaseTable(region);
      if (!found) {
        warn('phase table not found');
        return;
      }
      const mine = document.createElement('div');
      mine.setAttribute(OWN_ATTRIBUTE, 'round-header-bar');
      mine.setAttribute(BAR, '');
      (found.parentElement?.parentElement ?? found).after(mine);
      table = found;
      bar = mine;
      countdown = countdownText(readRoundPhases(region), dayjs());
      context
        .mount({ anchor: mine, append: 'last', children: view() })
        .then((handle) => {
          if (!handle) return;
          if (closed || bar !== mine) {
            handle.remove();
            return;
          }
          ui = handle;
          handle.render(view());
        })
        .catch((error: unknown) => warn('mount', error));
    };

    const loadTracks = async (): Promise<void> => {
      if (!roundNumber) return;
      try {
        const cached = await store.send('listSubmissionsByRound', roundNumber);
        if (closed) return;
        const counts: RoundHeaderTrackCounts = { integration: 0, open: 0, rfp: 0 };
        for (const { value } of cached) {
          const { track } = value;
          if (track !== 'unknown' && ids.has(value.id)) counts[track] += 1;
        }
        tracks = counts;
        ui?.render(view());
      } catch (error) {
        warn('load tracks', error);
      }
    };

    onMutation(sync);
    window.addEventListener('focus', () => void loadTracks(), { signal });
    sync();
    void loadTracks();

    return () => {
      closed = true;
      teardown();
      style.remove();
    };
  },
};
