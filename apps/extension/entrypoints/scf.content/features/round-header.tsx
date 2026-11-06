import dayjs from "dayjs";
import {
  type RoundCountdown,
  RoundHeader,
} from "../../../components/RoundHeader";
import type { RoundHeaderTrackCounts } from "../../../components/RoundHeaderTracks";
import {
  findFirstSubmissionSection,
  findPhaseTable,
  type RoundPhase,
  readRoundPhases,
  readSiteSubmissionCount,
} from "../../../lib/site/round";
import { onFacts, readFacts } from "../../../lib/site/round-facts";
import type { Feature } from "../../../lib/ui/feature";
import { type MountedUi, OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import headerCss from "../styles/round-header.scss?inline";

const BAR = "data-bscf-round-header-bar";

function when(at: number, now: dayjs.Dayjs): string {
  const days = dayjs(at).startOf("day").diff(now.startOf("day"), "day");
  if (days <= 0) return "today";
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function countdownOf(
  phases: readonly RoundPhase[],
  now: dayjs.Dayjs,
): RoundCountdown | null {
  const time = now.valueOf();
  let next: { name: string; start: number } | null = null;
  for (const { name, startsAt, endsAt } of phases) {
    if (startsAt === null || endsAt === null) continue;
    if (startsAt <= time && time <= endsAt) {
      return { phase: name, verb: "ends", when: when(endsAt, now) };
    }
    if (startsAt > time && (!next || startsAt < next.start))
      next = { name, start: startsAt };
  }
  return next
    ? { phase: next.name, verb: "starts", when: when(next.start, now) }
    : null;
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
  pages: ["round"],
  toggles: ["roundHeader"],
  mount(context) {
    const { page, region, onMutation, warn } = context;
    if (page.kind !== "round" || !page.records) {
      warn("round records not found");
      return;
    }
    const records = page.records;
    const ids = new Set(records.map((record) => record.id));
    const budgets = records
      .flatMap((record) => (record.budget === null ? [] : [record.budget]))
      .toSorted((a, b) => a - b);

    const siteTotal = readSiteSubmissionCount(
      page.roundName ?? records[0]?.roundName ?? null,
    );
    let tracks: RoundHeaderTrackCounts | null = null;
    let countdown: RoundCountdown | null = null;
    let table: Element | null = null;
    let bar: HTMLElement | null = null;
    let ui: MountedUi | null = null;
    let closed = false;

    const view = () => (
      <RoundHeader
        countdown={countdown}
        submissions={records.length}
        siteTotal={siteTotal}
        parsed={budgets.length}
        totalRequested={
          budgets.length > 0
            ? budgets.reduce((sum, value) => sum + value, 0)
            : null
        }
        medianRequested={median(budgets)}
        tracks={tracks}
      />
    );

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "round-header");
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
      const anchor = found
        ? (found.parentElement?.parentElement ?? found)
        : findFirstSubmissionSection(region);
      if (!anchor) {
        warn("round header anchor not found");
        return;
      }
      const mine = document.createElement("div");
      mine.setAttribute(OWN_ATTRIBUTE, "round-header-bar");
      mine.setAttribute(BAR, "");
      if (found) anchor.after(mine);
      else anchor.before(mine);
      table = found ?? anchor;
      bar = mine;
      countdown = countdownOf(readRoundPhases(region), dayjs());
      context
        .mount({ anchor: mine, append: "last", children: view() })
        .then((handle) => {
          if (!handle) return;
          if (closed || bar !== mine) {
            handle.remove();
            return;
          }
          ui = handle;
          handle.render(view());
        })
        .catch((error: unknown) => warn("mount", error));
    };

    const loadTracks = (): void => {
      if (closed) return;
      const counts: RoundHeaderTrackCounts = {
        integration: 0,
        open: 0,
        rfp: 0,
      };
      for (const [id, data] of readFacts()) {
        if (data.track && ids.has(id)) counts[data.track] += 1;
      }
      tracks = counts;
      ui?.render(view());
    };

    onMutation(sync);
    const offFacts = onFacts(loadTracks);
    sync();
    loadTracks();

    return () => {
      closed = true;
      offFacts();
      teardown();
      style.remove();
    };
  },
};
