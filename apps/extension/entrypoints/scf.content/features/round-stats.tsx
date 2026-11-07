import { RoundStatTags } from "../../../components/RoundStatTags";
import { readInlineScripts } from "../../../lib/site/round";
import { fetchRoundList } from "../../../lib/site/round-fetch";
import {
  mapRoundCards,
  parseRoundsPayload,
  type RoundRecord,
} from "../../../lib/site/rounds";
import {
  ROUND_CARD_NAME,
  ROUND_CARD_NAME_PATTERN,
} from "../../../lib/site/selectors/rounds";
import type { Feature } from "../../../lib/ui/feature";
import { type MountedUi, OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import statsCss from "../styles/round-stats.scss?inline";

const MARK = "data-bscf-round-stats";
const COMPLETED_PHASE = "ended";

interface Tags {
  box: HTMLElement;
  ui: MountedUi | null;
}

function findBody(card: Element): Element | null {
  for (const node of card.querySelectorAll(ROUND_CARD_NAME)) {
    if (node.childElementCount > 0) continue;
    if (ROUND_CARD_NAME_PATTERN.test(node.textContent?.trim() ?? ""))
      return node.parentElement;
  }
  return null;
}

function hasAwards(record: RoundRecord): boolean {
  const stats = record.stats;
  return (
    record.phase.trim().toLowerCase() === COMPLETED_PHASE &&
    stats !== null &&
    (stats.awardedSubmissions > 0 || stats.totalAwardedUSD > 0)
  );
}

export const feature: Feature = {
  pages: ["roundList"],
  mount(context) {
    const { region, warn } = context;
    const tags = new Map<Element, Tags>();
    let records: readonly RoundRecord[] = [];
    let ready = false;
    let closed = false;
    let frame = 0;

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "round-stats");
    style.textContent = statsCss;
    (document.head ?? document.documentElement).append(style);

    const drop = (card: Element): void => {
      const entry = tags.get(card);
      if (!entry) return;
      entry.ui?.remove();
      entry.box.remove();
      tags.delete(card);
    };

    const attach = (card: Element, record: RoundRecord): void => {
      const body = findBody(card);
      if (!body) {
        warn("round card name not found");
        return;
      }
      const box = document.createElement("div");
      box.setAttribute(OWN_ATTRIBUTE, "round-stats-row");
      box.setAttribute(MARK, "");
      body.append(box);
      const entry: Tags = { box, ui: null };
      tags.set(card, entry);
      const stats = record.stats;
      context
        .mount({
          anchor: box,
          append: "last",
          children: (
            <RoundStatTags
              awarded={stats?.awardedSubmissions}
              awardedUsd={stats?.totalAwardedUSD}
              paidUsd={stats?.totalPaidUSD}
            />
          ),
        })
        .then((handle) => {
          if (!handle) return;
          if (closed || tags.get(card) !== entry) {
            handle.remove();
            return;
          }
          entry.ui = handle;
        })
        .catch((error: unknown) => warn("mount", error));
    };

    const sync = (): void => {
      if (!ready || closed) return;
      for (const [card, entry] of tags) {
        if (!card.isConnected || !entry.box.isConnected) drop(card);
      }
      for (const { card, record } of mapRoundCards(region, records)) {
        if (!tags.has(card) && hasAwards(record)) attach(card, record);
      }
    };

    const begin = (): void => {
      frame = requestAnimationFrame(() => {
        frame = 0;
        const finish = (found: readonly RoundRecord[]): void => {
          if (closed) return;
          records = found;
          if (records.length === 0) warn("round records not found");
          ready = true;
          sync();
        };
        const inline = parseRoundsPayload(readInlineScripts(document));
        if (inline.length > 0) finish(inline);
        else void fetchRoundList().then(finish);
      });
    };

    const handleState = (): void => {
      if (document.readyState === "loading") return;
      document.removeEventListener("readystatechange", handleState);
      begin();
    };

    context.onMutation(sync);
    if (document.readyState !== "loading") begin();
    else document.addEventListener("readystatechange", handleState);

    return () => {
      closed = true;
      document.removeEventListener("readystatechange", handleState);
      if (frame !== 0) cancelAnimationFrame(frame);
      for (const card of [...tags.keys()]) drop(card);
      style.remove();
    };
  },
};
