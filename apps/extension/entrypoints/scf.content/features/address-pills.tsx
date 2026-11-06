import dayjs from "dayjs";
import type { HorizonSummary } from "shared";
import {
  AddressList,
  type AddressListItem,
} from "../../../components/AddressList";
import {
  type AddressKind,
  AddressPopover,
  type AddressPopoverPlacement,
} from "../../../components/AddressPopover";
import type {
  AddressSummaryRow,
  AddressSummaryState,
} from "../../../components/AddressSummary";
import type { SiteStore } from "../../../lib/site/store";
import { findSubmissionSections } from "../../../lib/site/submission";
import {
  isValidAccountId,
  isValidContractId,
} from "../../../lib/stellar/detect";
import { daysSince, fetchHorizonSummary } from "../../../lib/stellar/horizon";
import type { Feature } from "../../../lib/ui/feature";
import { OWN_ATTRIBUTE } from "../../../lib/ui/mount";
import pillsCss from "../styles/address-pills.scss?inline";

const EXPLORER = "https://stellar.expert/explorer/public";
const CANDIDATE = /(?<![A-Za-z0-9])[GC][A-Z2-7]{55}(?![A-Za-z0-9])/g;
const ADDRESS_LENGTH = 56;
const SKIP =
  "a,code,pre,kbd,samp,input,textarea,select,button,script,style,[contenteditable],[data-bscf]";
const POPOVER_ID = "bscf-address-popover";
const PREVIEW_DELAY_MS = 250;
const FLIP_BELOW_PX = 260;
const GAP_PX = 6;
const LOADING: AddressSummaryState = { status: "loading" };
const HIGHLIGHTS = {
  account: "bscf-account",
  contract: "bscf-contract",
  active: "bscf-address-active",
} as const;
const BODY_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
};
const CONTAINER_OPTIONS: MutationObserverInit = { childList: true };

interface Hit {
  address: string;
  kind: AddressKind;
  range: Range;
  element: Element;
}

interface Active {
  hit: Hit;
  source: "hover" | "focus";
  x: number;
  y: number;
  placement: AddressPopoverPlacement;
}

const kindOf = (address: string): AddressKind =>
  address.startsWith("G") ? "account" : "contract";

function rowsOf(summary: HorizonSummary): AddressSummaryRow[] {
  const rows: AddressSummaryRow[] = [];
  const created = summary.createdAt ? dayjs(summary.createdAt) : null;
  if (created?.isValid())
    rows.push({ label: "Created", value: created.format("MMM D, YYYY") });
  if (summary.lastModifiedLedger !== null) {
    rows.push({
      label: "Last modified ledger",
      value: summary.lastModifiedLedger.toLocaleString("en-US"),
    });
  }
  const balance =
    summary.xlmBalance === null ? Number.NaN : Number(summary.xlmBalance);
  if (Number.isFinite(balance)) {
    rows.push({
      label: "XLM balance",
      value: `${balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} XLM`,
    });
  }
  if (summary.trustlines !== null) {
    rows.push({ label: "Trustlines", value: String(summary.trustlines) });
  }
  const days = daysSince(summary.lastActiveAt, Date.now());
  if (days !== null) {
    rows.push({
      label: "Active",
      value:
        days === 0 ? "today" : `${days} ${days === 1 ? "day" : "days"} ago`,
    });
  }
  return rows;
}

async function loadSummary(
  store: SiteStore,
  address: string,
  warn: (scope: string, error?: unknown) => void,
): Promise<HorizonSummary | null> {
  const cached = await store.rpc.getHorizon(address).catch(() => null);
  if (cached && !cached.stale) return cached.value;
  const fresh = await fetchHorizonSummary(address, fetch);
  if (!fresh) return cached?.value ?? null;
  store.rpc
    .putHorizon(fresh)
    .catch((error: unknown) => warn("cache summary", error));
  return fresh;
}

function containerOf(region: Element, bodies: readonly Element[]): Element {
  let node: Element | null = bodies[0]?.parentElement ?? null;
  for (const body of bodies) {
    while (node && !node.contains(body)) node = node.parentElement;
  }
  return node ?? region;
}

function scan(bodies: readonly Element[]): Hit[] {
  const hits: Hit[] = [];
  for (const body of bodies) {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!(node instanceof Text) || node.data.length < ADDRESS_LENGTH)
        continue;
      const matches = [...node.data.matchAll(CANDIDATE)];
      if (matches.length === 0) continue;
      const element = node.parentElement;
      if (!element || element.closest(SKIP)) continue;
      for (const match of matches) {
        const address = match[0];
        const kind = kindOf(address);
        if (
          !(kind === "account"
            ? isValidAccountId(address)
            : isValidContractId(address))
        ) {
          continue;
        }
        const range = document.createRange();
        range.setStart(node, match.index);
        range.setEnd(node, match.index + ADDRESS_LENGTH);
        hits.push({ address, kind, range, element });
      }
    }
  }
  return hits;
}

function anchorOf(range: Range): Pick<Active, "x" | "y" | "placement"> | null {
  const rect = range.getClientRects()[0];
  if (!rect) return null;
  const below = window.innerHeight - rect.bottom;
  const placement =
    below < FLIP_BELOW_PX && rect.top > below ? "top" : "bottom";
  return {
    x: rect.left,
    y: placement === "top" ? rect.top - GAP_PX : rect.bottom + GAP_PX,
    placement,
  };
}

export const feature: Feature = {
  pages: ["submission"],
  toggles: ["addressPills"],
  async mount({ region, store, signal, mount, warn }) {
    const ui = await mount({
      anchor: containerOf(
        region,
        findSubmissionSections(region).map((section) => section.body),
      ),
      children: null,
    });
    if (!ui) return;

    const style = document.createElement("style");
    style.setAttribute(OWN_ATTRIBUTE, "address-pills");
    style.textContent = pillsCss;
    (document.head ?? document.documentElement).append(style);

    const states = new Map<string, AddressSummaryState>();
    let bodies: Element[] = [];
    let hits: Hit[] = [];
    let byElement = new Map<Element, Hit[]>();
    let items: AddressListItem[] = [];
    let signature = "";
    let active: Active | null = null;
    let hovered: Hit | null = null;
    let frame = 0;
    let trackFrame = 0;
    let previewTimer: ReturnType<typeof setTimeout> | undefined;

    const view = () => (
      <>
        <AddressList
          items={items}
          activeAddress={active?.hit.address ?? null}
          describedBy={POPOVER_ID}
          onActivate={handleFocus}
          onDeactivate={handleBlur}
        />
        {active && (
          <AddressPopover
            id={POPOVER_ID}
            address={active.hit.address}
            kind={active.hit.kind}
            summary={states.get(active.hit.address) ?? LOADING}
            x={active.x}
            y={active.y}
            placement={active.placement}
          />
        )}
      </>
    );

    const render = (): void => ui.render(view());

    const paintActive = (): void => {
      const address = active?.hit.address;
      const ranges = address
        ? hits.filter((hit) => hit.address === address).map((hit) => hit.range)
        : [];
      if (ranges.length === 0) {
        CSS.highlights.delete(HIGHLIGHTS.active);
        return;
      }
      const highlight = new Highlight(...ranges);
      highlight.priority = 1;
      CSS.highlights.set(HIGHLIGHTS.active, highlight);
    };

    const paint = (): void => {
      for (const kind of ["account", "contract"] as const) {
        const ranges = hits
          .filter((hit) => hit.kind === kind)
          .map((hit) => hit.range);
        CSS.highlights.set(HIGHLIGHTS[kind], new Highlight(...ranges));
      }
      paintActive();
    };

    const preview = (address: string): void => {
      const current = states.get(address)?.status;
      if (current === "loading" || current === "success") return;
      setState(address, { status: "loading" });
      loadSummary(store, address, warn).then(
        (summary) => {
          if (signal.aborted) return;
          const rows = summary ? rowsOf(summary) : [];
          setState(
            address,
            rows.length > 0
              ? { status: "success", rows }
              : { status: "unavailable" },
          );
        },
        (error: unknown) => {
          warn("load summary", error);
          if (!signal.aborted) setState(address, { status: "unavailable" });
        },
      );
    };

    function setState(address: string, state: AddressSummaryState): void {
      states.set(address, state);
      if (active?.hit.address === address) render();
    }

    function open(hit: Hit, source: Active["source"]): void {
      const place = anchorOf(hit.range);
      if (!place) return;
      active = { hit, source, ...place };
      paintActive();
      clearTimeout(previewTimer);
      if (hit.kind === "account") {
        previewTimer = setTimeout(() => preview(hit.address), PREVIEW_DELAY_MS);
      }
      render();
    }

    function close(): void {
      if (!active) return;
      active = null;
      clearTimeout(previewTimer);
      paintActive();
      render();
    }

    function handleFocus(address: string): void {
      const hit = hits.find((candidate) => candidate.address === address);
      if (!hit) return;
      hit.element.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
      open(hit, "focus");
    }

    function handleBlur(): void {
      if (active?.source === "focus") close();
    }

    const hitAt = (event: MouseEvent): Hit | null => {
      if (!(event.target instanceof Element)) return null;
      const candidates = byElement.get(event.target);
      if (!candidates) return null;
      for (const hit of candidates) {
        for (const rect of hit.range.getClientRects()) {
          if (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          ) {
            return hit;
          }
        }
      }
      return null;
    };

    const handleMove = (event: PointerEvent): void => {
      if (event.pointerType === "touch") return;
      const hit = hitAt(event);
      if (hit === hovered) return;
      hovered = hit;
      if (hit) open(hit, "hover");
      else if (active?.source === "hover") close();
    };

    const handleLeave = (): void => {
      hovered = null;
      if (active?.source === "hover") close();
    };

    const handleClick = (event: MouseEvent): void => {
      if (event.button !== 0 || !window.getSelection()?.isCollapsed) return;
      const hit = hitAt(event);
      if (hit)
        window.open(
          `${EXPLORER}/${hit.kind}/${hit.address}`,
          "_blank",
          "noopener,noreferrer",
        );
    };

    const handleKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") close();
    };

    const track = (): void => {
      if (!active || trackFrame) return;
      trackFrame = requestAnimationFrame(() => {
        trackFrame = 0;
        if (!active) return;
        const place = anchorOf(active.hit.range);
        if (!place) {
          close();
          return;
        }
        active = { ...active, ...place };
        render();
      });
    };

    const observer = new MutationObserver(() => {
      if (!frame) frame = requestAnimationFrame(rebuild);
    });

    function rebuild(): void {
      frame = 0;
      const sections = findSubmissionSections(region);
      if (sections.length === 0) warn("section body not found");
      bodies = sections.map((section) => section.body);
      hits = scan(bodies);
      byElement = new Map();
      const seen = new Set<string>();
      const next: AddressListItem[] = [];
      for (const hit of hits) {
        const list = byElement.get(hit.element);
        if (list) list.push(hit);
        else byElement.set(hit.element, [hit]);
        if (seen.has(hit.address)) continue;
        seen.add(hit.address);
        next.push({
          address: hit.address,
          kind: hit.kind,
          href: `${EXPLORER}/${hit.kind}/${hit.address}`,
        });
      }
      hovered = null;
      if (active) {
        const address = active.hit.address;
        const current = hits.find((hit) => hit.address === address);
        const place = current ? anchorOf(current.range) : null;
        active =
          current && place ? { ...active, hit: current, ...place } : null;
      }
      paint();
      observer.disconnect();
      observer.observe(containerOf(region, bodies), CONTAINER_OPTIONS);
      for (const body of bodies) observer.observe(body, BODY_OPTIONS);
      const nextSignature = next.map((item) => item.address).join();
      if (nextSignature !== signature || active) {
        signature = nextSignature;
        items = next;
        render();
      }
    }

    const delegate =
      region instanceof HTMLElement ? region : document.documentElement;
    delegate.addEventListener("pointermove", handleMove, {
      passive: true,
      signal,
    });
    delegate.addEventListener("pointerleave", handleLeave, { signal });
    delegate.addEventListener("click", handleClick, { signal });
    document.addEventListener("keydown", handleKey, { signal });
    window.addEventListener("scroll", track, {
      capture: true,
      passive: true,
      signal,
    });
    window.addEventListener("resize", track, { passive: true, signal });

    rebuild();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      cancelAnimationFrame(trackFrame);
      clearTimeout(previewTimer);
      for (const name of Object.values(HIGHLIGHTS)) CSS.highlights.delete(name);
      ui.remove();
      style.remove();
    };
  },
};
